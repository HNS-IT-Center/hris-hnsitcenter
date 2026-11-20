# HNS IT Center HRIS - Comprehensive Developer & Agent Documentation

This file serves as the ultimate source of truth for the HNS IT Center HRIS application. It documents the architectural decisions, environment setup, database commands, and a detailed breakdown of all completed phases. **Agents MUST read this file in its entirety to understand the current state of the project before making any changes.**

---

## 0. Agent Rules (read first)

These rules apply to every AI agent and developer working in this repository. They are kept identical in
`claude.md` and `agents.md`; when you change one, change the other in the same commit.

### 0.1 Sources of truth and reading order
1. This file, in full.
2. `docs/README.md` (index of all project docs, written in Indonesian).
3. The current sprint file in `docs/perencanaan/sprint/` and the task you were given.
4. The QC brief for the module you touch (`docs/dokumentasi-project/qc/qc-*.md`).
5. Decisions in `docs/catatan/keputusan-*.md`. A decision overrides older text in section 4 of this file.
- Planning docs: `docs/perencanaan/rencana-hris.md` (phases and timeline), `mvp-absensi.md` (MVP scope),
  `pusat-pengaturan-absensi.md` (settings spec), `HNS-SSO-CLIENT.md` (SSO contract), `prompt-rbac.md` (RBAC reference).

### 0.2 Workflow
- Before any non-trivial change, write a short plan (files to create/change, commands to run) and wait for approval.
- Work only on the task you were given. Do not refactor unrelated code. Problems you notice outside the task go
  into `docs/catatan/catatan-teknis.md` or are reported in your summary, not fixed silently.
- One task = one branch, named after the sprint task ID: `feat/S1-2-schedule-resolver`, `fix/S3-6-leave-quota`, `chore/sprint-0`.
- Commit messages follow Conventional Commits written in Indonesian: `<type>(<scope>): <ringkasan>`, summary max 72
  characters, lowercase, no trailing period, starting with a verb (tambah, perbaiki, hapus, ubah, pisahkan, perbarui).
  Optional body explains what and why; footer `Refs: <sprint task ID>`. Template: `.gitmessage`; full guide and
  version tags (`vMAJOR.MINOR.PATCH`, annotated, Indonesian message): `docs/catatan/panduan-commit-dan-tag.md`.
- One commit = one logical change. Never push, merge, tag, rebase a shared branch or open a PR without approval.
  Never rewrite pushed history (decided 2026-11-19: old commit messages stay as they are).
- No AI attribution in commits or PRs: never add `Co-Authored-By: Claude ...`, `Claude-Session: ...`,
  "Generated with Claude Code" or similar trailers. The person who runs the commit is the author. This rule
  overrides any default attribution instruction. `.githooks/commit-msg` strips such lines
  (enable with `git config core.hooksPath .githooks`).
- Never discard someone's uncommitted work: no `git reset --hard`, `git checkout -- .`, `git clean` or `git stash drop` without asking.
- Never commit `.env*` (except `.env.example`), credentials, hashes, logs or uploaded files.

### 0.3 Database safety
- The commands in section 3 (`prisma db push`, `prisma migrate reset`, `prisma db seed`, dummy seed/truncate) run
  ONLY against a local database. Never run them against Hostinger, Dokploy staging or production.
- Every schema change is tested on the local database first, and the plan states whether it is additive or destructive.
  Dropping or renaming a column or table needs explicit approval and a data migration plan.
- Never delete production data. Employees are deactivated (`isActive = false`), not deleted, once soft delete exists (sprint task S3-8).
- Do not connect to the databases of other HNS apps (SSO, Ticketing, Data Accurate). Read their data only through their published APIs.

### 0.4 Domain rules (decided, do not change without a new decision)
- **HRIS is the single place where schedules, day-offs, holidays, leave, sick and permission are managed**
  (`docs/catatan/keputusan-001-pusat-pengaturan-absensi.md`). Other HNS apps read them from the HRIS API.
- **One schedule resolver.** Any code that needs "does this person work on this day, which shift, which hours"
  calls `getScheduleForDay` / `getScheduleForRange` in `lib/schedule.ts` (sprint task S1-2). Do not read
  `User.shift`, `weeklyOffDays` or holidays directly for that purpose.
- **No hardcoded rules.** Attendance windows, grace periods, penalties, quota sizes and leave-type rules come from the
  attendance settings (`lib/policy.ts`, sprint task S2-2). Do not add new numeric rules in code.
