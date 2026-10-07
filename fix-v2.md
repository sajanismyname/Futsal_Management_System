# Futsal Management System — QA Review v2

## Full Repository Defect, Security, Data-Integrity & Regression Plan

**Repository:** `futsal_management.zip`  
**Scope:** Backend, frontend, models, routes, services, tests, configuration and documentation.  
**Files inventoried:** 103 application/config/test files, excluding dependency/generated directories.

> **QA methodology:** Static source review and cross-file flow tracing. A dependency installation was attempted for runtime validation but timed out in the QA environment. Therefore frontend build/lint and the full Jest suite are marked **UNVERIFIED**, not passed.

---

# Executive QA verdict

## Current status: NOT PRODUCTION READY

The project has a workable MERN architecture, but the current implementation contains critical security, payment, booking, tournament and lifecycle defects.

### Highest-risk findings

1. Backend CommonJS/ESM mismatch can prevent startup.
2. Real-looking service credentials are present in `.env`.
3. Payment verification does not verify payment ownership.
4. Khalti `pidx` is not bound to the stored payment.
5. Refund changes database state but does not actually perform a gateway refund.
6. Owner refund authorization does not verify court ownership.
7. Booking API does not fully validate date/time/operating-hours rules.
8. `getBooking()` allows any owner to view any booking by ID.
9. Tournament ownership/update rules are insufficient.
10. Socket.IO and REST CORS are overly permissive.
11. Tests import a server that starts listening and connects to MongoDB.
12. eSewa failure callback points to a frontend route that does not exist.
13. Knockout format is shown in the UI but backend always generates round-robin fixtures.
14. Tournament registration deadline is stored but not enforced.
15. Booking/admin/owner filters contain nonexistent status values.
16. `.env.example`, frontend lockfile and documented CI workflow are missing from the reviewed tree.

---

# Severity

| Priority | Meaning |
|---|---|
| P0 | Blocker / critical security or production failure |
| P1 | High-risk business/security defect |
| P2 | Medium functional/data/UX defect |
| P3 | Low-risk quality/maintainability issue |

---

# A. P0 — Critical blockers

## FMS-QA-001 — Backend CommonJS/ESM mismatch

**Files:** `futsal-backend/package.json`, `server.js`, `config/db.js`

`package.json` declares:

```json
"type": "module"
```

while the backend uses `require()` and `module.exports`. `config/db.js` additionally uses `import mongoose` and then `module.exports`.

### Fix

Keep CommonJS consistently:

- remove `"type": "module"`
- change `import mongoose from 'mongoose'` to `const mongoose = require('mongoose')`
- keep `require/module.exports` throughout the backend.

### Acceptance

- `npm start` works.
- `npm run dev` works.
- `/health` returns 200.
- Jest can import the app.

---

## FMS-QA-002 — Secrets committed in `.env`

**File:** `futsal-backend/.env`

The archive contains credentials/secrets for MongoDB, JWT, Cloudinary, SMTP, payment and SMS services.

### Required action

1. Immediately rotate all exposed credentials.
2. Remove `.env` from repository/history if tracked.
3. Add `futsal-backend/.env.example` and `futsal-frontend/.env.example`.
4. Add secret scanning to CI.
5. Never print or reproduce secret values.

### Acceptance

No real credential remains in tracked source/configuration.

---

## FMS-QA-003 — Payment verification lacks ownership authorization

**File:** `futsal-backend/controllers/paymentController.js`

`verifyPayment()` loads `paymentId` but does not verify:

```text
payment.userId === req.user._id
```

### Fix

Reject unless the authenticated user owns the payment. Use a separate explicit admin flow if administrative verification is required.

### Acceptance

User A cannot verify User B's payment.

---

## FMS-QA-004 — Khalti `pidx` is not bound to stored payment

The server accepts client-supplied `pidx` and sends it to Khalti lookup without checking it matches `payment.pidx`.

### Fix

Require:

```js
if (!pidx || pidx !== payment.pidx) {
  return res.status(400).json({ success: false, message: 'Invalid payment transaction' });
}
```

Also verify provider amount and purchase-order/booking identity.

---

## FMS-QA-005 — Refund is database-only, not a real refund

`initiateRefund()` only changes:

```text
payment.status = refunded
booking.paymentStatus = refunded
booking.status = cancelled
```

No Khalti/eSewa refund is performed.

### Fix

Implement provider-specific refund processing. If automatic refund is unavailable, use explicit states such as:

```text
refund_pending
refund_completed
refund_failed
```

Never represent a payment as refunded before the actual refund is confirmed or a documented manual-refund process is completed.

---

## FMS-QA-006 — Owner refund authorization incomplete

Route allows `owner/admin`, but controller does not verify that the owner owns the court associated with the booking.

### Fix

For owners require:

```text
booking.courtId.ownerId === req.user._id
```

