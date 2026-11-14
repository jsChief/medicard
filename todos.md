# CardEase - Patient Cards Tracking App

## Suggested Screens

### Authentication
- [x] **Login Page** - Hospital staff login with email/password
- [x] **Register Page** - Hospital account creation
- [x] **Forgot Password** - Password reset flow
- [x] **Email Verification** - Verify hospital email

### Dashboard (Authenticated)
- [x] **Dashboard Home** - Overview stats, recent patients, quick actions
- [x] **Patient List** - Searchable, filterable table of all patient cards
- [x] **Patient Detail View** - Full patient card with medical history, medications, allergies
- [x] **Add Patient** - Form to create new patient card
- [x] **Edit Patient** - Form to update patient information

### Patient Card Management
- [x] **Patient Card Form** - Multi-step form (Personal Info, Medical History, Emergency Contacts, Insurance)
- [x] **Patient Search** - Advanced search with filters (name, DOB, MRN, condition, date range)
- [x] **Patient Import/Export** - CSV/Excel import/export functionality
- [ ] **Bulk Actions** - Archive, delete, export multiple patients

### Hospital Settings
- [ ] **Hospital Profile** - Edit hospital info, logo, address
- [ ] **Staff Management** - Invite/remove staff, assign roles (admin, doctor, nurse, receptionist)
- [ ] **Department Management** - Create/edit departments/wards
- [ ] **Audit Logs** - Track all patient data access/modifications

### Reports & Analytics
- [ ] **Patient Statistics** - Admissions, discharges, occupancy rates
- [ ] **Condition Reports** - Common diagnoses, trends
- [ ] **Staff Activity** - Who accessed and modified what

> **Note (blocker false positive, 2026-11-14):** EasyPrivacy's `/v1/vitals?`
> rule matches PostgREST's `/rest/v1/vitals?`, so uBlock/AdGuard/Brave cancel
> every `vitals` request with `net::ERR_BLOCKED_BY_CLIENT` and the server never
> sees it. `getStageTimings` now embeds `vitals`/`consultations`/orders in the
> `visits` query to avoid the path. Recording vitals (`recordVitals`) and
> `getVisitVitals` still hit `/rest/v1/vitals`, so whitelist the Supabase host
> in the blocker (`@@||<project-ref>.supabase.co^`) until the filter lists are
> fixed. Report the false positive at github.com/easylist/easylist/issues.

### UI Components Needed
- [x] Layout/Navigation (Sidebar, Header, Breadcrumbs)
- [x] Data Table with sorting, pagination, filters
- [x] Modal/Dialog system
- [x] Form components (Input, Select, DatePicker, MultiSelect)
- [x] Toast/Notification system
- [x] Loading states & Skeletons
- [x] Empty states
- [x] Confirmation dialogs

### Technical Setup
- [x] Routing setup (React Router)
- [x] State management (Context/Zustand/Redux)
- [x] API service layer
- [x] Authentication context & protected routes
- [x] Form validation (Zod + React Hook Form)
- [x] Theme/Styling system

---

# Feedback Round 2 — implementation plan

Source: `CardEase_test_feedback_2.txt`. Item numbers below match the feedback file.
`❓` marks a requirement that should be confirmed with the tester before building.

## At a glance

| # | Feedback | Type | Root cause / gap | Size |
|---|----------|------|------------------|------|
| 1 | Doctor cannot see the waiting list under My Queues | Feature | No doctor-facing "waiting" sub-queue; `VisitsQueuePage` filters one exact status at a time | S |
| 2 | Reopen consultation button does nothing | Bug | Reopen clears `visits.consult_ended_at`, but the `consultations` row still has `ended_at`, so the page re-renders the completed state | S |
| 3 | No need for a note at check-in | Change | Free-text note inputs on `CheckInPage` and `VerificationCard` | XS |
| 4 | Rename "Visit Queue" to "Check-Ins" | Copy change | Hard-coded label in the sidebar and several queue/detail strings | XS |
| 5 | Lab request button doesn't work + should be subject to payment | Bug + feature | Lab button is the same `TagInput` bug as #6; "payment" is not modelled anywhere yet (prescriptions only have HMO approval) | M–L |
| 6 | Error: "Add at least one test to the request" | Bug | `TagInput` only commits typed text on Enter/comma/suggestion-click; a click on the submit button leaves the array empty | S |