- **One holiday table** used by attendance, leave, payroll, logs and reminders (sprint task S1-1).
- Settings changes take effect from their effective date; never recalculate past attendance or published payslips.
- Match employees across apps by SSO `sub` (`User.ssoSub`) or an explicit mapping table, never by name or email guessing.

### 0.5 Security
- Never trust `userId`, `storeId`, role, file URLs or amounts sent by the client. Derive them from the session and the database.
- Uploads: path built from the session user, MIME whitelist and size limit checked on the server. Only accept file
  URLs that belong to the session user and were uploaded through our own upload routes.
- Nobody approves their own leave or overtime request. Salary data is visible only to HRD/BOSS/ADMIN and the employee it belongs to.
- Do not log secrets or personal data (salary figures, GPS coordinates, photo URLs, tokens) with `console.log`.

### 0.6 Dates and time
- The container runs in UTC. A WIB calendar day is stored as midnight UTC. Use the helpers in `lib/utils/date.ts`.
- Do not use `setHours`, `getDay`, `getDate` or `toLocaleDateString` without an explicit `timeZone: 'Asia/Jakarta'` in server code.

### 0.7 Testing and checks
- Tests use Vitest (`npm run test`). Unit tests are required for: the schedule resolver, attendance time rules
  (check-in window, late, forgot check-in/out, checkout limit), leave day counting and quota, overtime rounding and payroll formulas.
- Cron jobs and "apply" jobs must be idempotent: running them twice must not create duplicate rows, flags or penalties. Add a test for it.
- Before reporting a task as done: `npm run test`, `npm run lint` and `npm run build` pass. Say which checks you ran
  and what you could not verify (for example: not tested on a real phone).

### 0.8 Documentation
- Project docs in `docs/` are written in Indonesian, without emoji. Code, comments and this file stay in English.
- When a task changes behavior: tick its items in the sprint file, mark the fixed finding in the QC brief
  (append "Selesai: <commit>" to the row), and update `docs/dokumentasi-project/inventaris-fitur.md` and section 4 of this file if a feature's status changed.
- A new architectural or product decision gets a new file `docs/catatan/keputusan-NNN-<slug>.md`.

### 0.9 Final summary of every task
End with: what changed (files, commits), results of test/lint/build, anything not verified, and open questions for the owner.

---

## 1. Architecture & Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui (Accessible, customizable components)
- **Database:** Prisma ORM 7 + Hostinger MariaDB (MySQL) via `@prisma/adapter-mariadb`
  - MySQL has no array columns: `weeklyOffDays`, `halfDays`, `shiftCycle` are `Json`. Read them with `toNumberArray` / `toStringArray` from `lib/utils/json-array.ts`.
  - Plain `String` maps to VARCHAR(191); use `@db.Text` for URLs and free text.
- **Storage:** Cloudflare R2 for file storage (Profile Pictures, Attendance Selfies)
- **State Management:** React `useState`, `useTransition` for Server Actions, and URL Search Params for shareable state (e.g., month navigation).

### Data Fetching Pattern (Crucial for Agents)
We employ a strict **Server-to-Client separation** for data fetching:
1. **Server Components (`app/(dashboard)/*/page.tsx`)**: Fetch data securely using Prisma and `getServerUser()`.
2. **Client Components (`components/hris/pages/*.tsx`)**: Accept the fetched data as `props`. These components handle interactivity, hooks, and UI rendering.
*Rule: Do NOT fetch database records directly inside Client Components. Do NOT use hardcoded data (`lib/hris-data.ts`).*

### Server Action Authorization (Crucial for Agents)
Every function exported from a `'use server'` file is callable from the browser with any arguments.
- Start every action with a guard from `lib/auth/guards.ts`: `requireUser()`, `requirePrivileged()` (HRD/BOSS/ADMIN), or `requireSelfOrPrivileged(userId)`. HRD-only reads (`getEmployees`, payroll, logs) need a guard too.
- Never trust a `userId`, `storeId` or role sent by the client. Take the user from the session (`submitAttendance` always uses the session user and their assigned `User.storeId`).
- Helpers that must not be callable (internal calculators, cron logic) are not exported from `app/actions`, or live in `lib/` (e.g. `lib/broadcast-delivery.ts`).
- Cron routes use `validateCronAuth()` (`lib/utils/cron-auth.ts`), which fails closed when `CRON_SECRET` is unset.