---

## FMS-QA-007 — REST and Socket.IO CORS overly permissive

Both use:

```js
origin: true,
credentials: true
```

### Fix

Allow only configured `FRONTEND_URL` values for both HTTP and Socket.IO.

---

# B. P1 — Authentication/security

## FMS-QA-008 — Tests import a server that starts listening

`server.js` calls `app.listen()` during module import. Tests do:

```js
const app = require('../server');
```

### Impact

Tests can start a real server, open port 5000 and create open handles.

### Fix

Split:

```text
app.js  -> Express app only
server.js -> DB + HTTP + cron + sockets
```

Tests import `app.js`.

---

## FMS-QA-009 — DB retry loop can interfere with tests

`config/db.js` retries every five seconds after connection failure outside production.

### Fix

Make connection lifecycle explicit and disable hidden retry loops in test mode.

---

## FMS-QA-010 — Verification token is not cleared after successful verification

After verification, token fields remain stored.

### Fix

Clear:

```text
emailVerificationToken
emailVerificationExpires
```

after successful verification.

---

## FMS-QA-011 — Verification token is stored plaintext

Recommended security improvement: hash verification tokens before storing, then compare hashes on verification.

---

## FMS-QA-012 — Resend verification leaks account state

Unknown email gets a generic response, but already-verified email receives a different response.

### Fix

Return the same generic response for all email states to reduce enumeration.

---

## FMS-QA-013 — Profile update lacks route-level validation

Controller whitelists fields, but explicit validators should be added for name, phone and boolean notification fields.

---

## FMS-QA-014 — Password change does not invalidate existing JWT sessions

A stolen token can remain valid after password change.

### Fix

Implement `tokenVersion`/session revocation or another explicit token invalidation strategy.

---

# C. P1 — Booking/data integrity

## FMS-QA-015 — Past booking dates accepted

`isISO8601()` checks format, not whether date is in the future/current booking day.

### Fix

Reject dates before the current application/business date.

---

## FMS-QA-016 — `startTime >= endTime` is not rejected

Negative/zero duration can produce invalid totals.

### Fix

Convert times to minutes and require:

```text
startMinutes < endMinutes
```

---

## FMS-QA-017 — Booking can occur outside court operating hours

`createBooking()` does not enforce the court's `operatingHours`.

### Fix

Reject bookings before opening or after closing.

---

## FMS-QA-018 — Arbitrary minute values accepted

Examples such as `06:17-07:43` pass the regex.

### Fix

Define and enforce slot granularity, e.g. 60-minute slots.

---

## FMS-QA-019 — Invalid hours/minutes pass the regex

`99:99` matches `^\d{2}:\d{2}$`.

### Fix

Validate hour 0–23 and minute 0–59.

---

## FMS-QA-020 — Available-slot endpoint does not validate date

Missing/invalid dates can reach `new Date(date)`.

### Fix

Return 400 for missing/invalid date.

---

## FMS-QA-021 — Available slots can be requested for inactive/unapproved courts

Public slot endpoint checks existence but not visibility state.

### Fix

Require active + approved for public customers.

---

## FMS-QA-022 — Any owner can view any booking

`getBooking()` accepts any owner because the authorization check only excludes non-owners.

### Fix

Owner access must require:

```text
booking.courtId.ownerId === req.user._id
```

Customer access must require booking ownership. Admin is global.

---

## FMS-QA-023 — Paid cancellation does not initiate refund workflow

A confirmed/paid booking can be cancelled without updating its payment/refund state.

### Fix

Define policy, e.g.:

```text
unpaid -> cancel
paid -> refund workflow -> cancel
```

with a configurable cancellation cutoff.

---

## FMS-QA-024 — Cancellation email promises refund regardless of actual state

The email says a refund will be processed, but cancellation itself does not process one.

### Fix

Only promise a refund after refund workflow begins.

---

## FMS-QA-025 — Booking index does not prevent overlaps

The compound index prevents exact duplicates but not:

```text
06:00-08:00
07:00-09:00
```

### Fix

Keep overlap validation and make reservation concurrency-safe, preferably using atomic slot documents/unique indexes.

---

## FMS-QA-026 — Booking transaction requires replica-set support

`startSession/startTransaction` requires MongoDB transaction support.

### Fix

Document Atlas/replica-set requirement or redesign reservation using atomic operations.

---

## FMS-QA-027 — New booking uses wrong notification type

A pending-payment booking creates a `booking_confirmed` notification.

### Fix

Use `booking_created`/`booking_pending` and reserve `booking_confirmed` for successful payment.

---

# D. P1 — Payment integrity

## FMS-QA-028 — Provider amount must match booking/payment amount

For every gateway verification:

```text
provider amount == payment.amount == booking.totalAmount
```

must be checked server-side.

---