**Recommended order of work:** 6 (unblocks 5 testing) → 2 → 1 → 3 → 4 → 5 (payment part, needs a migration).

---

## 1. Doctor should see the waiting list under My Queues

### What exists today

- `DashboardLayout` has role-scoped `subQueues`: Awaiting Approval, Lab Worklist, Pharmacy, Ready for Check-out. A doctor sees Awaiting Approval and Ready for Check-out — **not** the patients waiting to be seen.
- `VisitsQueuePage` reads `?status=` and compares it to one exact `VisitStatus`.
- A patient "waiting for the doctor" is either `vitals` (vitals saved but not yet sent on) or `waiting-doctor` (sent to the doctor). The stats card already groups both under "Waiting for doctor" (`VisitsQueuePage` line ~117), so the new queue should use the same definition.

### Implementation

- [x] In `src/pages/visits/VisitsQueuePage.tsx`, widen the filter type:
  ```ts
  type QueueFilter = "All" | "waiting" | VisitStatus
  const STATUS_FILTERS: QueueFilter[] = ["All", "waiting", "checked-in", "vitals", ...]
  ```
- [x] Update the URL validator and the `useEffect` that re-applies `?status=` to accept `"waiting"`.
- [x] Update the `filtered` predicate:
  ```ts
  const matchesStatus =
    statusFilter === "All" ||
    (statusFilter === "waiting"
      ? v.status === "vitals" || v.status === "waiting-doctor"
      : v.status === statusFilter)
  ```
- [x] Label it "Waiting for doctor" in the dropdown (special-case before `VISIT_STATUS_LABELS[s]`, which only accepts real statuses).
- [x] In `src/components/layout/DashboardLayout.tsx`, add a sub-queue **first** for doctors (and admin/nurse):
  ```ts
  {
    name: "Waiting List",
    href: "/visits?status=waiting",
    icon: Stethoscope, // or Users / UserCheck
    roles: ["admin", "doctor", "nurse"],
  }
  ```
- [x] Keep the existing FCFS order (`orderBy: "queue"`, `checked_in_at` ascending) and the default `today` scope so the oldest patient is at the top.
- [ ] Add a "waiting since" signal: the table already shows `checkedInAt` relatively on desktop. Consider exposing it on mobile too, or highlighting rows waiting > 30 minutes (same pattern as the vitals critical-value flags).
- [ ] Optional: add an "In consultation" sub-queue (`?status=in-consult`) for doctors to see who they are currently seeing.
- [ ] If the hospital grows past the 300-visit page limit, add `statuses?: VisitStatus[]` to `queryVisits` and use `.in("status", statuses)` instead of client-side filtering.

### Acceptance

- Doctor logs in → **My Queues → Waiting List** lists every today's visit in `vitals` or `waiting-doctor`, oldest first.
- Count matches the "Waiting for doctor" stat card.
- Opening a row and pressing "Start consultation" still works.
- Other roles do not see the doctor's waiting list (unless explicitly added).

---

## 2. Reopen consultation button is not working

### Root cause

`ConsultTab` decides the UI from the consultation row, not the visit:

```ts
const consultation = consultations[0] ?? null
const isCompleted = !!consultation?.endedAt
```

The current reopen handler only calls:

```ts
await updateVisit(visit.id, { status: "in-consult", consultEndedAt: null })
```

`consultations.ended_at` is never cleared. On `refresh()`, `isCompleted` is still `true`, so the page immediately renders the completed card again. The write may succeed, but the button appears dead.

### Implementation

- [x] Add a dedicated helper in `src/lib/visits.ts` (keeps the two-table write in one place):
  ```ts
  export async function reopenConsultation(visitId: string): Promise<void> {
    const rows = throwIfError(
      await getSupabase().from("consultations").select("id").eq("visit_id", visitId),
    ) as Array<{ id: string }>

    if (rows.length > 0) {
      throwIfError(
        await getSupabase()
          .from("consultations")
          .update({ ended_at: null })
          .in("id", rows.map(r => r.id)),
      )
    }

    await updateVisit(visitId, { status: "in-consult", consultEndedAt: null })
  }
  ```
