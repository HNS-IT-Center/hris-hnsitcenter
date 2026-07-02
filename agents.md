# HNS IT Center HRIS - Comprehensive Developer & Agent Documentation

This file serves as the ultimate source of truth for the HNS IT Center HRIS application. It documents the architectural decisions, environment setup, database commands, and a detailed breakdown of all completed phases. **Agents MUST read this file in its entirety to understand the current state of the project before making any changes.**

---

## 1. Architecture & Tech Stack
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui (Accessible, customizable components)
- **Database:** Prisma ORM 7 + Supabase PostgreSQL
- **Storage:** Cloudflare R2 for file storage (Profile Pictures, Attendance Selfies)
- **State Management:** React `useState`, `useTransition` for Server Actions, and URL Search Params for shareable state (e.g., month navigation).

### Data Fetching Pattern (Crucial for Agents)
We employ a strict **Server-to-Client separation** for data fetching:
1. **Server Components (`app/(dashboard)/*/page.tsx`)**: Fetch data securely using Prisma and `getServerUser()`.
2. **Client Components (`components/hris/pages/*.tsx`)**: Accept the fetched data as `props`. These components handle interactivity, hooks, and UI rendering.
*Rule: Do NOT fetch database records directly inside Client Components. Do NOT use hardcoded data (`lib/hris-data.ts`).*

### Authentication (SSO Proxy Flow & Local Auth)
The app uses a hybrid authentication approach (SSO + Local Password).
1. Users log in at the SSO portal (or local login) and receive an `sso_token` (JWT Cookie).
2. The `proxy.ts` intercepts requests, decodes the JWT using `HS256`, and injects headers (`x-user-id`, `x-user-role`, `x-user-email`) into the request.
3. Server Components read these headers via `lib/auth.ts` -> `getServerUser()`.
4. **Local Dev Bypass**: If running on `localhost:3000`, the proxy automatically injects a mock HRD user (`dev@hnsitcenter.id`) to bypass browser cross-domain cookie restrictions.
5. **CRITICAL AUTH RULE**: When querying or updating a user record in the database for authentication or session purposes, **ALWAYS match by `email: user.email`**, NOT by `id`. The `id` returned by `getServerUser()` corresponds to the `ssoId` if they logged in via SSO, which will cause `RecordNotFound` errors if used against the primary `id` column in Prisma. Email is the consistent unique identifier across both Local and SSO flows.

---

## 2. Environment Variables (.env)
Your `.env` file must match `.env.example`. 
**CRITICAL NOTE:** Never log or expose the `SUPABASE_SERVICE_ROLE_KEY` to the client.

---

## 3. Database Management & Seeding

### Syncing Schema
When modifying `prisma/schema.prisma`, sync it to Supabase:
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

### Dummy Seeding for Testing
We have a massive dummy seeder (`prisma/seed-dummy.ts`) that populates the database with 30 employees and 2 months of attendance, leaves, and logs (April to July 2026).
- **Run Dummy Seeder**: `npx tsx prisma/seed-dummy.ts`
- **Truncate Dummy Data**: `npx tsx prisma/truncate-dummy.ts` (Wipes dummy data safely without deleting SSO accounts).

---

## 4. Phase Completion Status & Implementation Details

### Phase 1: Core Setup & Dashboard (Status: COMPLETED)
- **Dynamic Dashboards:** Both Employee and HRD dashboards fetch live summary data.
- **Attention Flags:** System generates flags for unusual activity (e.g., missed checkout). HRD can resolve these flags via `resolveAttentionFlag` Server Action.
- **Payroll Period Logic:** Employee dashboard and Performance calculations use a custom payroll period (26th of the previous month to 25th of the current month) instead of standard calendar months.

### Phase 2: Employee & Shift Management (Status: PARTIALLY COMPLETED)
- **Employee Management (COMPLETED):**
  - HRD can view list of employees, update profiles, and assign roles/departments.
  - Added `phoneNumber` field to User profile with WhatsApp direct message integration.
  - New SSO users are automatically provisioned if they bypass HRD pre-registration.
  - UI optimized for mobile layout (Employee cards prevent horizontal overflow).
  - **Pagination added:** Capped at 15 employees per page on Desktop, 10 on Mobile.
- **Shift Management (NOT STARTED):**
  - Need to wire up UI in `/app/(dashboard)/hrd/shifts`.
- **Media Upload:** Implement Cloudflare R2 upload for employee avatars in `EmployeeForm`. Compress to WebP client-side via `lib/utils/file.ts`.

### Phase 3: Attendance Module (Status: COMPLETED)
- **PWA Capabilities:** App is installable via `manifest.webmanifest`. Offline fallback page (`/offline`) is configured.
- **Geofencing & Selfie (`/attendance`):** 
  - Uses HTML5 Geolocation to check proximity to assigned `Store`.
  - Uses HTML5 Camera API to capture selfies.
  - **Permission UX:** Checks permissions on mount. Prompts users visually if permissions are denied, preventing silent failures.