## FMS-QA-029 — Khalti purchase order must match booking

Validate provider `purchase_order_id` against the stored booking ID.

---

## FMS-QA-030 — eSewa `refId` is not sufficiently provider-bound

The API accepts client `refId` and may store it directly.

### Fix

Use the provider verification response as the authoritative transaction identity.

---

## FMS-QA-031 — Payment verification is not fully idempotent

Concurrent requests can both observe `initiated` and perform completion side effects.

### Fix

Use an atomic `initiated -> completed` transition and only send notifications/emails after the winning transition.

---

## FMS-QA-032 — Duplicate active payments can be created

`initiatePayment()` does not reuse or reject an existing active payment for the same booking.

### Fix

Allow one active payment per booking or explicitly manage retries.

---

## FMS-QA-033 — Mock payment can be enabled outside development/test

### Fix

Production must hard-fail or force:

```env
MOCK_PAYMENT=false
```

---

## FMS-QA-034 — Refund is not idempotent

A completed payment can be changed to refunded without guarding against an existing refund.

### Fix

Reject duplicate refund attempts.

---

## FMS-QA-035 — Refund reason says admin even for owner

Current default text is inaccurate for owner-initiated refunds.

### Fix

Generate actor-specific audit text.

---

## FMS-QA-036 — Generic payment history is too broad for owners

Non-customers currently get all payments.

### Fix

Use explicit scopes:

```text
customer -> own payments
owner -> payments for own courts
admin -> platform-wide
```

---

# E. P1 — Tournament defects

## FMS-QA-037 — Tournament creation does not verify court ownership

An owner can submit another owner's `courtId`.

### Fix

For owners verify court owner, active state and approval.

---

## FMS-QA-038 — Knockout is advertised but not implemented

Frontend offers `knockout`, but backend always calls `generateRoundRobinFixtures()`.

### Fix

Implement knockout generation or remove/disable knockout in UI until implemented.

---

## FMS-QA-039 — Tournament status transition is logically wrong

UI labels:

```text
registration_open -> upcoming
```

as "Close Registration". That reopens registration rather than closing it.

### Fix

Add a real `registration_closed` state or define a correct state machine.

---

## FMS-QA-040 — Tournament update accepts arbitrary fields

Current spread update can mutate `ownerId`, `registeredTeams`, `fixtures` and other internal fields.

### Fix

Whitelist editable fields and manage internal fields through dedicated operations.

---

## FMS-QA-041 — Team duplicate check relies on string/ObjectId comparison

Current:

```js
tournament.registeredTeams.includes(teamId)
```

where request `teamId` is normally a string.

### Fix

Compare normalized string IDs or ObjectIds safely.

---

## FMS-QA-042 — Tournament registration capacity has a race condition

Two simultaneous registrations can both pass the capacity check.

### Fix

Use atomic `$addToSet` + capacity condition or a transaction.

---

## FMS-QA-043 — Registration deadline is ignored

`registrationDeadline` exists in the model/form but is not checked by `registerTeam()`.

### Fix

Reject registrations after the deadline.

---

## FMS-QA-044 — Tournament dates are not validated

No server-side check ensures:

```text
startDate < endDate
registrationDeadline < startDate
```

### Fix

Validate all date relationships.

---

## FMS-QA-045 — Fixture generation can be repeated

No explicit protection prevents overwriting existing fixtures.

### Fix

Reject if fixtures already exist unless explicit regeneration is supported.

---

## FMS-QA-046 — Fixture generation ignores format

Round-robin generation is called regardless of `format`.

### Fix

Dispatch to format-specific generators.

---

## FMS-QA-047 — Score update accepts invalid values

`Number(scoreA)`/`Number(scoreB)` can produce NaN/negative values.

### Fix

Require finite non-negative integers.

---

## FMS-QA-048 — Completed/scheduled fixture status transitions are not protected

Any fixture index can be marked completed repeatedly.

### Fix

Implement a fixture state machine and explicit score-correction policy.

---

# F. P1/P2 — Court management

## FMS-QA-049 — Court update accepts arbitrary fields

Current:

```js
const updates = { ...req.body };
```

### Fix

Whitelist owner-editable fields. Never permit owner-controlled `ownerId`, approval or internal flags.

---

## FMS-QA-050 — Every owner edit resets approval

Even harmless changes can make a court unavailable again.

### Fix

Define which changes require reapproval and only reset approval for those fields.

---

## FMS-QA-051 — Court deactivation ignores future confirmed bookings

### Fix

Block deactivation or cancel/notify/refund affected bookings according to business policy.

---

## FMS-QA-052 — Public court detail exposes inactive/unapproved courts

`getCourt()` does not apply the same visibility filters as `getCourts()`.

### Fix

Public lookup must require active + approved.

---

## FMS-QA-053 — Image deletion removes only DB reference

