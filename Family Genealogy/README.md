# Family Tree & Reunion Archive

A private, modern web application for preserving family genealogy, photos, and reunion memories. Built with **Next.js 14 + TypeScript + Prisma + PostgreSQL**, fully containerized with Docker.

## Quick start (Docker)

```bash
# 1. Configure (optional — sane defaults are provided)
cp .env.example .env

# 2. Build and start (PostgreSQL + app)
docker compose up --build

# 3. Open the app
open http://localhost:3000
```

On first start the container waits for the database, applies migrations, and seeds a demo **Cruz family** (4 generations, reunion albums, sample photos, and a pending approval) plus an administrator account.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@family.local` | `FamilyAdmin123!` |
| Family Member | `alain@family.local` | `Member123!` |

> Change the admin credentials via the `FAMILY_ADMIN_EMAIL` / `FAMILY_ADMIN_PASSWORD` environment variables **before** first start in production.

### Development with hot reload

```bash
docker compose -f docker-compose.dev.yml up --build
```

Source is mounted into the container and `next dev` watches for changes.

### Without Docker

```bash
npm install
cp .env.example .env   # set DATABASE_URL to a local Postgres
npx prisma migrate deploy
node prisma/seed.mjs
npm run dev
```

## What's included

- **Interactive family tree** — zoom, pan, fit, expand/collapse branches, focus a person, search, branch filtering, profile cards, and a detail drawer. Parent/child (vertical), spouse (horizontal), sibling (grouped), adopted & step relationships (dashed) with a legend. Multiple spouses are supported.
- **Approval workflow** — every genealogy or profile change submitted by a member enters a **Pending Approval** queue; administrators review with old → new values, reason, and submitter, then approve / reject / request clarification. Approvals update the official tree and are recorded in the **audit log**.
- **Genealogy integrity** — server-side validation prevents self-parents, duplicate relationships, spouse/parent conflicts, and circular parent chains.
- **Photos** — drag & drop / phone uploads with automatic optimization (re-encoded original, webp optimized, thumbnail via sharp), EXIF/GPS stripped, pending-review approval flow, masonry gallery, lazy loading, full-screen lightbox, tagging, favorites, and permission-gated downloads.
- **Reunions** — events with albums, cover photos, per-album galleries, and direct photo uploads from the reunion page.
- **Family directory & profiles** — search by name/maiden/nickname/branch/year, birthdays, biographies, relationships (parents, children, spouses, siblings, grandparents, grandchildren), tagged photos, and privacy handling for living members.
- **Timeline** — births, deaths, marriages, reunions, and milestones grouped by year.
- **Dashboard** — stats, recent additions, recent/featured photos, upcoming reunions, pending approvals.
- **Admin panel** — approvals, member management (add / edit / soft-delete / restore / merge duplicates), user & role management, audit log, settings toggles (photo approval, contribution approval, registration, living-member privacy, downloads), and backup tools.
- **Notifications** — in-app for approvals, tags, new reunions, and pending requests.
- **Auth** — email/password with bcrypt, JWT session cookies, remember-me, password reset, and admin-approval of new accounts (private system).

## Backups

Your family's history is valuable — from **Settings → Backup** you can download a full JSON archive, or take a complete database dump:

```bash
docker compose exec db pg_dump -U family family_archive > backup.sql
docker compose cp app:/data/uploads ./uploads-backup
```

Restore: `cat backup.sql | docker compose exec -T db psql -U family family_archive`

## Architecture notes

```
prisma/schema.prisma   → data model (users, family_members, relationships, photos,
                         reunions, change_requests, audit_logs, notifications, settings)
prisma/seed.mjs        → demo data + initial admin (runs only when the DB is empty)
src/lib/genealogy.ts   → genealogy layout engine (couple units, generations, tidy layout)
src/components/tree/   → React Flow family tree
src/app/(app)/         → protected pages (shell layout enforces auth)
src/app/api/           → route handlers (auth, members, photos, reunions, approvals…)
src/middleware.ts      → session + role guards on pages and APIs (never trust the client)
```

- **Authorization** is enforced in middleware **and** in every API route — frontend permissions are only cosmetic.
- Uploaded images are stored on a Docker volume (`/data/uploads`); file serving is auth-gated through `/api/files/...`.
- Image EXIF/GPS metadata is stripped on upload — exact locations are never exposed.
- Performance: paginated galleries, lazy loading, image thumbnails, database indexes, and an efficient single-pass tree layout.

## Roadmap ideas

GEDCOM import/export, family stories & documents, video/audio archive, reunion RSVPs, QR profile codes, email notifications, Google login.