- [x] In `src/components/visits/ConsultTab.tsx`, replace the inline `updateVisit` callback with `reopenConsultation(visit.id)`.
- [x] Add feedback: `toast.success("Consultation reopened")`, clear `error` on success, keep the `isSaving` disable state.
- [x] Confirm `saveConsultation` re-stamps `ended_at: new Date()` when the doctor completes it again — it already does, and it updates the existing row rather than creating a duplicate.
- [x] Consider the order case: if lab/prescription orders already exist, a later order event runs `syncVisitStatus` and may move the visit out of `in-consult`. That is correct behaviour; note it in the code comment so it isn't "fixed" later.
- [ ] Optional hardening: only allow reopen when the current status is `ready-for-checkout` or `checked-out` (otherwise the consult stage is already open). Client-side guard is enough for now; there is no visit-status trigger in the DB.

### Acceptance

- Complete a consultation → "Reopen consultation" → the editable form returns with the saved summary, diagnosis, disposition and notes pre-filled.
- Completing again updates the same consultation record (no second row) and refreshes the visit status.
- No console/network error when reopening.

---

## 3. Remove the check-in note

### Assumption ❓

The tester is referring to the free-text note recorded at **check-in / plan confirmation** ("Note (optional)" on `CheckInPage`, "Note" on `VerificationCard`). The front desk already performs the check-in, so the field adds work without adding information.

If they actually meant the lab request's "Notes for the lab" (`OrdersTab`), the same removal pattern applies to that `Input`; confirm before deleting it, because it carries clinical instructions (fasting, priority, clinical question).

### Implementation

- [x] `src/pages/visits/CheckInPage.tsx`
  - Delete the `note` state, `setNote("")` in `selectPatient`, and the `Label`/`Input` block for `verification-note`.
  - Keep the existing default audit text in `recordVerification`:
    - HMO → `"HMO plan confirmed active at check-in"`
    - private → `"Private patient - card on record confirmed"`
  - Update the rejected-plan error copy that currently says "use manual confirmation with a note".
- [x] `src/components/visits/VerificationCard.tsx` (late HMO confirmation path)
  - Delete the `note` state, the "Note" `Input`, and `setNote("")`.
  - Record `note: "HMO plan confirmed active"` as the default.
- [x] Leave the `insurance_verifications.note` column and the `recordVerification` API intact. The column is still useful for a future HMO API/webhook and for audit rows created by other paths; the UI simply stops asking for it.
- [x] The audit trail already renders `v.note` only when present (`VerificationCard` and the visit timeline), so no display change is needed.
- [x] Do **not** remove the clinical notes that serve a real purpose: consultation summary/next-provider notes, vitals notes, lab notes, rejection reasons. Flag those separately if the tester wants them gone.

### Acceptance

- Check-in confirm step has no note field.
- Check-in still records a verification with a sensible system note.
- Late HMO confirmation from the visit Overview tab has no note field and still works.

---

## 4. Rename "Visit Queue" to "Check-Ins"

The name appears in more places than the sidebar. Keep the route as `/visits` to avoid breaking deep links, notification links and the role sub-queue query strings.

### Copy changes

- [x] `src/components/layout/DashboardLayout.tsx`
  - `baseNavigation`: `{ name: "Visit Queue" }` → `{ name: "Check-Ins" }`.
  - The top-bar title and `SearchDialog` derive from this list, so they update automatically.
- [x] `src/pages/visits/VisitsQueuePage.tsx`
  - Card header: `"Today's visit queue"` → `"Today's check-ins"`, `"Visit history"` → `"Check-in history"`.
  - Error state: `"Could not load the visit queue"` → `"Could not load check-ins"`.
  - Error description: `"fetch the visit queue"` → `"fetch check-ins"`.
  - Empty state and helper copy: refer to "check-ins" instead of "the queue" where it reads naturally.
- [x] `src/pages/visits/VisitDetailPage.tsx`
  - Back link `"Visit queue"` → `"Check-Ins"`.
  - Empty-state action `"Back to visit queue"` → `"Back to check-ins"`.