Cloudinary asset remains.

### Fix

Destroy the remote Cloudinary asset using its `publicId` and handle failures safely.

---

## FMS-QA-054 — Cloudinary `publicId` route parameter is fragile

Public IDs may contain path-like values.

### Fix

Use URL-safe encoding or a database image ID.

---

## FMS-QA-055 — Malformed JSON in multipart fields creates opaque errors

`JSON.parse(operatingHours)` and `JSON.parse(amenities)` are not wrapped with user-facing validation.

### Fix

Return clean HTTP 400 validation errors.

---

## FMS-QA-056 — Operating hours themselves are not validated

Model accepts invalid values such as `99:99` or close before open.

### Fix

Validate time range and `open < close`.

---

# G. P2 — Frontend payment/routing defects

## FMS-QA-057 — eSewa failure URL has no frontend route

Backend generates:

```text
/payment/failure
```

but `AppRouter.jsx` does not define it.

### Fix

Create `PaymentFailurePage` and route it.

---

## FMS-QA-058 — Payment callback payload shape is inconsistent

Frontend sends a nested `data` object while backend expects top-level provider identifiers.

### Fix

Use explicit provider-specific payloads.

---

## FMS-QA-059 — Khalti `pidx` is treated as internal payment ID

`PaymentSuccessPage` does:

```js
const paymentId = pidx || oid;
```

### Fix

Do not treat a gateway ID as MongoDB `Payment._id`. Resolve it safely using authenticated/internal payment state.

---

## FMS-QA-060 — Payment success state is lost on refresh

Mock success relies on `location.state`.

### Fix

Make confirmation refresh-safe using an internal payment/booking reference and server fetch.

---

## FMS-QA-061 — Payment success page trusts navigation state

A client-side navigation state can display success without rechecking current server state.

### Fix

Fetch and display authoritative server payment/booking status.

---

# H. P2 — Frontend booking defects

## FMS-QA-062 — Non-contiguous slots can become a continuous booking

Example:

```text
06:00 selected
08:00 selected
```

can be represented as `06:00-09:00`.

### Fix

Require contiguous selection or represent individual selected slots explicitly.

---

## FMS-QA-063 — Frontend amount is only a display estimate

Backend must remain authoritative for duration and price.

### Fix

Use server booking total before payment.

---

## FMS-QA-064 — Slot UI can become stale

Realtime updates help, but server-side booking validation must remain authoritative when another user books the slot.

### Fix

Handle 409 conflict cleanly and refresh availability.

---

# I. P2 — Admin/owner UI defects

## FMS-QA-065 — Admin payment filter contains nonexistent `pending`

Backend payment enum is:

```text
initiated, completed, failed, refunded
```

### Fix

Use `initiated`.

---

## FMS-QA-066 — Admin booking filter contains nonexistent `completed`

Backend booking enum is:

```text
pending, confirmed, cancelled, expired
```

### Fix

Use `expired`.

---

## FMS-QA-067 — Owner booking filter contains nonexistent `completed`

### Fix

Use `expired` or remove the filter.

---

## FMS-QA-068 — Status strings duplicated throughout frontend/backend

### Fix

Create canonical backend constants and documented frontend API status constants.

---

# J. P2 — Admin/security/data management

## FMS-QA-069 — Admin hard-delete can orphan application data

Deleting a user leaves bookings, payments, courts, teams, tournaments and notifications.

### Fix

Prefer soft-delete/deactivation. Preserve financial/audit history.

---

## FMS-QA-070 — Admin regex search does not escape user input

Search is inserted into MongoDB `$regex` directly.

### Fix

Escape regex metacharacters before constructing search patterns.

---

## FMS-QA-071 — Admin pagination is unbounded

Examples like `limit=999999` or negative page values are accepted.

### Fix

Normalize:

```text
page >= 1
1 <= limit <= 100
```

---

## FMS-QA-072 — Public pagination is also unbounded

Apply the same validation to courts, tournaments, bookings, notifications and payments.

---

# K. P2 — Notifications

## FMS-QA-073 — Mark-read returns success for nonexistent notification

`findOneAndUpdate()` can update zero records but API still returns success.

### Fix

Return 404 when notification does not exist for the authenticated user.

---

## FMS-QA-074 — Notification TTL deletes history after 30 days

Confirm this matches product retention requirements.

---

## FMS-QA-075 — SMTP `secure` is hardcoded

`secure: true` is used even if configured port is 587.

### Fix

Use correct SMTP transport configuration, e.g. 465 -> secure true, 587 -> STARTTLS/secure false.

---

## FMS-QA-076 — Notification logs expose PII

Email/phone values are written to logs.

### Fix

Avoid logging recipient PII in production.

---

# L. P2 — Cron/timezone

## FMS-QA-077 — Reminder date boundaries use UTC

