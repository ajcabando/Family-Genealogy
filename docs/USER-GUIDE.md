# Family Tree & Reunion Archive — User Guide

A private, mobile-first family heritage archive. This guide explains how to use every part of the application — whether you are a guest, a family member, or an administrator.

**The app is public to view.** You do not need an account to explore the family tree, browse photos, or read reunion albums. You only need an account (or an access request) to **contribute** — upload photos, suggest corrections, add family members, and more.

---

## 1. Getting started

### Accessing the app

| Where | Address |
|---|---|
| This computer | http://localhost:3844 |
| Other devices on your network | http://<your-machine-IP>:3844 (e.g. `http://10.10.80.118:3844`) |

The app is a **Progressive Web App** — on a phone or tablet, use your browser's **Add to Home Screen** option to install it like an app (icons + offline static shell included).

### Demo accounts

The seeded demo archive includes two accounts:

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@family.local` | `FamilyAdmin123!` |
| Family Member | `alain@family.local` | `Member123!` |

### Three levels of access

| | Guest (no account) | Family Member | Administrator |
|---|---|---|---|
| Browse tree, profiles, photos, reunions, timeline | ✅ | ✅ | ✅ |
| Search the family | ✅ | ✅ | ✅ |
| Upload photos | — | ✅ | ✅ |
| Suggest corrections / new members | — | ✅ | ✅ |
| Approve / reject contributions | — | — | ✅ |
| Manage members, users, settings | — | — | ✅ |

---

## 2. Signing in, requesting access, passwords

### Sign in

1. Tap **Sign in** (top-right of the header, or the guest card in the sidebar on desktop).
2. Enter your email and password.
3. Tick **Remember me** to stay signed in on this device.
4. If you were on a page that needs an account (e.g. uploading a photo), you'll be returned there automatically after signing in.

### Request access

New to the family archive? Use **Request access** (next to Sign in):

1. Enter your first name, last name, email, and a password (8+ characters).
2. Submit — your request goes to an administrator for approval.
3. You'll be able to sign in **after an administrator approves your account** (this keeps the system private).

### Forgot your password?

Use **Forgot password?** on the sign-in page, enter your email, and follow the reset link sent to you.

### Sign out

- **Desktop:** click the ✕ next to your name at the bottom of the sidebar.
- **Mobile:** open the **More** sheet and tap **Sign out**.

---

## 3. Navigation

### Desktop / tablet (≥ 1024px)

A fixed **sidebar** on the left lists every section:

Dashboard · Family Tree · Family · Photos · Reunions · Timeline · My Profile · Contributions · Notifications · **Admin** (administrators only)

### Phone (< 1024px)

A compact **header** (family name, search, notifications, profile) plus a **bottom navigation bar**:

**Tree | Family | Photos | Reunions | More**

- **Tree / Family / Photos / Reunions** — the four most-used sections, one tap away.
- **More** — opens a bottom sheet with the remaining sections: Dashboard, Timeline, My Profile, Contributions, Notifications, Admin (if you're an administrator), and Sign out.

The active section is highlighted so you always know where you are.

---

## 4. Dashboard (`/`)

The home screen gives a snapshot of the archive:

- **Stats cards** — family members, branches, photos, reunions, pending contributions.
- **Recent family photos** — a horizontally scrolling strip of the latest approved photos.
- **Upcoming reunions** — the next event, with date and location.
- **Recent family activity** — a compact list of recent additions and events.
- **Pending approvals** (administrators only) — quick link to review queue items.

---

## 5. Family Tree (`/tree`) — the heart of the app

The interactive genealogy tree shows the whole family across generations:

- **Parent → child** relationships run **vertically** (solid gold lines).
- **Spouse → spouse** run **horizontally** (lighter gold lines).
- **Adopted** children use dashed green lines; **step** relationships use dotted red-brown lines (see the legend at the bottom).
- **Siblings** are grouped under the same parents.

### Moving around

- **Zoom** — use the **+ / −** buttons (bottom-left), pinch on touch screens, or scroll-wheel/ trackpad on desktop.
- **Pan** — drag the canvas (or swipe with one finger on mobile).
- **Fit tree** — centers and fits the entire tree to the screen.
- **Expand all** — reopens every collapsed branch.
- **Branch filter** — pick a family branch (e.g. "Cruz Family") to show just that branch plus its ancestors.

### Finding someone

Use the **search box** at the top of the tree — search by first or last name, nickname, or branch. Click a result and the tree centers on that person.

### Person cards

Each card shows the profile photo, name, and years. Click a card to open the **profile drawer** with quick facts (parents, spouse, children, siblings) and a **View profile** link.

- **+ / −** on a card collapses or expands that person's descendants (great for hiding big branches).

### Focus mode (especially useful on phones)

On a phone, tapping a person switches to **Focus view**: only that person and their immediate family are shown, with toggle chips for **Parents · Siblings · Spouse · Children**. Tap chips to show or hide each group. Use **Full Tree** to return to the whole family.

On desktop, open a person's drawer and choose **Focus on this person** for the same view.

---

## 6. Family directory & profiles

### Browse & search (`/family`)

The **Family** page lists all members with a search field. Search by:

- First or last name
- Maiden name
- Nickname
- Family branch
- Birth year

Results appear as touch-friendly cards — tap one to open the profile.

### Member profile (`/family/[id]`)

Every member has a profile page:

- **Header** — large profile photo, full name, living/deceased badge, branch badge, years, occupation and location.
- **Collapsible sections** — Biography, Parents, Children, Grandchildren, Spouses, Siblings, Grandparents, and Details (birth/death, occupation, location, nickname, maiden name). Tap a section title to expand or collapse it — handy on small screens.
- **Photos of [name]** — photos tagged with that person.
- **Quick links** — open the person in the tree, or jump to your contributions.

**Actions:**

- **Change profile photo** — visible on your own profile (or any profile, as an administrator). Pick from the photo archive or upload a new one.
- **Suggest a correction** — propose a fix to this person's information. The suggestion goes into the approval queue (see §11) — it never changes the official tree directly.
- **Edit** (administrators) — go straight to the admin member editor.

**Privacy:** living members' detailed information (exact birth date, location, death-related fields) is hidden from non-administrators unless the privacy setting is adjusted — a note in the Details section tells you when this applies.

---

## 7. Photos (`/photos`)

The family photo archive.

### Browsing

- **Grid** — 2 columns on phones, more on larger screens, in a masonry layout.
- **Lazy loading** — photos load progressively as you scroll (thumbnails first, never the full originals).
- Tap any photo to open the **full-screen viewer**.

### Full-screen viewer

- **Swipe left / right** (or arrow keys) to move between photos — "Photo 3 / 24" shows your position.
- **Pinch to zoom** (or double-tap) to inspect details; a reset button returns to fit.
- See the **caption, date, location, uploader, and tagged family members** beneath the image.
- **Tagged people** are links — tap a name to open that person's profile.
- **Download** the photo if the administrator has enabled downloads.
- **Favorite** a photo (heart icon) — favorites are personal to your account.

### Uploading photos

Sign in, then use the **Upload Photos** button (or drag & drop on desktop):

1. Choose photos — **Take Photo** opens your camera on a phone; **Choose Photos** opens the gallery/file picker (multiple selection supported).
2. Preview the selection, remove any you don't want.
3. Add a caption, date, location, and **tag family members** in each photo.
4. Submit.

**Approval:** if the administrator has photo approval enabled, your photos appear in **Pending** status until reviewed (see §10). Approved photos are visible to everyone; rejected ones are not published.

---

## 8. Reunions (`/reunions`)

### Event listing

See upcoming and past family reunions. Each card shows the date, location, and photo count.

### Event page (`/reunions/[id]`)

- **Hero** — cover photo, name, date, location, description.
- **Albums** — a grid of albums (e.g. *Arrival*, *Family Dinner*, *Group Photos*), each showing its cover and photo count. Tap an album to open its gallery.
- **Upload Photos** — sign in and add photos straight to the event, choosing which album they go into (with captions and tags, same as §7). If approval is enabled they queue as **Pending Photos**.
- **New Album** (administrators) — create albums for the event; administrators can also delete albums.

---

## 9. Timeline (`/timeline`)

A vertical family-history timeline combining births, deaths, marriages, reunions, and milestones, grouped by year. Scroll through the family's story in chronological order.

---

## 10. My Profile, Contributions, Notifications

These sections require an account.

### My Profile (`/profile`)

Your own member profile (same as §6) — plus the ability to change your profile photo and suggest corrections to your own record.

### Contributions (`/contributions`)

Everything you've submitted, organized into tabs with counts:

- **Pending** — awaiting administrator review.
- **Approved** — accepted and applied to the official archive.
- **Rejected** — declined, with the reviewer's notes when provided.

Two kinds of contributions appear here:

1. **Change requests** — new family members, relationship changes, profile updates. Each shows the type, target person, your reason, status, and submission date.
2. **Your photos** — with a small **pending / rejected** badge while not yet approved.

### Notifications (`/notifications`)

In-app notifications for things that matter to you:

- Your contribution or photo was **approved / rejected**
- Someone **tagged you** in a photo
- A **new reunion** was created
- A new family member was added / the tree was updated
- (Administrators) new requests and photos awaiting review

The bell icon in the header shows an **unread badge**; tap it to open the full list.

---

## 11. The approval workflow (how the tree stays accurate)

Family members can **suggest**, but only administrators can **change** the official record:

```
Member submits a change (new member, relationship, profile update, or photo)
        │
        ▼
