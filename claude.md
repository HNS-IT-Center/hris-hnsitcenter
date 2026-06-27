# HNS IT Center HRIS - Project Context & Documentation

This file documents the architectural decisions, environment setup, database commands, and completed work for the HNS IT Center HRIS application. **Agents should read this file to understand the current state of the project before making changes.**

## 1. What Has Been Built (Phase 1)
- **Framework & Infrastructure:** 
  - Next.js 16 (App Router)
  - PWA configured (Manifest & Offline Fallback page at `/offline`)
  - Cloudflare R2 utilities for file storage (`lib/utils/storage.ts`) with client-side WebP image compression (`lib/utils/file.ts`).
  - Supabase client integration (`lib/supabase/client.ts` & `lib/supabase/server.ts`).
- **SSO Authentication:** 
  - Integrated with `sso.hnsitcenter.id` via Cross-Domain JWT Cookies.
  - Implemented `proxy.ts` (Next.js 16 Middleware) that decodes the `sso_token` (HS256) and injects headers (`x-user-id`, `x-user-role`, etc.) into Server Components.
  - Added a **Local Development Bypass**: If running on `localhost:3000` (`NODE_ENV === 'development'`), the proxy automatically injects a mock HRD user (`dev@hnsitcenter.id`) to prevent infinite redirect loops caused by the browser blocking `.hnsitcenter.id` cookies on localhost.
- **Database (Prisma 7 + Supabase):** 
  - Full schema matching the 15 project brief markdowns is in `prisma/schema.prisma`.
  - Configured for Prisma 7 using `prisma.config.ts` (with `@prisma/adapter-pg` driver).
- **Route Wrappers:** 
  - Wired existing React UI components from `components/hris/pages/` into Next.js routes under `app/(dashboard)/*` (e.g. `/dashboard`, `/hrd/dashboard`, `/attendance`).

## 2. Environment Variables (.env)
Your `.env` file should look exactly like `.env.example`. 
**CRITICAL NOTE FOR AGENTS:** Do not leak or log the `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Database Management & Seeding

The database uses Prisma ORM connected to Supabase PostgreSQL. A seeder script (`prisma/seed.ts`) is configured to generate default test data (Departments, Stores, Shifts, and Test Users).

### How to Sync Schema (Push)
If you update `prisma/schema.prisma`, you need to push the changes to Supabase:
```bash
npx prisma generate
npx prisma db push
```

### How to Seed Data
If the database is empty, run the seeder to populate default test data:
```bash
npx prisma db seed
```
*Note: The seed command is mapped to `npx tsx prisma/seed.ts` via `prisma.config.ts`.*

### How to Reset the Database
If you need a fresh start (wiping all data), you can reset the database and re-seed it in one command:
```bash
npx prisma migrate reset
```
*(This will drop the database, recreate it from the schema, and automatically run the seed script!)*

## 4. Next Steps (Phase 2 & Beyond)
- **Phase 2:** Employee Management & Shift Assignments
- **Phase 3:** Attendance Module (Geofencing, Photo Check-in)
- **Phase 4:** Leave & Overtime Approvals
- **Phase 5:** Notifications (VAPID/Web Push, Resend) & Cron Jobs
