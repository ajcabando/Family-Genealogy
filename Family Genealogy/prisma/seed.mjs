import { PrismaClient, Role, UserStatus, RelationshipType, PhotoStatus, ChangeRequestType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { avatarSvg, sceneSvg, groupPhotoSvg } from './sample-images.mjs';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');

// ---------------------------------------------------------------------------
// Image generation (SVG → sharp). Simple shapes + text; no external assets.
// Generators live in ./sample-images.mjs (shared with the reunion filler).
// ---------------------------------------------------------------------------

async function saveImage(svg, target) {
  const id = randomUUID();
  const dirs = {
    originals: path.join(UPLOAD_DIR, 'originals'),
    optimized: path.join(UPLOAD_DIR, 'optimized'),
    thumbs: path.join(UPLOAD_DIR, 'thumbs'),
  };
  Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));

  const originalPath = `originals/${id}.jpg`;
  const optimizedPath = `optimized/${id}.webp`;
  const thumbPath = `thumbs/${id}.webp`;

  const base = sharp(Buffer.from(svg), { density: 144 });
  const meta = await base.clone().jpeg({ quality: 88 }).toFile(path.join(UPLOAD_DIR, originalPath));
  await base.clone().resize(target?.optimizedW ?? 1200, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(UPLOAD_DIR, optimizedPath));
  await base.clone().resize(360, 360, { fit: 'cover' }).webp({ quality: 72 }).toFile(path.join(UPLOAD_DIR, thumbPath));

  return {
    filePath: originalPath,
    optimizedPath,
    thumbPath,
    width: meta.width,
    height: meta.height,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureSettings() {
  const defaults = {
    familyName: 'Cruz',
    photoApprovalRequired: 'true',
    contributionApprovalRequired: 'true',
    allowRegistration: 'true',
    showLivingBirthYearOnly: 'true',
    allowPhotoDownload: 'true',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
}

function dt(y, m, d) {
  return new Date(y, m - 1, d);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureSettings();

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('ℹ  Users already exist — skipping demo data creation (admin/seed untouched).');
    return;
  }

  const adminEmail = process.env.FAMILY_ADMIN_EMAIL || 'admin@family.local';
  const adminPassword = process.env.FAMILY_ADMIN_PASSWORD || 'FamilyAdmin123!';

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✓ Created administrator account: ${adminEmail}`);

  const createMember = async (data) =>
    prisma.familyMember.create({
      data: { ...data, createdById: admin.id, gender: data.gender || 'UNKNOWN' },
    });

  // --- Generation 1 ---
  const juan = await createMember({
    firstName: 'Juan', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Cebu',
    birthDate: dt(1945, 3, 12), birthPlace: 'Manila', deathDate: dt(2020, 8, 4), deathPlace: 'Cebu City',
    occupation: 'School Principal', biography:
      'Juan was the eldest of the Cruz siblings. A dedicated educator who founded the family\u2019s annual reunions. His devotion to keeping the family connected inspired the archive we maintain today.',
  });
  const tomas = await createMember({
    firstName: 'Tomas', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Manila',
    birthDate: dt(1948, 6, 21), occupation: 'Engineer',
  });
  const maria = await createMember({
    firstName: 'Maria', lastName: 'Cruz', maidenName: 'Santos', gender: 'FEMALE', branch: 'Santos',
    birthDate: dt(1948, 11, 2), birthPlace: 'Cebu City', location: 'Cebu City',
    occupation: 'Retired Nurse', biography: 'Matriarch of the Cebu branch. Known for her famous adobo and her meticulous family records.',
  });

  // --- Generation 2 ---
  const pedro = await createMember({
    firstName: 'Pedro', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Cebu',
    birthDate: dt(1967, 1, 15), birthPlace: 'Cebu City', location: 'Cebu City', occupation: 'Businessman',
  });
  const ana = await createMember({
    firstName: 'Ana', lastName: 'Cruz', gender: 'FEMALE', branch: 'Cruz – Cebu',
    birthDate: dt(1970, 4, 22), birthPlace: 'Cebu City', location: 'Manila', occupation: 'Architect',
  });
  const miguel = await createMember({
    firstName: 'Miguel', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Cebu',
    birthDate: dt(1973, 9, 9), birthPlace: 'Cebu City', location: 'Davao', occupation: 'Marine Biologist',
  });
  const liza = await createMember({
    firstName: 'Liza', lastName: 'Cruz', maidenName: 'Fernandez', gender: 'FEMALE', branch: 'Fernandez',
    birthDate: dt(1969, 7, 19), location: 'Cebu City', occupation: 'Teacher',
  });
  const marco = await createMember({
    firstName: 'Marco', lastName: 'Reyes', gender: 'MALE', branch: 'Reyes',
    birthDate: dt(1968, 5, 14), location: 'Manila',
  });
  const carlos = await createMember({
    firstName: 'Carlos', lastName: 'Mendoza', gender: 'MALE', branch: 'Mendoza',
    birthDate: dt(1970, 2, 2), location: 'Manila', occupation: 'Surgeon',
  });
  const nina = await createMember({
    firstName: 'Nina', lastName: 'Cruz', maidenName: 'Tan', gender: 'FEMALE', branch: 'Tan',
    birthDate: dt(1975, 1, 25), location: 'Davao',
  });
  const rosa = await createMember({
    firstName: 'Rosa', lastName: 'Cruz', maidenName: 'Lim', gender: 'FEMALE', branch: 'Lim',
    birthDate: dt(1950, 3, 3), location: 'Manila',
  });
  const ramon = await createMember({
    firstName: 'Ramon', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Manila',
    birthDate: dt(1975, 10, 1), location: 'Manila', occupation: 'Accountant',
  });
  const lydia = await createMember({
    firstName: 'Lydia', lastName: 'Cruz', gender: 'FEMALE', branch: 'Cruz – Manila',
    birthDate: dt(1978, 12, 12), location: 'USA', occupation: 'Nurse',
  });

  // --- Generation 3 ---
  const juanJr = await createMember({
    firstName: 'Juan', middleName: 'Santos', lastName: 'Cruz', nickname: 'Jun-Jun', gender: 'MALE', branch: 'Cruz – Cebu',
    birthDate: dt(1992, 12, 1), birthPlace: 'Cebu City', location: 'USA', occupation: 'Software Engineer',
  });
  const sofia = await createMember({
    firstName: 'Sofia', lastName: 'Cruz', gender: 'FEMALE', branch: 'Cruz – Cebu',
    birthDate: dt(1995, 6, 30), location: 'Cebu City', occupation: 'Graphic Designer',
  });
  const alain = await createMember({
    firstName: 'Alain', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Cebu',
    birthDate: dt(1988, 5, 20), location: 'Cebu City', occupation: 'Photographer', biography:
      'Alain keeps the family archive alive, photographing every reunion and digitizing old albums.',
  });
  const diego = await createMember({
    firstName: 'Diego', lastName: 'Reyes', gender: 'MALE', branch: 'Reyes',
    birthDate: dt(1993, 3, 3), location: 'Manila', occupation: 'Chef',
  });
  const carla = await createMember({
    firstName: 'Carla', lastName: 'Reyes', gender: 'FEMALE', branch: 'Reyes',
    birthDate: dt(1996, 10, 11), location: 'Manila', occupation: 'Journalist',
  });
  const lorenzo = await createMember({
    firstName: 'Lorenzo', lastName: 'Cruz', gender: 'MALE', branch: 'Cruz – Cebu',
    birthDate: dt(1998, 4, 18), location: 'Davao', occupation: 'Fisheries Scientist',
  });
  const elena = await createMember({
    firstName: 'Elena', lastName: 'Cruz', gender: 'FEMALE', branch: 'Cruz – Cebu',
    birthDate: dt(2001, 8, 8), location: 'Davao', occupation: 'Medical Student',
  });
  const camille = await createMember({
    firstName: 'Camille', lastName: 'Cruz', maidenName: 'Villanueva', gender: 'FEMALE', branch: 'Villanueva',
    birthDate: dt(1994, 11, 11), location: 'USA', occupation: 'Nurse',
  });

  // --- Generation 4 ---
  const julia = await createMember({
    firstName: 'Julia', lastName: 'Cruz', gender: 'FEMALE', branch: 'Cruz – Cebu',
    birthDate: dt(2020, 2, 14), location: 'USA',
  });

  const rel = (personId, relatedPersonId, type, extra = {}) =>
    prisma.relationship.create({ data: { personId, relatedPersonId, type, ...extra } });

  // Sibling pairs (single stored row)
  await rel(juan.id, tomas.id, RelationshipType.SIBLING);
  // Juan & Maria
  await rel(juan.id, maria.id, RelationshipType.SPOUSE, { startDate: dt(1965, 5, 30) });
  // Children of Juan + Maria
  for (const child of [pedro, ana, miguel]) {
    await rel(juan.id, child.id, RelationshipType.PARENT);
    await rel(maria.id, child.id, RelationshipType.PARENT);
  }
  // Tomas & Rosa + children
  await rel(tomas.id, rosa.id, RelationshipType.SPOUSE, { startDate: dt(1973, 2, 14) });
  await rel(tomas.id, ramon.id, RelationshipType.PARENT);
  await rel(rosa.id, ramon.id, RelationshipType.PARENT);
  await rel(tomas.id, lydia.id, RelationshipType.PARENT);
  await rel(rosa.id, lydia.id, RelationshipType.PARENT);
  // Pedro & Liza + children
  await rel(pedro.id, liza.id, RelationshipType.SPOUSE, { startDate: dt(1992, 3, 21) });
  await rel(pedro.id, juanJr.id, RelationshipType.PARENT);
  await rel(liza.id, juanJr.id, RelationshipType.PARENT);
  await rel(pedro.id, sofia.id, RelationshipType.PARENT);
  await rel(liza.id, sofia.id, RelationshipType.PARENT);
  await rel(pedro.id, alain.id, RelationshipType.PARENT);
  await rel(liza.id, alain.id, RelationshipType.PARENT);
  // Ana: first marriage Marco (ended), second Carlos
  await rel(ana.id, marco.id, RelationshipType.SPOUSE, { startDate: dt(1990, 12, 8), endDate: dt(2005, 6, 1), status: 'ENDED' });
  await rel(ana.id, carlos.id, RelationshipType.SPOUSE, { startDate: dt(2008, 9, 20) });
  await rel(ana.id, diego.id, RelationshipType.PARENT);
  await rel(marco.id, diego.id, RelationshipType.PARENT);
  await rel(ana.id, carla.id, RelationshipType.PARENT);
  await rel(marco.id, carla.id, RelationshipType.PARENT);
  // Miguel & Nina + children
  await rel(miguel.id, nina.id, RelationshipType.SPOUSE, { startDate: dt(1996, 4, 27) });
  await rel(miguel.id, lorenzo.id, RelationshipType.PARENT);
  await rel(nina.id, lorenzo.id, RelationshipType.PARENT);
  await rel(miguel.id, elena.id, RelationshipType.PARENT);
  await rel(nina.id, elena.id, RelationshipType.PARENT);
  // Juan Jr & Camille + Julia
  await rel(juanJr.id, camille.id, RelationshipType.SPOUSE, { startDate: dt(2018, 11, 11) });
  await rel(juanJr.id, julia.id, RelationshipType.PARENT);
  await rel(camille.id, julia.id, RelationshipType.PARENT);

  // --- Photos: avatars for every member ---
  const members = [
    juan, tomas, maria, pedro, ana, miguel, liza, marco, carlos, nina, rosa,
    ramon, lydia, juanJr, sofia, alain, diego, carla, lorenzo, elena, camille, julia,
  ];
  for (const m of members) {
    const img = await saveImage(avatarSvg(m), { optimizedW: 320 });
    const photo = await prisma.photo.create({
      data: {
        ...img,
        caption: `Portrait of ${m.firstName} ${m.lastName}`,
        approvalStatus: PhotoStatus.APPROVED,
        uploadedById: m.id,
      },
    });
    await prisma.familyMember.update({ where: { id: m.id }, data: { profilePhotoId: photo.id } });
  }
  console.log(`✓ Created ${members.length} member profiles with portraits`);

  // --- Historical + reunion scene photos ---
  const scenes = [
    { svg: sceneSvg({ title: 'The Wedding of Juan & Maria', sub: 'Cebu City · May 30, 1965', hue: ['#f7e7d4', '#e8c9a8', '#9a7b4f', '#b08d4f'] }), caption: 'Juan and Maria on their wedding day', photoDate: dt(1965, 5, 30), location: 'Cebu City', photographer: 'Unknown' },
    { svg: sceneSvg({ title: 'The Old Family Home', sub: 'Cebu City · 1970', hue: ['#dce7e2', '#b5ccc2', '#6f8f7d', '#7a8b6f'] }), caption: 'The original family home in Cebu', photoDate: dt(1970, 6, 1), location: 'Cebu City' },
    { svg: sceneSvg({ title: 'First Family Reunion', sub: '1995', hue: ['#f3e3d8', '#e2bda6', '#a05c3c', '#a4583c'] }), caption: 'Our first major family reunion', photoDate: dt(1995, 4, 15), location: 'Cebu City' },
  ];
  const scenePhotos = [];
  for (const s of scenes) {
    const img = await saveImage(s.svg, {});
    scenePhotos.push(
      await prisma.photo.create({
        data: { ...img, caption: s.caption, photoDate: s.photoDate, location: s.location, photographer: s.photographer, approvalStatus: PhotoStatus.APPROVED },
      }),
    );
  }
  await prisma.photoTag.createMany({
    data: scenePhotos.slice(0, 2).flatMap((p) => [juan.id, maria.id, pedro.id].map((memberId) => ({ photoId: p.id, memberId }))),
  });

  // --- Reunions ---
  const reunion2025 = await prisma.reunionEvent.create({
    data: {
      name: '2025 Family Reunion', date: dt(2025, 12, 27), location: 'Cebu City',
      description: 'The annual Cruz Family Reunion — three days of food, stories, and games.',
      createdById: admin.id, coverPhotoId: scenePhotos[2].id,
    },
  });
  const reunion2026 = await prisma.reunionEvent.create({
    data: {
      name: '2026 Family Reunion', date: dt(2026, 12, 27), location: 'Cebu City',
      description: 'Save the date! This year\u2019s reunion features the family history exhibit and a game night.',
      createdById: admin.id,
    },
  });

  const albumData = [
    { name: 'Arrival', photos: 3 },
    { name: 'Family Dinner', photos: 2 },
    { name: 'Group Photos', photos: 3 },
  ];
  const albumPhotoRows = [];
  for (const [ai, a] of albumData.entries()) {
    const album = await prisma.reunionAlbum.create({
      data: { reunionEventId: reunion2025.id, name: a.name, description: `Photos from ${a.name} — 2025 Reunion` },
    });
    const palette = [
      ['#f7e7d4', '#e8c9a8', '#9a7b4f', '#b08d4f'],
      ['#f3e3d8', '#e2bda6', '#a05c3c', '#a4583c'],
      ['#e9e3d3', '#cfc09a', '#8a7a4f', '#b08d4f'],
    ];
    for (let i = 0; i < a.photos; i++) {
      const img = await saveImage(
        groupPhotoSvg({ title: `${a.name}`, sub: `2025 Reunion · ${new Date(2025, 11, 27 + i).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }),
        {},
      );
      const photo = await prisma.photo.create({
        data: { ...img, caption: `${a.name} — 2025 Reunion`, photoDate: dt(2025, 12, 27), location: 'Cebu City', approvalStatus: PhotoStatus.APPROVED, uploadedById: alain.id },
      });
      albumPhotoRows.push(prisma.albumPhoto.create({ data: { albumId: album.id, photoId: photo.id, addedById: admin.id } }));
      if (reunion2025.coverPhotoId == null) {
        await prisma.reunionEvent.update({ where: { id: reunion2025.id }, data: { coverPhotoId: photo.id } });
      }
      if (i < 2 && a.name === 'Group Photos') {
        await prisma.photoTag.createMany({
          data: [pedro.id, ana.id, miguel.id, maria.id].map((memberId) => ({ photoId: photo.id, memberId })),
        });
      }
    }
  }
  await Promise.all(albumPhotoRows);

  const albums2026 = [
    { name: 'Arrival', description: 'First arrivals and hellos', photos: 3 },
    { name: 'Family Program', description: 'Program numbers and presentations', photos: 2 },
    { name: 'Group Photos', description: 'Everyone together', photos: 3 },
  ];
  for (const [ai, a] of albums2026.entries()) {
    const album = await prisma.reunionAlbum.create({ data: { reunionEventId: reunion2026.id, name: a.name, description: a.description } });
    for (let i = 0; i < a.photos; i++) {
      const img = await saveImage(
        groupPhotoSvg({ title: `${a.name}`, sub: `2026 Reunion · ${new Date(2026, 11, 27 + i).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }),
        {},
      );
      const photo = await prisma.photo.create({
        data: { ...img, caption: `${a.name} — 2026 Reunion`, photoDate: dt(2026, 12, 27), location: 'Cebu City', approvalStatus: PhotoStatus.APPROVED, uploadedById: alain.id },
      });
      await prisma.albumPhoto.create({ data: { albumId: album.id, photoId: photo.id, addedById: admin.id } });
      if (reunion2026.coverPhotoId == null) {
        await prisma.reunionEvent.update({ where: { id: reunion2026.id }, data: { coverPhotoId: photo.id } });
      }
      if (i === 0 && a.name === 'Group Photos') {
        await prisma.photoTag.createMany({
          data: [juan.id, maria.id, pedro.id, ana.id, miguel.id].map((memberId) => ({ photoId: photo.id, memberId })),
        });
      }
    }
  }

  // One pending photo to demonstrate the approval flow
  const pendingImg = await saveImage(
    sceneSvg({ title: 'From Lolo\u2019s Scrapbook', sub: 'Cebu City · 1972', hue: ['#e8e0cf', '#c9b98f', '#7a6a45', '#8a6d38'] }),
    {},
  );
  await prisma.photo.create({
    data: { ...pendingImg, caption: 'Found this in an old scrapbook — can anyone identify everyone here?', photoDate: dt(1972, 3, 1), location: 'Cebu City', approvalStatus: PhotoStatus.PENDING, uploadedById: alain.id },
  });

  // --- Family timeline milestones ---
  await prisma.familyEvent.createMany({
    data: [
      { title: 'Family moved to Cebu', eventDate: dt(1970, 6, 1), eventType: 'MOVE', description: 'Juan and Maria settled the family in Cebu City.', createdById: admin.id },
      { title: 'First major family reunion', eventDate: dt(1995, 4, 15), eventType: 'REUNION', description: 'The tradition of annual reunions began.', createdById: admin.id },
    ],
  });

  // --- Member user + a sample pending change request ---
  const alainUser = await prisma.user.create({
    data: {
      email: 'alain@family.local',
      passwordHash: bcrypt.hashSync('Member123!', 10),
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      familyMemberId: alain.id,
    },
  });
  await prisma.changeRequest.create({
    data: {
      requestType: ChangeRequestType.PROFILE_UPDATE,
      targetType: 'family_member',
      targetId: sofia.id,
      submittedById: alainUser.id,
      oldData: { nickname: null },
      proposedData: { nickname: 'Sofie' },
      reason: 'Everyone in the family calls her Sofie — adding it as her nickname.',
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: admin.id, userName: adminEmail, action: 'seed', entityType: 'system',
      newValue: { note: 'Initial demo data created' },
    },
  });

  console.log('✓ Demo data created: 22 members, 4 generations, 2 reunions, 8 albums/photos, 1 pending photo, 1 pending change request');
  console.log('  Login: admin@family.local / FamilyAdmin123!  ·  alain@family.local / Member123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());