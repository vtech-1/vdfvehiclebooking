# VD GeoTag — Architecture & Design Knowledge Base

Reference doc for replicating this app's tech stack, structure, and UI/design
system in a new application (e.g. a vehicle booking app).

## 1. Tech Stack

- **Frontend**: Plain HTML + CSS + vanilla JavaScript (no framework, no build step).
- **Backend**: Google Apps Script (`.gs` files), deployed as a Web App.
- **Database**: Google Sheets (each "table" is a sheet tab with a header row).
- **Hosting**: Static files (`index.html`, `css/`, `js/`) can be hosted anywhere
  static (GitHub Pages, Apps Script HTML service, Netlify, etc.) — only the
  backend (`CONFIG.SCRIPT_URL`) needs to point at the deployed Apps Script Web App.
- **PWA**: `manifest.json` + `sw.js` make it installable on phones (add-to-home-screen).
- **Auth**: Custom 4-digit Employee ID + password, validated server-side in Apps
  Script against a `passwords` sheet. No third-party auth provider.

## 2. Project Structure

```
index.html              All "pages" live in one HTML file as <div class="page">
css/
  variables.css         Design tokens (colors, spacing) + CSS reset
  components.css        Buttons, cards, forms, modal, camera, toast, responsive
  login.css             Login + change-password screens
  admin.css             Admin dashboard: tabs, tables, stat cards, badges
js/                     Loaded in dependency order (see bottom of index.html)
  config.js             Constants: SCRIPT_URL, GPS settings, seed employee list
  state.js              One global STATE object — all mutable app state
  utils.js               Small helpers (hashing, date formatting, server clock)
  db.js                  IndexedDB/localStorage wrapper for offline record cache
  api.js                 All fetch() calls to the Apps Script backend
  auth.js                Login, session (localStorage), logout, role routing
  gps.js, camera.js, clock.js    Feature-specific modules
  attendance.js, report.js, complaints.js, inspections.js, service.js, serviceadmin.js, admin.js
                          One file per feature/role screen
  navigation.js           showPage() — single-page-app style page switching
  ui.js                   Toast messages, modal helpers, PWA install prompt
  events.js               ALL addEventListener calls, centralized in one place
  app.js                  Bootstraps everything on DOMContentLoaded
APP script/              Copy-paste source for the Apps Script backend project
  Code.gs                 doGet/doPost routers + shared role-check helpers
  Setup.gs                One-time sheet creation (setupSheets())
  user.gs                 Password mgmt, login validation, employee directory
  attendance.gs            Punch in/out logic
  report.gs                Field report submission
  complaints.gs             Ticket raise/update
  inspections.gs            Site inspection submission
manifest.json             PWA metadata
sw.js                      Service worker for offline caching
```

## 3. Design System (reuse as-is for brand consistency)

### Color tokens (`css/variables.css`)
```css
--primary:       #1a7a3c;   /* brand green */
--primary-dark:  #135c2d;
--primary-light: #e8f5ed;
--white:         #ffffff;
--gray-bg:       #f4f6f4;   /* page background */
--text-dark:     #1a2b1e;
--danger:        #c0392b;
--warning:       #e67e22;
--muted:         #666666;
--border:        #e0e0e0;
--radius:        12px;
--radius-sm:     8px;
```
Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

### Layout convention
- Everything sits inside `.container` — max-width 480px, centered, mimics a
  phone screen even on desktop. Only **admin-type dashboards** widen to
  1100px above 900px viewport width (`body.page-is-admin`); field/worker
  screens stay phone-width always.
- Each screen is a `<div class="page" id="page-X">`; `navigation.js`
  toggles `.active` to show/hide — a single-page app, no router/URL changes.