- [x] `src/components/dashboard/TodayVisitQueue.tsx`
  - Title `"Today's visits"` → `"Today's check-ins"`.
- [x] `src/components/dashboard/VisitFlowPanel.tsx`
  - The small action button label `"Queue"` → `"Check-Ins"`.
- [x] Leave "My Queues" as the role group heading (the tester uses that phrase) and leave the per-stage sub-queue names alone except where they say "queue".
- [x] Run `rg -n "Visit Queue|visit queue|Visit queue" src` afterwards to confirm nothing is left.

### Optional route alias

- [x] Add `<Route path="/check-ins" element={<Navigate to="/visits" replace />} />` in `src/App.tsx` if the rename should be reflected in the URL too. This keeps old bookmarks working.
- [ ] If the route itself is renamed, update every `/visits` reference: `navigate()` calls, `Notifications` links, `subQueues.href`, `activeHref` matching, and notification `link` values written by `ConsultTab`, `OrdersTab`, `VitalsTab`, `CheckOutTab`.

### Acceptance

- Sidebar, top bar, breadcrumb/back link, queue header, dashboard widget and error states all read "Check-Ins" / "check-ins".
- `/visits`, `?status=...` filters, notification deep links and dashboard "View all" still work.

---

## 5 & 6. Lab request button fails + lab requests should be subject to payment

These two feedback items are the same report: the tester never got a lab order to save, then asked for the payment behaviour in the same breath.

### 6. Root cause of the error

`TagInput` in `src/components/ui/MultiSelect.tsx` only commits its text in `handleAddTag()`, which runs on:

- `Enter` / `,` keydown
- clicking a suggestion
- (not on blur)

`OrdersTab.handleCreateLab` validates `tests.length === 0` and shows **"Add at least one test to the request."** So a tester who types `FBC` and clicks **Send lab request** submits with an empty array. The same component is used for diagnosis tags, checkout medications and pending tasks, so they all share the bug.

### Fix

- [x] In `TagInput`, commit pending text on blur:
  ```tsx
  onBlur={() => {
    handleAddTag()
    setTimeout(() => setShowSuggestions(false), 200)
  }}
  ```
  The 200 ms delay keeps a click on a suggestion working (suggestion buttons already call `onMouseDown={e => e.preventDefault()}`, so the input keeps focus).
- [x] Add a deterministic flush for forms. Convert `TagInput` to `forwardRef` with:
  ```ts
  export interface TagInputHandle {
    /** Commits any typed-but-not-added text and returns the resulting tags. */
    flush: () => string[]
  }
  ```
  Then in `OrdersTab.handleCreateLab`:
  ```ts
  const flushed = labTestsRef.current?.flush() ?? tests
  if (flushed.length === 0) { setError("Add at least one test..."); return }
  // use `flushed` in createLabOrder and when resetting the form
  ```
  This avoids relying on React flushing the blur state before the click handler reads `tests`.
- [x] Add a small visible **Add** button inside the `TagInput` (calls `handleAddTag`) so the interaction is discoverable without pressing Enter.
- [x] Add helper text under the tests field: "Type a test and press Enter (or click Add)."
- [x] Fix the suggestion dropdown positioning while here: `TagInput` renders it with `absolute` but its wrapper is not `relative`; add `relative` to the wrapper so suggestions do not anchor to the page.
- [ ] Add a regression check: type one test, click **Send lab request** without pressing Enter → order is created and the tag input clears.

### 5. Payment gate for lab requests (and prescriptions)

Current state: orders only have a **clinical approval** gate.

- `apply_order_payer_status` forces HMO inserts to `pending-approval` and private inserts to `approved`.
- `enforce_order_status_authority` lets only `hmo`/`admin` approve or reject.
- There is **no payment/charge model** anywhere in the schema or UI. Prescriptions are not payment-gated either — they only go through the same approval flow. So "just like you did for prescriptions" currently means "HMO approval", not "money collected".

