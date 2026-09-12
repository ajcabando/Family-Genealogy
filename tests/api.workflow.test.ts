import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = process.env.APP_URL || 'http://localhost:3844';
const ADMIN = { email: 'admin@family.local', password: 'FamilyAdmin123!' };

async function reachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(3000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

// Tiny cookie jar
function makeClient() {
  let cookie = '';
  return {
    async request(path: string, init: RequestInit = {}): Promise<{ status: number; json: () => Promise<unknown> }> {
      const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
      const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
          ...(init.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(init.headers || {}),
        },
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: res.status, json: () => res.json() };
    },
  };
}

const live = await reachable();

describe.skipIf(!live)('API workflow (requires running app)', () => {
  const admin = makeClient();
  const suffix = Date.now().toString(36);
  const memberEmail = `test-${suffix}@example.com`;
  const memberName = `Vitest${suffix.slice(-4)}`; // unique first name used across the flow
  let memberId = '';
  let uploadedPhotoId = '';

  beforeAll(async () => {
    const r = await admin.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(ADMIN),
    });
    expect(r.status).toBe(200);

    // Register a fresh member account (pending)
    const reg = await admin.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ firstName: memberName, lastName: 'Tester', email: memberEmail, password: 'TestPass123!' }),
    });
    expect(reg.status).toBe(200);

    // Admin approves the account
    const usersRes = await admin.request('/api/admin/users');
    const users = (await usersRes.json()) as { users: Array<{ id: string; email: string }> };
    const newUser = users.users.find((u) => u.email === memberEmail);
    expect(newUser).toBeDefined();
    const approve = await admin.request(`/api/admin/users/${newUser!.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    expect(approve.status).toBe(200);
  });

  it('lets a fresh member log in after approval', async () => {
    const member = makeClient();
    const r = await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });
    expect(r.status).toBe(200);
  });

  it('rejects member access to admin APIs', async () => {
    const member = makeClient();
    await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });
    const r = await member.request('/api/admin/users');
    expect(r.status).toBe(403);
  });

  it('runs a full approval workflow: submit NEW_MEMBER -> admin approve -> member appears', async () => {
    const member = makeClient();
    await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });

    const submit = await member.request('/api/change-requests', {
      method: 'POST',
      body: JSON.stringify({
        requestType: 'NEW_MEMBER',
        targetType: 'new_member',
        proposedData: { firstName: memberName, lastName: 'Tester', gender: 'UNKNOWN' },
        reason: 'Integration test: adding a new member',
      }),
    });
    const { id: requestId } = (await submit.json()) as { id: string };
    expect(submit.status).toBe(200);

    // Members cannot review their own requests
    const selfReview = await member.request(`/api/change-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    expect(selfReview.status).toBe(403);

    // Admin approves
    const approve = await admin.request(`/api/change-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve', notes: 'ok' }),
    });
    expect(approve.status).toBe(200);

    const search = await admin.request(`/api/search?q=${memberName}`);
    const { results } = (await search.json()) as { results: Array<{ id: string; firstName: string }> };
    const found = results.find((r) => r.firstName === memberName);
    expect(found).toBeDefined();
    memberId = found!.id;
  });

  it('applies a RELATIONSHIP request and blocks duplicates', async () => {
    const member = makeClient();
    await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });
    const search = await admin.request(`/api/search?q=Juan+Cruz`);
    const { results } = (await search.json()) as { results: Array<{ id: string }> };
    const juanId = results[0].id;
    expect(juanId).toBeTruthy();

    const submit = await member.request('/api/change-requests', {
      method: 'POST',
      body: JSON.stringify({
        requestType: 'RELATIONSHIP',
        targetType: 'relationship',
        proposedData: { personAId: juanId, personBId: memberId, type: 'PARENT' },
        reason: 'Integration test: parent-child link',
      }),
    });
    const { id: requestId } = (await submit.json()) as { id: string };
    expect(submit.status).toBe(200);

    const approve = await admin.request(`/api/change-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    expect(approve.status).toBe(200);

    // Duplicate parent-child is rejected by integrity validation
    const dup = await admin.request(`/api/members/${juanId}/relationships`, {
      method: 'POST',
      body: JSON.stringify({ type: 'PARENT', otherId: memberId }),
    });
    expect(dup.status).toBe(400);
  });

  it('rejects impossible relationships (self-parent, circular)', async () => {
    const self = await admin.request(`/api/members/${memberId}/relationships`, {
      method: 'POST',
      body: JSON.stringify({ type: 'PARENT', otherId: memberId }),
    });
    expect(self.status).toBe(400);

    // Circular: make the new member a parent of Juan (Juan is already the parent)
    const circle = await admin.request(`/api/members/${memberId}/relationships`, {
      method: 'POST',
      body: JSON.stringify({ type: 'PARENT', otherId: (await (await admin.request('/api/search?q=Juan+Cruz')).json() as { results: Array<{ id: string }> }).results[0].id }),
    });
    expect(circle.status).toBe(400);
  });

  it('processes a photo through the pending -> approved flow', async () => {
    const member = makeClient();
    await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });

    // A tiny valid 1x1 PNG embedded as base64 (file serving requires auth, so
    // we can't just fetch an existing image without a cookie).
    const img = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const fd = new FormData();
    fd.append('file', new Blob([img], { type: 'image/png' }), 'test.png');
    fd.append('caption', 'integration test photo');
    const upload = await member.request('/api/photos', { method: 'POST', body: fd });
    const uploadJson = (await upload.json()) as { photos: Array<{ id: string }>; approvalStatus: string };
    expect(upload.status).toBe(200);
    expect(uploadJson.approvalStatus).toBe('PENDING');
    uploadedPhotoId = uploadJson.photos[0].id;

    const approve = await admin.request(`/api/photos/${uploadedPhotoId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    expect(approve.status).toBe(200);

    const pending = (await (await admin.request('/api/photos?scope=pending')).json()) as { photos: Array<{ id: string }> };
    expect(pending.photos.some((p) => p.id === uploadedPhotoId)).toBe(false);
  });

  it('prevents members from changing other people\'s profile photos', async () => {
    const member = makeClient();
    await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });
    const search = await admin.request(`/api/search?q=Juan+Cruz`);
    const { results } = (await search.json()) as { results: Array<{ id: string }> };
    const photoId = ((await (await admin.request('/api/photos?limit=1')).json()) as { photos: Array<{ id: string }> }).photos[0].id;
    const r = await member.request(`/api/members/${results[0].id}/profile-photo`, {
      method: 'POST',
      body: JSON.stringify({ photoId }),
    });
    expect(r.status).toBe(403);
  });

  it('pins and unpins an album cover, enforcing admin-only access', async () => {
    // Fresh reunion + album for this test (cleaned up at the end)
    const evRes = await admin.request('/api/reunions', {
      method: 'POST',
      body: JSON.stringify({ name: `Cover Test ${suffix}`, date: '2026-12-01', location: 'Testville' }),
    });
    const { id: eventId } = (await evRes.json()) as { id: string };
    expect(evRes.status).toBe(200);

    const albumRes = await admin.request(`/api/reunions/${eventId}/albums`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Cover Test Album' }),
    });
    const { id: albumId } = (await albumRes.json()) as { id: string };
    expect(albumRes.status).toBe(200);

    // Upload a photo straight into the album, then approve it
    const img = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const fd = new FormData();
    fd.append('file', new Blob([img], { type: 'image/png' }), 'cover.png');
    fd.append('caption', 'cover test photo');
    fd.append('albumId', albumId);
    const upload = await admin.request('/api/photos', { method: 'POST', body: fd });
    const uploadJson = (await upload.json()) as { photos: Array<{ id: string }> };
    expect(upload.status).toBe(200);
    const photoId = uploadJson.photos[0].id;
    const approve = await admin.request(`/api/photos/${photoId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    expect(approve.status).toBe(200);

    // Anonymous users cannot pin
    const anon = await fetch(`${BASE}/api/reunions/albums/${albumId}/cover`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId }),
    });
    expect(anon.status).toBe(401);

    // Members cannot pin
    const member = makeClient();
    await member.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: memberEmail, password: 'TestPass123!' }),
    });
    const memberPin = await member.request(`/api/reunions/albums/${albumId}/cover`, {
      method: 'PUT',
      body: JSON.stringify({ photoId }),
    });
    expect(memberPin.status).toBe(403);

    // Pinning a photo that is not in the album is rejected
    const badPin = await admin.request(`/api/reunions/albums/${albumId}/cover`, {
      method: 'PUT',
      body: JSON.stringify({ photoId: 'not-in-album' }),
    });
    expect(badPin.status).toBe(400);

    // Admin pins the cover and it sticks
    const pin = await admin.request(`/api/reunions/albums/${albumId}/cover`, {
      method: 'PUT',
      body: JSON.stringify({ photoId }),
    });
    expect(pin.status).toBe(200);
    const albumInfo = (await (await admin.request(`/api/reunions/albums/${albumId}`)).json()) as { coverPhotoId: string | null };
    expect(albumInfo.coverPhotoId).toBe(photoId);

    // Unpinning clears it
    const unpin = await admin.request(`/api/reunions/albums/${albumId}/cover`, {
      method: 'PUT',
      body: JSON.stringify({ photoId: null }),
    });
    expect(unpin.status).toBe(200);
    const albumInfo2 = (await (await admin.request(`/api/reunions/albums/${albumId}`)).json()) as { coverPhotoId: string | null };
    expect(albumInfo2.coverPhotoId).toBeNull();

    // Cleanup: deleting the event cascades the album; photo is soft-deleted
    await admin.request(`/api/reunions/${eventId}`, { method: 'DELETE' });
    await admin.request(`/api/photos/${photoId}`, { method: 'DELETE' });
  });

  afterAll(async () => {
    // Cleanup: soft-delete the test member and any uploaded photo, disable the test user
    if (memberId) await admin.request(`/api/members/${memberId}`, { method: 'DELETE' });
    if (uploadedPhotoId) await admin.request(`/api/photos/${uploadedPhotoId}`, { method: 'DELETE' });
    const usersRes = await admin.request('/api/admin/users');
    const users = (await usersRes.json()) as { users: Array<{ id: string; email: string }> };
    const testUser = users.users.find((u) => u.email === memberEmail);
    if (testUser) await admin.request(`/api/admin/users/${testUser.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DISABLED' }) });
  });
});