Pending Approval  ─── (administrator may request more information)
        │
    ┌───┴───┐
Approve       Reject
   │             │
   ▼             ▼
Applied to    Recorded in the
official tree  audit log
```

- Every pending request shows **who submitted it, when, the original value, the proposed value, and the reason**.
- Approving a genealogy change applies it to the official tree **after automatic integrity checks** — the system refuses impossible relationships (a person being their own parent, circular parent chains, duplicate spouses/parents, and so on).
- Nothing unapproved ever mixes into the official genealogy.

---

## 12. Admin panel (`/admin`) — administrators only

The admin dashboard shows live counts and six sections:

### Pending Approvals
Review change requests (new members, relationship changes, profile updates) **and** pending photos. For each: see the submitter, original → proposed values, and reason, then **Approve**, **Reject** (with an optional note), or **Request Information**.

### Family Management
- Add, edit, or soft-delete family members and their relationships.
- **Restore** deleted records.
- **Merge duplicate** member records.

### Users
Manage family accounts: approve pending access requests, change roles (member / administrator), and disable accounts.

### Photo Review
Approve or reject uploaded photos before they become public (only if approval is enabled).

### Audit Log
A complete, timestamped history of important changes — who did what, when, with old and new values. Nothing important is silently overwritten.

### Settings & Backup
- **Approvals** — require photo approval on/off, require contribution approval on/off.
- **Privacy** — hide living members' details, control photo downloads.
- **Registration** — open or admin-approved sign-ups.
- **Backup** — download a full JSON archive of the family data, or import/export the tree in **GEDCOM** format (the standard genealogy interchange format) for use in other family-tree software.

---

## 13. Privacy & security notes

- The archive is **private by default**: pages are viewable, but all editing is authenticated and authorized server-side — you can never bypass checks from the browser.
- **Living members' detailed information is hidden** from non-administrators by default.
- Photos are **stripped of GPS/EXIF metadata** on upload — exact camera locations are never stored or exposed.
- Photos are served through protected routes, so image URLs can't be guessed or shared outside the system.
- Don't share your password; administrators can reset access at any time.

---

## 14. Tips & troubleshooting

| Issue | Fix |
|---|---|
| Can't remember the URL | On the host machine: `http://localhost:3844`. On a phone/tablet: use the computer's LAN IP (find it under System Settings → Network, or ask whoever runs the server). |
| Sign-in says account not approved | New registrations must be approved by an administrator — check back later or ask an admin. |
| Uploaded photo doesn't appear in the gallery | Photo approval may be enabled — check **Contributions → Pending** and wait for admin review. |
| Tree looks empty | Tap **Expand all**, or clear the branch filter. |
| Can't download a photo | The administrator has disabled photo downloads. |
| Phone shows horizontal scroll | You shouldn't see any on normal pages — the only intentionally scrollable areas are the tree canvas and photo strips. If you find one, tell an administrator. |
| Install as an app on your phone | Browser menu → **Add to Home Screen** (PWA). |

---

*Need a guide for a specific page? Every section above maps to a real screen — the family tree (§5) and the photo gallery (§7) are the two most-used, so start there.*