- [x] **Intent confirmed:** full billing gate for lab requests **and** prescriptions. HMO orders are `covered` (approval still applies), private orders stay `unpaid` until reception records payment or an admin waives it, and external-pharmacy prescriptions are `waived`.
  - Rejected alternatives: HMO-approval-only (the DB already does that; only the `TagInput` bug would remain) and billing lab orders only.

#### Billing gate design

Keep payment separate from `order_status` (`order_status` already encodes clinical approval and has transition guards; mixing billing into it would break `deriveVisitStatus` and the approval trigger).

- [x] New migration `supabase/migrations/20260102001200_order_payments.sql`:
  ```sql
  create type public.payment_status as enum ('unpaid', 'paid', 'covered', 'waived');

  alter table public.lab_orders
    add column payment_status public.payment_status not null default 'unpaid',
    add column amount numeric(12,2),
    add column payment_reference text not null default '',
    add column paid_at timestamptz,
    add column paid_by uuid references auth.users(id),
    add column paid_by_name text not null default '',
    add column waiver_reason text not null default '';

  -- same columns on public.prescriptions
  ```
  Add indexes on `(hospital_id, payment_status)` for both tables.
- [x] Insert trigger `apply_order_payment_defaults()`:
  - HMO visit → `payment_status = 'covered'` (the plan covers it; the existing approval gate still applies).
  - Private visit → `payment_status = 'unpaid'`.
  - Destination `external` prescription → `payment_status = 'waived'` with `waiver_reason = 'External pharmacy'` (the hospital does not collect).
- [x] Update trigger `enforce_order_payment_gate()` (`before update of status`):
  - Block `fulfilled` / `dispensed` unless `payment_status` is `paid`, `covered` or `waived`.
  - Raise a clear error: `"This request has not been paid for. Reception must record payment or the plan must cover it before it can be fulfilled."`
- [x] Record-payment path:
  - Prefer one RPC, e.g. `record_order_payment(p_kind text, p_id uuid, p_amount numeric, p_reference text, p_waive boolean, p_reason text)` with a role check (`admin`, `receptionist`; waive limited to `admin`). This keeps the multi-column update atomic and avoids exposing payment columns to arbitrary updates.
  - Or, if using a normal update, add a `before update` role guard on the payment columns.
- [x] `src/lib/visits.ts`:
  - Add `PaymentStatus` type.
  - Add `paymentStatus`, `amount`, `paymentReference`, `paidAt`, `paidByName`, `waiverReason` to `LabOrder` and `Prescription`, plus their row interfaces, mappers and `*_COLUMNS` strings.
  - Add `recordOrderPayment(kind, id, input)` and `waiveOrderPayment(kind, id, reason)`.
- [x] `src/lib/permissions.ts`:
  - `canCollectPayments(role)` → `admin`, `receptionist`.
  - `canWaivePayments(role)` → `admin`.
- [x] `src/components/visits/OrdersTab.tsx`:
  - Show a payment badge on every `OrderCard`: **Unpaid** (danger), **Paid** (success), **Covered by HMO** (primary), **Waived** (secondary).
  - Show amount/reference/time/who when paid.
  - Add **Record payment** (private + unpaid, receptionist/admin): dialog with amount, method/reference and an optional note. Add **Waive** (admin only) with a mandatory reason.
  - Disable **Upload result & fulfil** (lab) and **Dispense** (pharmacy) while `payment_status === 'unpaid'`, with an inline explanation instead of a silent disabled button. For HMO the existing "waiting for approval" message stays primary; `covered` only satisfies the money gate, not the approval gate.
  - Keep the existing approve/reject controls unchanged.
- [x] Notifications:
  - On a private order insert → notify `receptionist`/`admin` "Payment needed for <patient>".
  - On payment recorded → notify `lab_technician`/`pharmacist`/`admin` "Ready for fulfilment".
  - Keep HMO approval notifications as they are; once approved, a `covered` order is immediately fulfilable.