- **Fraud Prevention & Fingerprinting:**
  - Implemented Device ID tracking on login (persisted via `UserDevice` table) and parsed `userAgent` string via `ua-parser-js` to log human-readable device names (e.g., "Xiaomi Redmi Note 10").
  - HRD can block specific devices from specific accounts to prevent check-in fraud.
  - Check-In boundaries enforced: Early Check-in (max 30 mins before), Late Check-in (allowed but marked late), and Check-Out limit (max 55 mins after shift).
- **HRD Logs (`/hrd/attendance`):** 
  - Central log for HRD to monitor the entire roster on a specific date.
  - Displays statuses: Present, Late, Alpha, On Leave, and Belum Absen.
  - Automatically maps "Belum Absen" to `ON_LEAVE` if the user has an approved leave request on that date.
  - Includes a "Lihat Detail" modal that surfaces Check-In/Out selfies and clickable Google Maps links for GPS coordinates.
  - **Pagination added:** Capped at 10 items per page.
  - **Export Rekap Absensi:** Moved from a standalone page to an "Export Rekap" button inside the HRD Attendance Logs page.
  - **Rekap Flow:** HRD clicks Export, selects a Date Range (Defaults to 26th of last month to 25th of current month), and applies Store/Department filters. The app routes to `/hrd/rekap` passing these parameters to render a print-friendly A4 Landscape layout using native CSS (`@media print`).

### Phase 4: Leave & Overtime Approvals (Status: PARTIALLY COMPLETED)
- **Leave Requests (COMPLETED):**
  - Employees can submit requests via Server Action (`submitLeaveRequest`). Quota validation is enforced.
  - HRD can approve/reject via `/hrd/leave` using `approveLeaveRequest`.
  - Quotas (`Total`, `Used`, `Remaining`) dynamically update based on approved requests.
  - **Automated Quota Reset (Lazy Reset):** System seamlessly resets `leaveQuotaRemaining` to 12 upon the exact 1-year work anniversary without needing background cron jobs. System relies on `lastQuotaResetDate` during session initialization to ensure precision.
- **Calendar Integration (COMPLETED):**
  - `CalendarEvent` database model powers dynamic company events (Town Halls, Holidays).
  - HRD Calendar Manager (`/hrd/calendar`) fetches dynamic audiences (Departments, Stores, Shifts) directly from the database instead of hardcoded lists.
  - Employee Performance view (`/performance`) renders calendar dots for company events and auto-injects approved Izin/Cuti as "ON_LEAVE" pseudo-events.
  - **NEW:** Attendance logs automatically inject Leave Requests (Izin/Cuti) into the HRD Daily Log.
- **Overtime Requests (NOT STARTED):** Need to implement logic for submitting and approving overtime hours in the `/performance` module.


### Phase 5: Notifications & Automation (Status: IN PROGRESS)
- **Web Push (VAPID) (COMPLETED):** Ask for notification permissions, store subscriptions, and push alerts for Leave Approvals. VAPID keys are properly loaded from `.env`. The UI for subscribing/unsubscribing is available in the Employee Profile page.
- **Email (Resend):** Send critical email alerts to HRD for new requests.
- **Cron Jobs (Vercel Cron):** Setup `/api/cron/auto-checkout` to run at 23:59 to automatically check out users who forgot to clock out, marking them as `FORGOT_CHECKOUT` and generating an `AttentionFlag`.

---

## 5. UI/UX Guidelines for Agents
- **Icons:** Use `lucide-react` consistently.
- **NO EMOJIS:** Absolutely no emojis (🚀, 🎉, etc.) anywhere in the UI or codebase. This is a strict rule.
- **Date Pickers:** Always use the Shadcn UI `Calendar` & `Popover` (or `DatePickerWithRange`) for date selection. Do NOT use default HTML `<input type="date">`.
- **Time Format:** Always use **24-hour format** (HH:mm) for all time pickers and display logic.
- **Loading States & Visual Feedback:** Always use `useTransition` when calling Server Actions from buttons to provide immediate visual feedback (e.g., changing text to "Mengirim..." or "Memuat Data..." and showing a spinner). Furthermore, for actions that take time (like filtering or programmatic `router.push` with searchParams), ensure loading states are visible so the user knows the app is not stuck. If the global top loading bar (TopLoader) doesn't trigger automatically on `router.push`, explicitly manage local loading states on the interacting components.
- **Error Handling:** Use `toast.error()` (from `sonner`) for user-facing errors returned by Server Actions.
- **Design Language:** Use `GlassCard` wrapper for standard UI blocks to maintain the "glassmorphism" aesthetic.
- **Swipe-to-Sidebar:** The App layout uses a mobile swipe-to-open gesture for the sidebar (`e.touches`). Agents MUST ensure that horizontally scrolling elements (like `overflow-x-auto` tables, Radix Sliders, Modals) do not conflict by ignoring the swipe gesture if the event target is inside those elements (`e.target.closest(...)`).