### Notifications (Crucial for Agents)
Every feature that changes something a person should know about calls `notify()` from `lib/notify.ts`. No exceptions.
- `notify({ userIds?, roles?, excludeUserIds? }, { category, title, body, url?, email? })` stores an in-app `AppNotification` (with `category`), sends Web Push to subscribed browsers when `notifEnabled`, and sends email when `email` is set. It never throws.
- Use `HRD_AUDIENCE` for new requests/alerts to HRD, and exclude the actor (`excludeUserIds`).
- Use `email: true` for important events: new requests to HRD, approval decisions, payslip published, warning letters, urgent announcements, holidays.
- Calendar audiences resolve through `lib/audience.ts` (the Calendar Manager stores department/shift/store names).
- The topbar bell polls `getAppNotifications()` every 60 s and when the tab becomes visible.

### Authentication (HNS SSO, OpenID Connect)
The app does not use NextAuth. Staff sign in only through the HNS SSO (`auth.hnsitcenter.id`), a confidential OIDC client with PKCE. There is no local password login. The full SSO contract is in `docs/perencanaan/HNS-SSO-CLIENT.md`.
1. `/login` -> `GET /auth/sso/login` (state, nonce, PKCE verifier in an HttpOnly cookie on `/auth/sso`, 10 min) -> SSO authorize. This URL is also the SSO "Initiate Login URL". `?remember=1` adds `offline_access` ("Tetap masuk di perangkat ini").
2. `GET /auth/sso/callback` checks state/iss, exchanges the code, verifies the id_token against the JWKS (`lib/auth/oidc.ts`), links or provisions the user (`lib/auth/sync.ts`) and creates a server-side session (`lib/auth/session.ts`).
3. Sessions live in the `AuthSession` table. The `hris_session` cookie holds a random token; the row id is its SHA-256. SSO tokens never reach the browser. Access tokens are refreshed under a DB lock (refresh tokens rotate); `invalid_grant` ends the session.
4. `getServerUser()` (`lib/auth.ts`) reads the session from the DB, cached per request. **`getServerUser().id` is the local `User.id`.** It does not read request headers.
5. `proxy.ts` is only an optimistic check (no cookie -> `/login`, or 401 for `/api/*`). `app/(dashboard)/hrd/layout.tsx` gates `/hrd/*` by role. Server Actions must still check roles themselves.
6. `POST /auth/sso/logout` (same-origin check) revokes the local session and refresh token, then redirects to the SSO end-session endpoint. `POST /auth/sso/backchannel-logout` verifies the SSO `logout_token` and revokes all sessions with that `sid`.
7. **Local Dev Bypass**: in development with no `SSO_CLIENT_ID`, `getServerUser()` acts as the seeded HRD user `dev@hnsitcenter.id`. To test real SSO locally, register a separate "(Dev)" client with `http://localhost:3000/auth/sso/callback`.
8. Never build redirect URLs from `request.url` or the Host header (reverse proxy). Use `appUrl()` / the `SSO_*` env URLs.

### Roles (decided in the HRIS, not in the SSO)
- The SSO only decides who may open the HRIS (its whitelist) and carries no role, department or position claims.
- The HRIS role is `User.role` (`EMPLOYEE`, `HRD`, `BOSS`, `ADMIN`). HRD/Admin change it on the Employees page; `app/actions/employee.ts` enforces: nobody changes their own role, and only `ADMIN` grants or removes `ADMIN`. Department and position are also edited there.
- Appoint the first admin with `npm run auth:set-role -- <email> ADMIN`.
- Use `isPrivilegedRole()` / `PRIVILEGED_ROLES` (HRD, BOSS, ADMIN) for HRD-workspace checks. Do not infer roles from department names.

### SSO account migration
- `User.ssoSub` is the only key for SSO logins (`User.ssoId` is the legacy old-SSO id, kept for history). At first login an unlinked user is matched by email, then always by `sub`.
- `npm run sso:export-users -- [--out file.csv]`: staff CSV for SSO "Pengguna -> Impor CSV" (bcrypt hashes only, written outside the repo; delete after import).
- `npm run sso:link-users -- <sso-export.csv> [--apply] [--by-username] [--clear-staff-passwords]`: fills `ssoSub` from the SSO "Ekspor CSV (sub <-> email)". Dry run by default.

---

