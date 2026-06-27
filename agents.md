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

## 4. Next Steps & Detailed Phase Planning (Phase 2 - 5)

This section contains the precise technical roadmap. Any new AI agent reading this file should pick up the next uncompleted phase.

### Phase 2: Employee & Shift Management (Status: NOT STARTED)
- **Objective:** Allow HRD to manage user accounts, roles, departments, stores, and assign shifts.
- **Backend/API:** Create Next.js Server Actions to execute CRUD operations on Prisma models (`User`, `Department`, `Position`, `Store`, `Shift`).
- **Frontend Integration:** Wire up the UI components in `/app/(dashboard)/hrd/employees` and `/app/(dashboard)/hrd/shifts`.
- **Media Upload:** Implement Cloudflare R2 upload for employee profile pictures inside the `EmployeeForm`. Ensure files are compressed (WebP) client-side before uploading.

### Phase 3: Attendance Module (Geofencing & Selfie) (Status: NOT STARTED)
- **Objective:** Core check-in / check-out mechanism for employees.
- **Frontend Tracking:** Use HTML5 Geolocation API on the `/attendance` page to grab the user's `latitude` and `longitude`.
- **Photo Verification:** Implement HTML5 Camera API to capture a selfie. Compress it and upload it directly to Cloudflare R2.
- **Validation:** Compare the user's location against their assigned `Store` coordinates to enforce Geofencing.
- **Database:** Insert records into the `Attendance` table with `status` (Present, Late, etc.) based on `Shift` start times.

### Phase 4: Leave & Overtime Approvals (Status: NOT STARTED)
- **Objective:** Enable employees to request time off or overtime, and allow HRD to approve/reject.
- **Employee View:** Build submission forms in `/leave` and `/performance` for `LeaveRequest` and `OvertimeRequest`.
- **HRD View:** Wire up the data tables in `/hrd/leave` to allow bulk approval/rejection.
- **State Management:** When a leave is approved, deduct the quota from the user's available leave balance (if applicable in schema).

### Phase 5: Notifications & Automation (Status: NOT STARTED)
- **Push Notifications (VAPID):** Implement Web Push API. Ask users for notification permissions, store the subscription in the database, and send push notifications for important events (e.g., Leave Approved).
- **Email (Resend):** Integrate Resend API for critical email alerts (e.g. HRD receives a new leave request).
- **Cron Jobs (Vercel Cron):** Setup `/api/cron/auto-checkout` to run every night at 23:59 to automatically check out users who forgot to clock out, marking them as `Missed Checkout`.