- [x] Receptionist worklist (recommended):
  - Add a **Pending payments** sub-queue for `admin`/`receptionist`.
  - Because `visits.status` does not encode payment, either:
    - add `?payment=unpaid` support to `VisitsQueuePage` (fetch today's lab orders + prescriptions for the hospital, collect the visit ids with `payment_status = 'unpaid'`, then filter the visit list), or
    - add a small standalone `/payments` page listing unpaid orders across visits (patient, item, amount, "Take payment"), which reads better than stretching the visit queue.
  - Add a fifth stat card "Awaiting payment" if the worklist lives on the queue page.
- [x] Check-out interaction:
  - Leave `CheckOutTab`'s blockers as they are (pending/approved orders already block check-out). Once payment gating exists, an unpaid order is `approved` but not fulfilable, so it still blocks check-out — which is the desired behaviour.
  - If the hospital wants to allow check-out with unpaid bills, add a separate "Check out with outstanding payment" permission rather than silently dropping the block.
- [ ] Optional: a `service_prices` table so the payment dialog can prefill the amount from the selected tests/medications. Not required for the first pass; free-entry amount is enough.

### Acceptance

- Typing a test and clicking **Send lab request** creates the order (no "Add at least one test" error).
- Private lab order: shows **Unpaid**; reception records payment; lab can then upload a result/mark fulfilled. Fulfil is blocked before payment.
- HMO lab order: shows **Covered by HMO** + **Pending approval**; after HMO approval the lab can fulfil. Approval cannot be bypassed by recording payment.
- Same behaviour for prescriptions (dispense blocked until settled).
- External pharmacy prescriptions are marked waived/external and do not block on payment.
- All four tag-input surfaces (lab tests, diagnosis, checkout medications, pending tasks) commit text on blur.

---

## Suggested implementation sequence

1. **#6 `TagInput` fix** — smallest change, unblocks manual testing of the whole orders tab.
2. **#2 Reopen consultation** — one helper plus a button rewrite.
3. **#1 Waiting List queue** — filter sentinel + sidebar entry.
4. **#3 Remove check-in notes** — copy/form cleanup.
5. **#4 Rename to Check-Ins** — copy sweep, then grep for leftovers.
6. **#5 Payment gate** — migration first, then types/mappers, permissions, UI, notifications, worklist. Do this last because it touches the order lifecycle and should be tested with the working lab flow.

## Verification checklist

- [x] `npm run build` passes. `npm run lint` still reports only pre-existing `react-refresh`/hook issues in unrelated files; the changed files add no new lint errors.
- [ ] Manual role pass: admin, doctor, nurse, receptionist, hmo, lab_technician, pharmacist.
- [ ] Doctor sees the Waiting List; other roles do not.
- [ ] Reopen → edit → complete works twice in a row.
- [ ] Check-in flow completes with no note field.
- [x] No "Visit Queue" strings remain (`rg -n "Visit Queue|visit queue" src`).
- [ ] Lab request created by typing + clicking (not pressing Enter).
- [ ] Payment gate blocks fulfilment for private orders and does not block covered HMO orders.
- [ ] Apply the new migration with `supabase db push` before testing the payment UI; note the existing `visit_flow` migration must already be applied.

---

## Role → page access

`PAGE_ACCESS` in `src/lib/permissions.ts` is the single source of truth: `App.tsx`
passes the lists to `ProtectedRoute`, and `DashboardLayout` filters the sidebar
with the same data. Dashboard and account screens stay open to every role so the
redirect target (`/dashboard`) is always valid.

| Page | admin | doctor | nurse | receptionist | lab_technician | pharmacist | hmo |
|---|---|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Check-Ins / visit detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Patients (list/new/detail/edit) | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Archive | ✅ | ✅ | — | ✅ | — | — | — |
| Active Checkouts | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Location Matrix | ✅ | ✅ | ✅ | ✅ | — | — | — |
| Reports | ✅ | ✅ | — | — | — | — | — |
| Settings / Profile / Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Team / Organization / Audit | ✅ | — | — | — | — | — | — |

- [x] Route guards use `PAGE_ACCESS` (direct URLs redirect to `/dashboard`).
- [x] Sidebar and Ctrl-K page search only list pages the role may open.
- [x] Dashboard metric/quick-action links are hidden when the destination is restricted.
- [x] Visit detail hides the patient-card link for lab/pharmacy/HMO.
- [ ] Manual role pass: open each role and confirm the sidebar matches the table above and a restricted URL redirects to `/dashboard`.