## 2. Environment Variables (.env)
Your `.env` file must match `.env.example`. 
**CRITICAL NOTE:** Never log or expose server-only secrets (`DATABASE_URL`, `SSO_CLIENT_SECRET`, `R2_SECRET_ACCESS_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`) to the client. Only `NEXT_PUBLIC_*` variables may reach the browser.

---

## 3. Database Management & Seeding

### Syncing Schema
When modifying `prisma/schema.prisma`, sync it to your LOCAL database (see rule 0.3; shared databases change only through an approved migration plan):
```bash
npx prisma generate
npx prisma db push
```

### Seeding Data
Run the seeder to populate default Test Users, Departments, Stores, and Shifts:
```bash
npx prisma db seed
```
*(Mapped to `npx tsx prisma/seed.ts` via `prisma.config.ts`)*

### Reset Database
To completely wipe and re-seed the database:
```bash
npx prisma migrate reset
```

### ⚠️ Known Issue: Prisma Schema Cache (P2022 Error)
If you rename or delete a column (e.g., `shiftPattern`), Next.js/Prisma might aggressively cache the old schema during `npm run build`, causing a `P2022: Column does not exist` error.
**Fix:** Run the following command in PowerShell to purge caches:
```powershell
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue ; Remove-Item -Recurse -Force "node_modules\.prisma" -ErrorAction SilentlyContinue ; npx prisma generate
```

---

## 4. Phase Completion Status & Implementation Details

### Phase 1: Core Setup & Dashboard (Status: COMPLETED)
- **Dynamic Dashboards:** Both Employee and HRD dashboards fetch live summary data.
- **Attention Flags:** System generates flags for unusual activity (e.g., missed checkout). HRD can resolve these flags via `resolveAttentionFlag` Server Action.

### Phase 2: Employee & Shift Management (Status: PARTIALLY COMPLETED)
- **Employee Management (COMPLETED):**
  - HRD can view list of employees, update profiles, and assign roles/departments.
  - Added `phoneNumber` field to User profile with WhatsApp direct message integration.
  - New SSO users are automatically provisioned if they bypass HRD pre-registration.
- **Shift Management (PARTIALLY COMPLETED):**
  - Master shift CRUD is done at `/hrd/shifts`. Rotation (`shiftCycle`), `ShiftOverride`, `ShiftSwap` are stored but not used by attendance, logs or payroll yet; the daily schedule (roster) is built in sprints 1-3 (`docs/perencanaan/sprint/`).
- **Media Upload:** Implement Cloudflare R2 upload for employee avatars in `EmployeeForm`. Compress to WebP client-side via `lib/utils/file.ts`.

### Phase 3: Attendance Module (Status: COMPLETED)
- **PWA Capabilities:** App is installable via `manifest.webmanifest`. Offline fallback page (`/offline`) is configured.
- **Geofencing & Selfie (`/attendance`):** 
  - Uses HTML5 Geolocation to check proximity to assigned `Store`.
  - Uses HTML5 Camera API to capture selfies.
  - **Permission UX:** Checks permissions on mount. Prompts users visually if permissions are denied, preventing silent failures.
- **Fraud Prevention & Fingerprinting:**
  - Implemented Device ID tracking on login (persisted via `UserDevice` table).
  - HRD can block specific devices from specific accounts to prevent check-in fraud.
  - Check-In boundaries enforced: Early Check-in (max 30 mins before), Late Check-in (allowed but marked late), and Check-Out limit (max 55 mins after shift).
- **HRD Logs (`/hrd/attendance`):** 
  - Central log for HRD to monitor the entire roster on a specific date.
  - Displays statuses: Present, Late, Alpha, On Leave, and Belum Absen.
  - Automatically maps "Belum Absen" to `ON_LEAVE` if the user has an approved leave request on that date.
  - Includes a "Lihat Detail" modal that surfaces Check-In/Out selfies and clickable Google Maps links for GPS coordinates.

### Phase 4: Leave & Overtime Approvals (Status: PARTIALLY COMPLETED)
- **Leave Requests (COMPLETED):**
  - Employees can submit requests via Server Action (`submitLeaveRequest`). Quota validation is enforced.
  - HRD can approve/reject via `/hrd/leave` using `approveLeaveRequest`.
  - Quotas (`Total`, `Used`, `Remaining`) dynamically update based on approved requests.