### Reusable components (all in `components.css`)
- `.header` — gradient green bar with logo + title + role-specific buttons.
- `.card` / `.card-title` — white rounded panel, uppercase muted title.
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger`,
  `.btn-small`, `.btn-block` — one button system for every screen.
- Form inputs: consistent padding/radius/focus-ring across `input`, `select`, `textarea`.
- `.modal` — centered overlay for detail views.
- `.toast-message` — bottom-center success/error snackbar.
- `.tab-bar` / `.admin-tab-btn` / `.admin-tab-panel` — tabbed dashboards.
- `.records-table` — striped header, hoverable rows, sticky header.
- `.badge-green/red/gray/blue/yellow` — status pills.
- Two-color ticket convention: **red card = work assigned to you (action
  needed)**, **blue card = your own submitted item (tracking only)** — used
  consistently for complaints; worth reusing for e.g. booking requests.

## 4. App Architecture Pattern

### Roles & routing
- Each employee has a 4-digit ID and a `role` (e.g. `supervisor`, `admin`,
  `service`, `serviceadmin`). After login, `goToRolePage()` in `auth.js`
  routes to the matching page based on `STATE.currentUser.role`.
- Role list lives in a Sheet tab (`supervisors`), not hardcoded — admin UI
  can add/edit/delete accounts, which write directly to the Sheet.

### Session handling
- `localStorage` key `vd_session` stores `{ id, name, role, token, expiry }`.
- Session duration: `CONFIG.SESSION_HOURS` (24h here).
- On every app load, `routeOnLoad()` checks localStorage session validity,
  then re-validates the role against the live backend (`refreshSessionRole()`)
  in case an admin changed it — avoids a stale "logged in as old role" bug.

### First-login / forced password change
- Default password = the employee's own ID.
- A `forceChange` boolean column drives a dedicated "Set New Password" page
  shown before the user can reach their role's dashboard.

### Backend request pattern (`api.js`)
- One `apiPost(action, payload)` and `apiGet(action, params)` wrapper.
- Every write is a `POST` with `{ action: 'xxx', ...fields }`, parsed
  server-side via `JSON.parse(e.postData.contents)` and routed through a
  `switch` in `doPost(e)`.
- Every read is a `GET` with `?action=xxx&...` routed through `doGet(e)`.
- **No Content-Type header on POST** — deliberate, avoids a CORS preflight
  against Apps Script (which doesn't support OPTIONS cleanly).
- Admin-gated endpoints require `adminId` in the payload/params; the backend
  re-validates role server-side (never trust the client-sent role).

### Google Sheets as DB conventions
- One sheet tab per "table" (e.g. `passwords`, `supervisors`, `attendance`,
  `reports`, `complaints`, `inspections`).
- Header row defined as a `_HEADERS` constant array; `_formatHeader()` sets it
  up once via `setupSheets()`.
- Row lookups are linear scans by matching column A (ID) — fine at this scale
  (hundreds/thousands of rows), but cached per-request via a simple
  `let _cache = null` module-level variable (`getEmployees()` pattern) to
  avoid re-reading the sheet many times within one request lifecycle.
- Default query windows (e.g. "last 2 days") are applied server-side when no
  explicit date range is given, to avoid ever returning/scanning a whole
  growing sheet on every page load.

### Offline-friendliness
- `db.js` + `state.js` cache records locally so forms still "work" without
  connectivity; `api.js` calls fail gracefully with `{ ok: false, reason }`
  rather than throwing, and calling code falls back to local-only behavior
  (e.g. local password check) when the network call fails.

## 5. How to Reuse This for a New App (e.g. Vehicle Booking)

1. Copy `css/variables.css`, `components.css` as-is (same brand colors/buttons/cards).
2. Copy `login.css` as-is for the login + change-password screens.
3. Keep the same `js/` module split (`config/state/utils/db/api/auth/navigation/ui/events/app`)
   and write new feature modules (e.g. `booking.js`, `fleet.js`) in place of
   `attendance.js`/`report.js`.
4. Keep the same Apps Script shape: one `Code.gs` with `doGet`/`doPost`
   routers + role-check helpers, one `.gs` file per feature, one Sheet tab
   per table, same employee-directory + password pattern for login.
5. Swap the field-report form fields for booking fields (vehicle, date/time,
   purpose, destination, approver) but keep the request/approval status
   convention (OPEN → IN_PROGRESS/APPROVED → CLOSED) and the red/blue ticket
   card pattern for "needs your action" vs "your own submission."
6. New roles (`employee`, `driver`, `admin`) slot into the same
   `role`-based routing in `auth.js`'s `goToRolePage()`.