The application is intended for Nepal users, but reminder calculations use UTC midnight.

### Fix

Use explicit `Asia/Kathmandu` business timezone.

---

## FMS-QA-078 — Cron schedule timezone is implicit

`0 8 * * *` should explicitly define its intended timezone.

### Fix

Configure `Asia/Kathmandu` if 8 AM Nepal time is required.

---

## FMS-QA-079 — Expiration socket events can emit stale booking objects

Database state is changed with `updateMany`, while owner socket receives old document objects.

### Fix

Emit refreshed documents or a minimal authoritative event payload.

---

# M. P2 — Socket.IO

## FMS-QA-080 — Anonymous users can join arbitrary tournament/court rooms

Anonymous sockets can emit `tournament:join` and `court:join` for arbitrary IDs.

### Fix

Explicitly define which rooms are public. Authenticate/authorize private rooms.

---

## FMS-QA-081 — Socket CORS has same origin weakness as REST

Apply the same allowlist.

---

## FMS-QA-082 — Existing socket sessions are not actively revoked after suspension

A user authenticated before suspension may retain an active socket.

### Improvement

Disconnect/invalidate sessions when suspension occurs if security requirements demand immediate revocation.

---

# N. P2 — Team/tournament missing functionality

## FMS-QA-083 — Team membership management is missing

`Team.members` exists but there is no API/UI for:

- add member
- remove member
- leave team
- transfer captain

If team membership is part of the product requirements, this is incomplete functionality.

---

## FMS-QA-084 — Team creation roles do not align with tournament registration roles

Team creation permits customer/owner/admin while tournament registration permits only customer.

### Fix

Align roles with requirements.

---

## FMS-QA-085 — Tournament entry fee is never collected

`entryFee` exists but registration does not create a tournament payment.

### Fix

Either implement entry-fee payment or clearly define it as informational/free registration.

---

## FMS-QA-086 — Prize pool is stored as free-form text

If monetary analytics are required, use a numeric field.

---

# O. P2 — Frontend auth/routing

## FMS-QA-087 — Unauthorized role redirects to `/`

`ProtectedRoute` hides authorization errors by redirecting to home.

### Fix

Create `UnauthorizedPage` or role-specific destination.

---

## FMS-QA-088 — Root auth loading renders blank screen

`RootRoute` returns `null` while auth is loading.

### Fix

Render the standard loading spinner/page.

---

## FMS-QA-089 — Unknown routes silently redirect to home

Current wildcard route uses `<Navigate to="/" />`.

### Fix

Create a real 404 page.

---

## FMS-QA-090 — Login ignores intended protected destination

ProtectedRoute stores `state.from`, but LoginPage navigates only by role.

### Fix

After login, safely restore the original route when present.

---

# P. P2 — Frontend validation

## FMS-QA-091 — Tournament end date lacks minimum start-date constraint

Frontend should set end date minimum to start date.

---

## FMS-QA-092 — Registration deadline lacks frontend constraints

It should normally be between today and tournament start.

Backend must enforce it regardless.

---

## FMS-QA-093 — Tournament venue is optional in UI

Confirm whether tournaments can be venue-less. If not, require an approved owner court.

---

# Q. P2 — Security hardening

## FMS-QA-094 — Upload validation trusts MIME type

`file.mimetype.startsWith('image/')` can be spoofed.

### Improvement

Use file-signature validation/image processing.

---

## FMS-QA-095 — JSON body limit is 10 MB

Reduce where possible because images are handled separately through multipart upload.

---

## FMS-QA-096 — Sensitive endpoints need stricter rate limits

Add endpoint-specific limits for:

- login
- registration
- verification resend
- password change
- payment initiation
- payment verification
- refunds

---

# R. P2 — Error handling

## FMS-QA-097 — Duplicate-key error exposes internal field names

Map schema fields to safe user-facing messages.

---

## FMS-QA-098 — Payment gateway errors are not normalized

Axios/provider failures should become safe application errors instead of leaking provider response details.

---

# S. P2 — Repository/configuration

## FMS-QA-099 — `.env.example` is documented but absent

README instructs users to copy `.env.example`, but the reviewed tree contains no example file.

### Fix

Add both backend/frontend examples with placeholders only.

---

## FMS-QA-100 — Frontend package lock is absent

Backend has `package-lock.json`, frontend does not.

### Fix

Generate and commit `futsal-frontend/package-lock.json` for reproducible installs.

---

## FMS-QA-101 — README references CI workflow that is absent

README documents `.github/workflows/ci.yml`, but it is not present in the reviewed tree.

### Fix

Add CI or correct README.

---

## FMS-QA-102 — README claims refunds are supported more strongly than implementation

Documentation should match the actual refund behavior after the refund architecture is fixed.

---

# T. P3 — Maintainability

## FMS-QA-103 — Status constants duplicated