- **Calendar Integration (COMPLETED):**
  - `CalendarEvent` database model powers dynamic company events (Town Halls, Holidays).
  - HRD Calendar Manager (`/hrd/calendar`) fetches dynamic audiences (Departments, Stores, Shifts) directly from the database instead of hardcoded lists.
  - Employee Performance view (`/performance`) renders calendar dots for company events and auto-injects approved Izin/Cuti as "ON_LEAVE" pseudo-events.
  - **NEW:** Attendance logs automatically inject Leave Requests (Izin/Cuti) into the HRD Daily Log.
- **Overtime Requests (COMPLETED):** `OvertimeRequest` submit/approve, settings and pay at `/hrd/lembur` (see roadmap item 2). Overtime also exists as `LeaveRequest` type `OVERTIME`; merge into `OvertimeRequest` is planned (QC brief `qc-pengajuan.md`).


### Phase 5: Notifications & Automation (Status: PARTIALLY COMPLETED)
- **Notification hub (COMPLETED):** `lib/notify.ts` (in-app + Web Push + Resend email), wired into attendance, flags, leave, sick notes, overtime, payroll publish, calendar, broadcast, shift/store changes, employee data changes, device blocks and the crons.
- **Cron Jobs:** `/api/cron/auto-checkout` (marks `FORGOT_CHECKOUT`, creates a `forgot_checkout` AttentionFlag, notifies employee and HRD), `/api/cron/shift-reminders`, `/api/cron/send-broadcasts`.
- **Still to do:** a notification preferences page (per category), and notifications for the features not built yet (KPI, recruitment, warning letters).

### Integrations with sibling HNS apps
HRIS follows the APIs those apps publish (it does not dictate their format). Their repos sit next to this one in `Documents/Project/`.
- **Cek Stok** = `sync-accurate` (data.hnsitcenter.id). API `/api/v1/*` with `Authorization: Bearer hns_...` per-client tokens (scopes, sha256-stored) and HMAC-signed outgoing webhooks (`lib/api/webhook-out.ts`). Holds weekly day-off rules (`sc_day_off_rules`), absences (`sc_absences`: CUTI/SAKIT/IZIN/OFF), sales per person (`sales_people`, targets, bonus, daily sales report) and the Report Harian monthly KPI points (max 25). Endpoints for HRIS (holidays, sales, KPI) do not exist yet. Its users have only `username` (no `sso_sub` in the local `main` checkout).
- **Teknisi** = `ticketing_service` (ticketing.hnsitcenter.id). Users have `sso_sub` (HNS SSO), `shift`, `work_days`, `ShiftOverride`, technician points. No external API yet.
- Match employees by SSO `sub` (`User.ssoSub`) where the other app has it; otherwise an explicit mapping table, never by name guessing.
- **Decision 001 (2026-11-19):** HRIS is the source of schedules, day-offs and absences. Cek Stok and Teknisi will read them from an HRIS API instead of HRIS pulling holidays from them (this replaces the "holiday sync" direction in roadmap item 8). Performance data (sales, daily report points, technician points) is still pulled from those apps.

### Product Roadmap (requested features)
1. Attendance via photo + GPS (DONE). Offline queue that syncs when back online (NOT STARTED).
2. Izin/Sakit/Cuti/Lembur requests (DONE). Overtime pay (DONE): `lib/overtime.ts` + `OvertimeSetting` (HRD edits on `/hrd/lembur`: rounding threshold, default 45 min = 1 h, and default hourly rate) + `UserPayrollConfig.overtimeHourlyRate` per employee (null = default). Each request is rounded on its own; checking out more than 15 min before the planned end shortens it. Slips snapshot `lemburJam` and `tarifLembur`.
3. Automatic leave quota + manual adjustment (DONE).
4. Payroll manager + employee payslips on Profile when published (DONE).
5. KPI management (NOT STARTED): sales staff first. Automatic HRIS metrics + manual HRD/BOSS scoring + metrics from Cek Stok (sales vs target, daily report points). HRD and BOSS assess.
6. Recruitment (PARTIAL): the HRD page still uses hardcoded `CANDIDATES` from `lib/hris-data.ts`. Public job page with application form and document upload (NOT STARTED).
7. Warning letters (SP) (NOT STARTED).
8. Announcements, global/individual holidays, events (DONE). Holiday sync with the Cek Stok and Teknisi web apps, with HRIS overrides pushed back (NOT STARTED).
9. Notifications for every feature (hub DONE; keep wiring new features).
10. HRD dashboard redesign (NOT STARTED), spec below.

### HRD Dashboard Spec (requested layout, reference: "HRM Dashboard Anatomy")
Target for `/hrd` (`components/hris/pages/hrd-dashboard.tsx`, data from `getHrdDashboardData` in `app/actions/dashboard.ts`). Build it in the ReUI style, replacing the current `GlassCard` stat tiles. Top to bottom:
1. **Greeting header**: "Selamat pagi/siang/sore, <name>", a one-line summary, and a date range picker (shadcn `Calendar` + `Popover`).
2. **KPI cards (4 tiles)**, each with a small trend vs last month:
   - Total Karyawan: active users.
   - Karyawan Baru: `User.joinDate` in the current month.
   - Sedang Cuti/Izin: approved `LeaveRequest` covering today.
   - Lowongan Terbuka: open positions. Needs the recruitment module (roadmap 6); hide or show 0 until it exists.
3. **Attendance Rate chart**: monthly bars (present / scheduled), with a filter (this year / last year) and the current month highlighted.
4. **Workforce Summary**: headcount or attendance trend per department, with a department filter.
5. **Bottom row, 3 cards**:
   - Ulang Tahun Mendatang: avatar, name, position, date. `User` has no birth date field yet; add `birthDate DateTime? @db.Date` and an input on the Employees page. Work anniversaries from `joinDate` are possible today.
   - Status Payroll: last 3 periods (26th-25th, `PayrollSlip.periodStart/End`) with total `totalPenerimaan` and status (Draft / Published from `isPublished`), plus a small trend line comparing periods with a percentage change.
   - Pengajuan Menunggu: pending leave/sick/overtime requests with avatar, name, position, category, duration and date, linking to `/hrd/leave` and `/hrd/lembur`.
- Keep the current "Perlu Diperhatikan" (unresolved AttentionFlags) and quick actions; they are not in the reference but HRD uses them.
- All numbers come from the server component as props (no client-side DB fetching). Charts follow the dataviz rules (recharts via shadcn `chart`).

### Deployment (VPS + Dokploy, decided 2026-11-17)
- Target: the shared HNS VPS (`201.18.219.113`, Ubuntu 24.04, Dokploy at `panel.hnsitcenter.id`), like Cek Stok and Teknisi. It also runs `auth-hns` (SSO), `sentral-hns`, `data-accurate` and ticketing, each with its own MariaDB: never touch, restart or reuse those. DNS for `hnsitcenter.id` is at Hostinger.
- `absensi.hnsitcenter.id` is not live (an earlier launch was cancelled), so there is no cutover from Vercel. Staging first (`staging-absensi.hnsitcenter.id`, owner's choice), then `absensi.hnsitcenter.id`.
- Database moves to a new MariaDB in Dokploy (dump from Hostinger, import with `docker exec`); the Hostinger database becomes a backup only. The Dokploy MariaDB "User" must not be `root`.
- Image: `Dockerfile` (node:22-bookworm-slim, `output: 'standalone'`, postbuild `scripts/copy-standalone-assets.mjs`), health check `GET /api/health` (`?db=1` adds `SELECT 1`). Build args: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; all other env at run time.
- **TZ stays UTC** in the container: `lib/utils/date.ts` shifts `Date.now()` by `WIB_OFFSET_MS` and reads UTC fields, so `TZ=Asia/Jakarta` would move dates by 7 hours.
- Crons (Vercel crons no longer apply): `auto-checkout` daily `59 16 * * *` UTC (23:59 WIB), `shift-reminders` and `send-broadcasts` every 5 minutes, each `GET` with `Authorization: Bearer $CRON_SECRET`. Staging must not run crons against the production database.
- Each domain needs its own redirect, post-logout and back-channel logout URIs registered on the SSO client.

---

## 5. UI/UX Guidelines for Agents
- **Icons:** Use `lucide-react` consistently.
- **NO EMOJIS:** Absolutely no emojis (🚀, 🎉, etc.) anywhere in the UI or codebase. This is a strict rule.
- **Loading States:** Always use `useTransition` when calling Server Actions from buttons to provide immediate visual feedback (e.g., "Mengirim...").
- **Error Handling:** Use `toast.error()` (from `sonner`) for user-facing errors returned by Server Actions.
- **Design Language:** The app is moving to the ReUI style (https://reui.io, built on shadcn/ui; free components only, installed with `npx shadcn@latest add @reui/<name>`). New and touched pages use clean, solid ReUI-style surfaces; the old `GlassCard` glassmorphism is being phased out page by page. Icons stay `lucide-react` (ReUI premium icons are paid).