Centralize booking/payment/tournament/court status definitions.

---

## FMS-QA-104 — Pagination validation duplicated

Create a shared pagination parser/helper.

---

## FMS-QA-105 — Ownership checks duplicated

Create reusable helpers such as:

```text
assertCourtOwner
assertBookingOwner
assertTournamentOwner
```

---

## FMS-QA-106 — Payment provider logic is too concentrated in one controller

Recommended structure:

```text
services/payment/
  khaltiService.js
  esewaService.js
  mockPaymentService.js
  paymentService.js
```

---

# U. Existing test coverage is insufficient

Current tests mainly cover authentication, password validation, fixture generation and standings.

Add integration tests for:

### Auth

- registration
- duplicate email
- invalid email/phone
- password policy
- verification expiry/reuse
- login
- suspension
- password change/token invalidation

### Courts

- create
- approval
- owner isolation
- ownerId tampering
- public visibility
- image deletion authorization

### Bookings

- valid booking
- past date
- invalid time
- operating hours
- overlap
- concurrency
- customer isolation
- owner isolation
- cancellation/refund

### Payments

- ownership
- pidx
- amount
- order ID
- duplicate verification
- duplicate initiation
- refund authorization
- duplicate refund
- gateway failures
- mock-payment production guard

### Tournaments

- court ownership
- date/deadline validation
- capacity
- duplicate team
- registration race
- round-robin
- knockout
- duplicate fixture generation
- score validation

### Notifications

- user isolation
- mark-read authorization
- nonexistent notification
- pagination

---

# V. Runtime verification — currently UNVERIFIED

Dependency installation was attempted but timed out, so do not claim these passed yet.

## Backend

```bash
cd futsal-backend
npm ci
npm test
npm run lint
npm start
```

Verify:

```text
GET /health -> HTTP 200
```

## Frontend

```bash
cd futsal-frontend
npm install
npm run lint
npm run build
```

## Manual smoke tests

- register customer
- verify email
- login
- browse courts
- open court
- select slots
- create booking
- pay
- verify payment
- view booking
- cancel booking
- register owner
- create court
- admin approval
- owner booking view
- create tournament
- create team
- register team
- generate fixtures
- update score
- standings
- notifications
- socket live updates
- logout
- protected routes
- 404 route
- payment failure route

---

# W. Recommended implementation order

## Phase 0 — Secrets

1. Rotate credentials.
2. Remove `.env`.
3. Add `.env.example` files.
4. Add secret scanning.

## Phase 1 — Startup

5. Fix CommonJS/ESM.
6. Split `app.js` and `server.js`.
7. Make DB/test lifecycle deterministic.
8. Verify backend startup.

## Phase 2 — Security/payment

9. Restrict CORS.
10. Fix payment ownership.
11. Validate Khalti pidx.
12. Validate provider amount/order.
13. Fix refund authorization.
14. Implement actual refund/provider workflow.
15. Disable mock payment in production.
16. Improve session/token invalidation.

## Phase 3 — Booking

17. Validate dates.
18. Validate times.
19. Validate operating hours.
20. Validate slot granularity.
21. Fix owner booking access.
22. Fix cancellation/refund rules.
23. Make reservation concurrency-safe.

## Phase 4 — Tournament

24. Verify court ownership.
25. Validate dates/deadlines.
26. Fix ObjectId comparison.
27. Make registration atomic.
28. Implement or disable knockout.
29. Fix status state machine.
30. Validate scores.
31. Prevent duplicate fixture generation.

## Phase 5 — Frontend

32. Fix payment callbacks.
33. Add payment failure route.
34. Make success confirmation refresh-safe.
35. Fix slot selection.
36. Fix filters.
37. Restore intended login destination.
38. Add loading screen.
39. Add 404/unauthorized pages.
40. Add form constraints.

## Phase 6 — Operations

41. Fix cron timezone.
42. Fix SMTP configuration.
43. Harden uploads.
44. Bound pagination.
45. Normalize gateway errors.
46. Add audit logging for admin/payment actions.

## Phase 7 — Tests

47. Add integration tests.
48. Add authorization tests.
49. Add payment tests.
50. Add booking concurrency tests.
51. Add tournament tests.
52. Run frontend lint/build.
53. Run backend tests.
54. Run full smoke test.

---

# X. Regression acceptance matrix

| ID | Scenario | Expected |
|---|---|---|
| AUTH-01 | Customer registration | 201 |
| AUTH-02 | Owner registration | 201 |
| AUTH-03 | Admin self-registration | rejected |
| AUTH-04 | Duplicate email | 400 |
| AUTH-05 | Unverified login | 403 |
| AUTH-06 | Suspended login | 403 |
| COURT-01 | Public inactive court | not exposed |
| COURT-02 | Public unapproved court | not exposed |
| COURT-03 | Owner edits own court | 200 |
| COURT-04 | Owner edits other court | 403 |
| COURT-05 | Owner changes ownerId | rejected |
| COURT-06 | Admin approval | 200 |
| BOOK-01 | Valid slot | 201 |
| BOOK-02 | Past date | 400 |
| BOOK-03 | Invalid time | 400 |
| BOOK-04 | Outside hours | 400 |
| BOOK-05 | Overlap | 409 |
| BOOK-06 | Concurrent overlap | only one succeeds |
| BOOK-07 | Customer reads own booking | 200 |
| BOOK-08 | Customer reads another booking | 403 |
| BOOK-09 | Owner reads own-court booking | 200 |
| BOOK-10 | Owner reads other-court booking | 403 |
| PAY-01 | Own payment initiate | success |
| PAY-02 | Other-user payment initiate | 403 |
| PAY-03 | Own payment verify | success |
| PAY-04 | Other-user payment verify | 403 |
| PAY-05 | Wrong pidx | 400 |
| PAY-06 | Wrong amount | rejected |
| PAY-07 | Duplicate verify | idempotent |
| PAY-08 | Owner refund own court | success |
| PAY-09 | Owner refund other court | 403 |
| PAY-10 | Fake DB-only refund | impossible |
| TOURN-01 | Own court | success |
| TOURN-02 | Other owner's court | 403 |
| TOURN-03 | Registration after deadline | 400 |
| TOURN-04 | Duplicate team | 400 |
| TOURN-05 | Capacity race | capacity not exceeded |
| TOURN-06 | Knockout | true knockout or feature removed |
| TOURN-07 | Invalid score | 400 |
| ADMIN-01 | Initiated payment filter | correct |
| ADMIN-02 | Expired booking filter | correct |
| SEC-01 | Unknown REST origin | rejected |
| SEC-02 | Unknown socket origin | rejected |
| SEC-03 | Production mock payment | disabled |
| ROUTE-01 | Unknown URL | 404 page |
| ROUTE-02 | Login after protected route | original route restored |
| PAY-ROUTE-01 | eSewa failure | failure page |

---

# Y. Definition of Done

- [ ] All P0 findings fixed.
- [ ] Exposed credentials rotated.
- [ ] No real secrets committed.
- [ ] Backend starts cleanly.
- [ ] Frontend builds successfully.
- [ ] Backend tests pass.
- [ ] Frontend lint passes.
- [ ] Payment ownership enforced.
- [ ] Provider verification server-authoritative.
- [ ] Refund state represents a real refund workflow.
- [ ] Booking concurrency safe.
- [ ] Booking date/time validation enforced.
- [ ] Owner booking authorization correct.
- [ ] Tournament ownership correct.
- [ ] Tournament status transitions correct.
- [ ] Knockout behavior matches UI.
- [ ] Admin/owner filters match backend enums.
- [ ] Payment callback routes exist.
- [ ] 404 and unauthorized handling exists.
- [ ] Socket permissions are intentional.
- [ ] Cron timezone explicit.
- [ ] Critical integration tests exist.

---

# Z. Master implementation prompt

Paste this into Cursor/Claude after backing up the project:

```text
Act as a senior full-stack engineer, security engineer, QA engineer, and database-integrity specialist.

You are fixing the Futsal Management System repository.

READ:
- fix-v2.md completely
- README.md
- all backend routes/controllers/models/middleware/services
- all frontend routes/pages/services/context
- all existing tests

GOAL:
Implement every confirmed P0/P1/P2 defect in fix-v2.md without breaking intended functionality.

NON-NEGOTIABLE RULES:
1. Inspect existing code before changing it.
2. Do not rewrite the entire project.
3. Preserve the React/Vite + Express/Mongoose architecture.
4. Keep the backend consistently CommonJS unless there is a compelling reason to migrate every backend file consistently.
5. Never output, copy, or recreate real credentials.
6. Never weaken authentication/authorization to make tests pass.
7. Server-side validation is authoritative.
8. Never trust client-controlled ownership, role, payment amount, payment status, provider transaction IDs, approval fields, fixtures, or registration state.
9. Use allowlists for update endpoints.
10. Add regression tests for every security/business-integrity fix.
11. Do not silently remove advertised functionality. Implement it or clearly disable the UI until implemented.
12. Never fake a successful test/build result.

PHASE 1 — STARTUP
- Resolve the CommonJS/ESM mismatch.
- Separate Express app creation from HTTP server startup.
- Tests must import app without opening a listener.
- Make MongoDB lifecycle deterministic.
- Prevent hidden DB retry loops during tests.

PHASE 2 — SECRETS
- Remove .env from tracked source.
- Add backend and frontend .env.example files with placeholders only.
- Assume current exposed credentials are compromised and must be rotated externally.

PHASE 3 — SECURITY/PAYMENTS
- Restrict REST and Socket.IO CORS to explicit FRONTEND_URL.
- Verify payment ownership.
- Verify stored Khalti pidx equals submitted pidx.
- Verify provider amount equals booking/payment amount.
- Verify provider order ID equals booking ID.
- Harden eSewa verification.
- Make payment completion atomic/idempotent.
- Prevent duplicate active payments.
- Restrict owner refunds to their own courts.
- Implement real provider refund behavior or a safe refund-pending/manual workflow.
- Disable mock payments in production.
- Improve session/token invalidation after password changes where appropriate.

PHASE 4 — BOOKINGS
- Reject past dates.
- Validate HH:MM ranges.
- Reject start >= end.
- Enforce operating hours.
- Enforce slot granularity.
- Keep server-side amount calculation authoritative.
- Prevent overlapping bookings under concurrency.
- Correct getBooking owner isolation.
- Implement cancellation/refund policy.
- Validate public court availability.

PHASE 5 — COURTS
- Public detail only exposes active + approved courts.
- Whitelist update fields.
- Prevent ownerId/approval tampering.
- Validate operating hours.
- Handle future bookings during deactivation.
- Delete Cloudinary assets when images are deleted.
- Handle malformed multipart JSON cleanly.

PHASE 6 — TOURNAMENTS
- Verify court ownership.
- Verify active/approved court.
- Validate start/end/deadline.
- Enforce registration deadline.
- Fix ObjectId comparison.
- Make max-team registration atomic.
- Prevent duplicate fixture generation.
- Implement knockout if advertised; otherwise remove/disable the option.
- Implement a correct tournament status state machine.
- Validate scores and fixture state transitions.
- Whitelist tournament update fields.
- Protect ownerId/registeredTeams/fixtures.

PHASE 7 — FRONTEND PAYMENT
- Fix Khalti callback mapping.
- Fix eSewa callback mapping.
- Do not treat pidx as MongoDB paymentId.
- Add PaymentFailurePage and route.
- Make success confirmation server-authoritative and refresh-safe.

PHASE 8 — FRONTEND
- Fix non-contiguous slot selection.
- Fix admin payment status filter.
- Fix admin booking status filter.
- Fix owner booking status filter.
- Restore intended destination after login.
- Show auth loading UI instead of blank screen.
- Add 404 and unauthorized pages.
- Add tournament date constraints.
- Keep frontend/backend status values synchronized.

PHASE 9 — OPERATIONS
- Fix cron timezone to the intended business timezone.
- Fix SMTP secure/port behavior.
- Avoid logging PII.
- Harden upload validation.
- Bound pagination.
- Normalize payment gateway errors.

PHASE 10 — TESTS
Add tests for:
- auth/role restrictions
- court ownership and field tampering
- booking date/time validation
- booking overlap/concurrency
- customer/owner booking isolation
- payment ownership
- pidx mismatch
- amount/order mismatch
- duplicate payment verification
- refund authorization/state
- tournament court ownership
- tournament deadline/capacity race
- round-robin and knockout
- score validation
- admin filters

PHASE 11 — VALIDATION
Run:

cd futsal-backend
npm ci
npm test
npm run lint

cd ../futsal-frontend
npm install
npm run lint
npm run build

If a command fails, diagnose and fix it where relevant, rerun it, and report the actual result. Never claim a command passed if it was not executed successfully.

FINAL REPORT:
1. List every changed file.
2. Map changes to QA IDs.
3. Summarize security fixes.
4. Summarize data-integrity fixes.
5. List new tests.
6. Report exact lint/test/build results.
7. Report remaining blockers.
8. Never include secret values.
```

---

# Final QA classification

## Must fix before production

```text
FMS-QA-001 through FMS-QA-007
FMS-QA-015 through FMS-QA-026
FMS-QA-028 through FMS-QA-033
FMS-QA-037 through FMS-QA-043
FMS-QA-049
FMS-QA-052
FMS-QA-057 through FMS-QA-061
FMS-QA-065 through FMS-QA-067
```

## Strongly recommended before final FYP/demo release

```text
FMS-QA-008 through FMS-QA-014
FMS-QA-027
FMS-QA-034 through FMS-QA-036
FMS-QA-044 through FMS-QA-048
FMS-QA-050 through FMS-QA-056
FMS-QA-062 through FMS-QA-064
FMS-QA-068 through FMS-QA-106
```

---

# QA conclusion

The project is structurally suitable for continued development, but it should **not yet be treated as production-ready**.

The most important implementation chain is:

```text
Secrets
  -> Backend startup
  -> Auth/authorization
  -> Payment verification
  -> Real refund workflow
  -> Booking integrity/concurrency
  -> Tournament integrity
  -> Frontend callback/routing fixes
  -> Regression tests
  -> Full lint/build/test/smoke validation
```
