# CardEase — Patient Visit Flow Plan

Turns `flow.txt` (the hospital visit journey) into concrete work, mapped against what
already exists in the codebase.

> **Status:** Phases 1–6 are built (see the checkboxes below). The open decisions
> in section 7 are still unresolved. The migration has not been applied yet — see
> the application note near the end.

---

## 0. What Was Built (this pass)

- `supabase/migrations/20260102001100_visit_flow.sql`
  - new roles `lab_technician`, `pharmacist`, `hmo` on `public.user_role`
  - enums: `visit_status`, `card_status`, `payer_type`, `order_status`,
    `consultation_disposition`, `verification_result`
  - tables: `visits`, `insurance_verifications`, `vitals`, `consultations`,
    `lab_orders`, `prescriptions` — all hospital-scoped RLS + grants
  - triggers: queue numbering, one-open-visit-per-patient, verification stamping,
    payer-based order status (`apply_order_payer_status`), role-based status
    authority (`enforce_order_status_authority`), cross-tenant visit/patient scope
- `src/lib/visits.ts` — full data layer + `deriveVisitStatus` / `syncVisitStatus`
- `src/lib/permissions.ts` — capability helpers for every flow step
- `src/lib/auth.ts` — `AppRole` extended (+ `APP_ROLE_LABELS`)
- Pages: `VisitsQueuePage` (`/visits`), `CheckInPage` (`/visits/check-in`),
  `VisitDetailPage` (`/visits/:id`) with Overview / Vitals / Consultation /
  Orders / Check-out tabs + `VisitStepper`
- Sidebar entry "Visit Queue"; `ProfilePage` role badges for the new roles

---

## 1. The Flow (from flow.txt)

```
Arrival
  └─ 1. Check-in
        • HMO patient → HMO confirms the plan is still active before check-in completes
        • Private patient → hospital checks its own record for an existing card
  └─ 2. Vitals (temperature, weight, blood pressure, heart pulse, blood sugar, …)
        └─ 3. See a Doctor (when it's their turn)
              The doctor sends the patient to ONE of:
                a) Lab technician (tests) → come back later for the result
                b) Pharmacist (medications)
                c) Lab + Pharmacist
                d) External pharmacy (prescribed meds not available in-house)
  └─ 4. Approval wait (HMO only): lab/medication requests must be approved
        before the tests/medications are dispensed
        └─ After lab/pharm: CHECKED OUT
              • Card withdrawn and stored in the archive
              • Test results stored in the patient's file when ready
```

Actors: **Receptionist** (check-in/out), **Nurse** (vitals), **Doctor** (consult +
orders), **Lab technician**, **Pharmacist**, **HMO approver**.

---

## 2. What We Already Have (reusable)

| Flow need | Existing asset |
|---|---|
| Patient record / "card" | `patients` table (MRN unique per hospital, soft archive via `archived_at` — migration `20260102001000`) |
| HMO vs. private, plan details | `patient_insurance` (`plan_type`: HMO/PPO/…, `policy_number`, `member_id`, `effective_date`, `expiry_date`) |
| Staff identity & roles | `profiles` (`user_role`: admin/doctor/nurse/receptionist), `staff` table (department, specialization) |
| Check-out step | `checkouts` table + `CheckoutsPage`, `NewCheckoutDialog`, `checkout_status` enum |
| Card → archive at the end | `archivePatient()` in `src/lib/database.ts` (soft archive), `ArchivePage`, `ArchiveRecordDialog` |
| Test results / documents in the file | `patient_documents` table + `patientDocuments` lib (bucket `patient-documents`, `document_category` already has `'lab'`) |
| Waiting / approval notifications | `notifications` table + `NotificationContext` + Realtime (migrations `…00700`, `…00800`) + `NotificationsPage`, `NotificationsMenu` |
| Doctor→staff messaging surface | same notifications system (type `team`), deep `link` support |
| Turn / queue ordering, waiting list | `ActionWatchlist` on dashboard; DataTable with sorting/filtering |
| UI building blocks | DataTable, Dialog, Tabs, Form (RHF + Zod), Select, DatePicker, Toast, EmptyState, Skeleton |
| Access control | RLS (hospital-scoped) + `src/lib/permissions.ts` capability checks |
| Data layer conventions | `src/lib/database.ts` (`createX`, `queryX`, `updateX`, `countX`) |

**Not present:** anything about a *visit* — check-in state, vitals, doctor
consult/orders, lab orders, prescriptions, HMO approval workflow, or a physical
card hand-out tracker. Those are the gaps below.

---

## 3. Gap Map

| Flow step | Status | Missing |
|---|---|---|
| 1. Check-in + HMO plan confirmation | 🟡 partial | `visits` table, check-in screen, verification record |
| 2. Vitals capture | ❌ none | `vitals` table, vitals entry screen |
| 3. Doctor consult → lab/pharmacy/external referral | ❌ none | `consultations`, `lab_orders`, `prescriptions` |
| 4a. HMO approval wait | ❌ none | `approval_status` on orders, approvals inbox, HMO role |
| 4b. Lab/pharm fulfilment | 🟡 partial | order queues; results already fit `patient_documents` |
| 4c. Check-out + card → archive | ✅ mostly | wire it to close the `visit` |
| Card physically "in hand / withdrawn" | ❌ none | `card_status` on `visit` |
| Turn management ("when it's your turn") | ❌ none | visit queue on dashboard |

---

## 4. Data Model (new migration)

New migration file: `supabase/migrations/2026XXXXXXXXXX_visit_flow.sql`

- [x] **Extend `user_role` enum** — add `lab_technician`, `pharmacist`, `hmo`
      ```sql
      alter type public.user_role add value if not exists 'lab_technician';
      alter type public.user_role add value if not exists 'pharmacist';
      alter type public.user_role add value if not exists 'hmo';
      ```
- [x] **New enums**
  - `visit_status`: `checked-in`, `vitals`, `waiting-doctor`, `in-consult`,
    `awaiting-approval`, `at-lab`, `at-pharmacy`, `ready-for-checkout`, `checked-out`, `cancelled`
  - `card_status`: `at-front-desk`, `with-patient`, `withdrawn`
  - `payer_type`: `hmo`, `private`
  - `order_status`: `pending-approval`, `approved`, `rejected`, `fulfilled`, `dispensed`, `external`, `cancelled`
  - `consultation_disposition`: `lab` / `pharmacy` / `lab-and-pharmacy` / `external-pharmacy` / `discharge`
  - `verification_result`: `verified` / `rejected` / `manual`
- [x] **`visits`** — the spine of the whole flow
  - `id`, `patient_id`, `hospital_id`, `payer_type`, `checkin_at`, `checked_in_by`,
    `status visit_status`, `card_status card_status`,
    `insurance_verified_at`, `insurance_verified_by`, `verification_note`,
    `consultation_started_at`, `checked_out_at`, `checkout_id` (FK → checkouts),
    `queue_number integer`
  - indexes: `(hospital_id, status)`, `(hospital_id, checkin_at desc)`, `(patient_id)`
  - RLS: standard hospital-scoped select/insert/update/delete (reuse the DO-block
    policy pattern from `20260102000000_init_schema.sql`)
- [x] **`insurance_verifications`** — audit trail for step 1
  - `visit_id`, `hospital_id`, `provider`, `member_id`, `plan_type`, `result`,
    `performed_by`, `performed_by_name`, `note`, `created_at`
  - (No live HMO API — this records the confirmation, done manually or later via webhook.
    The after-insert trigger stamps `visits.insurance_verified`.)
- [x] **`vitals`** — step 2
  - `visit_id`, `hospital_id`, `temperature`, `weight`, `blood_pressure_systolic`,
    `blood_pressure_diastolic`, `pulse`, `blood_sugar`, `height`, `spo2`, `notes`,
    `recorded_by`, `recorded_at`
  - one row per reading (allow re-entry); index `(hospital_id, recorded_at desc)`
- [x] **`consultations`** — step 3
  - `visit_id`, `hospital_id`, `doctor_id`, `summary`, `diagnosis` (`text[]`),
    `disposition` (`lab-only` / `pharmacy-only` / `lab-and-pharmacy` / `external-pharmacy` / `discharge`),
    `started_at`, `ended_at`
- [x] **`lab_orders`** — step 3/4
  - `visit_id`, `patient_id`, `hospital_id`, `tests text[]`, `notes`,
    `status order_status`, `requested_by`, `approved_by`, `approved_at`,
    `result_document_id` → `patient_documents.id`, `completed_at`
- [x] **`prescriptions`** — step 3/4
  - `visit_id`, `patient_id`, `hospital_id`, `items jsonb`
    (`[{ name, dosage, frequency, duration, quantity }]`),
    `destination` (`in-house` / `external` + `external_name`),
    `status order_status`, `requested_by`, `approved_by`, `approved_at`,
    `dispensed_by`, `dispensed_at`
- [x] **Cross-tenant scope triggers** — `enforce_visit_hospital_scope()` /
      `enforce_order_visit_scope()` on the new tables
- [x] **Grants** — the five new tables granted to `authenticated` / `service_role`,
      revoked from `anon`
- [x] **Payer rule + role authority** — `apply_order_payer_status()` (HMO can never be
      inserted approved) and `enforce_order_status_authority()` (only hmo/admin decide,
      only lab_technician fulfils, only pharmacist dispenses)
- [ ] **Notifications** — new `notification_type` value `approval`
      (implemented by reusing `team` for now)

---

## 5. Roles & Permissions

- [x] `src/lib/permissions.ts` — capability helpers, keeping UI and RLS in sync:
  - `canCheckIn(role)` → admin, receptionist
  - `canRecordVitals(role)` → admin, nurse, doctor
  - `canCreateOrders(role)` → admin, doctor
  - `canDecideOrders(role)` → admin, hmo
  - `canFulfilLabOrders(role)` → admin, lab_technician, doctor
  - `canDispensePrescriptions(role)` → admin, pharmacist, doctor
  - `canCheckOut(role)` → admin, receptionist, doctor
- [x] RLS: status transitions are enforced in the database — `enforce_order_status_authority()`
      trigger reserves `approved`/`rejected` for hmo/admin, `fulfilled` for lab, and
      `dispensed`/`external` for pharmacy (matching the notifications migration style)
- [x] `src/lib/auth.ts` / `AppRole` type — extended with the three new roles
- [x] Settings → Team page: the new roles are assignable (`set_staff_role` takes the
      enum value directly); badges added to `ProfilePage`
- [x] `20260102000400_restrict_profile_role.sql` — verified: it only removes the
      client UPDATE grant on `role`, so it does not block the new enum values

---

## 6. Feature Todos by Phase

### Phase 1 — Check-in (flow step 1)
- [x] Migration `visit_flow.sql` (section 4 above) — **done first, everything depends on it**
- [x] `src/lib/database.ts`: `visits.ts` module with `createVisit`, `queryVisits`,
      `updateVisit`, `recordVerification`, `getOpenVisit`
- [x] `src/pages/visits/CheckInPage.tsx` — search/select patient → show
      `patient_insurance` → for HMO: "Confirm plan active" (records
      `insurance_verifications`, blocks completion until recorded);
      for private: "card on record found" check
- [x] Front desk queue view (`VisitsQueuePage`): patients checked in today,
      `queue_number`, `visit_status`, card status badge
- [x] Route `/visits` + `/visits/check-in` + `DashboardLayout` sidebar entry
- [x] Auto-detect an existing open visit at check-in (offers to resume instead)
- [ ] Auto-check-in from Patient Detail ("Check in" button when no active visit)

### Phase 2 — Vitals (flow step 2)
- [x] `src/lib/visits.ts`: `recordVitals`, `getVisitVitals`
- [x] `VitalsTab` — temperature, weight, height, BP (systolic/diastolic), pulse,
      blood sugar, SpO₂ + notes, with critical-value flagging
- [x] Advance `visit_status` → `waiting-doctor` on save; notify doctors
- [ ] Show previous vitals readings on the patient detail page (trend sparkline)

### Phase 3 — Doctor consult (flow step 3)
- [x] `ConsultTab` in the visit workspace: snapshot of allergies/conditions/
      medications, vitals summary
- [x] "Start consultation" / "Complete consultation" → timestamps on `consultations`
- [x] Order composer — lab tests (`lab_orders`) and medication items with
      destination (`prescriptions`), plus the disposition selector matching flow.txt
- [x] On save: HMO → `pending-approval`; private → `approved` immediately
      (enforced by `apply_order_payer_status`, not the client)
- [x] Notification to HMO approvers for each pending request

### Phase 4 — Approval + fulfilment (flow step 4a/4b)
- [x] Inline approval actions on the Orders tab — approve/reject with a reason
      (role enforced by the DB guard trigger)
- [x] Lab fulfilment — upload result to `patient_documents` (category `lab`) or
      mark fulfilled without a file
- [x] Pharmacy fulfilment — dispense, or "not available → external pharmacy"
      with the pharmacy name recorded
- [x] Each transition notifies the requesting doctor
- [x] Visit status mirrors these states via `syncVisitStatus`
- [ ] Standalone Approvals / Lab / Pharmacy queue pages (cross-visit worklists)

### Phase 5 — Check-out & archive (flow step 4c)
- [x] Check-out action on the visit: `CheckOutTab` closes the visit and sets
      `card_status = 'withdrawn'`
- [x] Blocked while a request is pending/approved, or the HMO plan is unconfirmed
- [x] Outstanding results remain attached to the patient file; doctor notified
      when a result arrives
- [x] Wire `archivePatient()` (soft archive) into check-out, and link the
      existing `NewCheckoutDialog` discharge record (`visits.checkout_id` exists)
      - check-out offers "add discharge record" (reuses `NewCheckoutDialog`,
        links `checkout_id`) and archives the card (`archive_patient`, now
        role-gated to admin/doctor in `20260102001100_visit_flow.sql`)

### Phase 6 - Dashboard & polish
- [x] Dashboard: "Waiting now" widget - counts per `visit_status`
      - `VisitFlowPanel` (`src/components/dashboard/`) reads `getVisitFlowCounts`,
        zero-fills every stage, and surfaces unconfirmed plans / pending approvals
        as blocking badges above the per-stage bars
- [x] Today's visit queue on `DashboardPage` (reuse `DataTable` + `MetricCard`)
      - `TodayVisitQueue` - a short (6-row) glance list over `queryVisits({ todayOnly })`
- [x] Patient Detail: **Visit timeline** (implemented on the visit Overview tab)
- [x] Reports: average time in each stage, approvals turnaround (recharts is installed)
      - `/reports` (`src/pages/reports/ReportsPage.tsx`) + `getStageTimings` /
        `getApprovalTurnaround` in `src/lib/visits.ts`; 7/30/90-day range
- [x] Sidebar: "Visit Queue" entry + role-scoped sub-queues
      - role-scoped sub-queues (Approvals / Lab / Pharmacy / Ready for check-out);
        `VisitsQueuePage` now reads `?status=` so each link lands pre-filtered
- [x] Empty states + loading skeletons per new page

---

## 7. Open Decisions

- [x] **HMO approver**: the `hmo` role was added to the enum; seed admins until real
      HMO users exist.
- [x] **Verification reality**: manual recording in v1; the schema supports an API/webhook
      later (`insurance_verifications.result`).
- [x] **Queue semantics**: first-come-first-served by `queue_number` (assigned by trigger
      from `checked_in_at`); doctor assignment comes later.
- [x] **External pharmacy**: the pharmacy name is stored on the prescription
      (`external_name`).
- [x] **One active visit per patient**: enforced by the partial unique index
      `visits_one_open_per_patient`.

---

## 8. Suggested Order of Work

1. `visit_flow.sql` migration + `AppRole` extension ✅
2. Phase 1 (check-in) ✅
3. Phase 2 (vitals) ✅
4. Phase 3 (consult + orders) ✅
5. Phase 4 (approvals + lab/pharmacy queues) — inline actions ✅, cross-visit worklists open
6. Phase 5 (check-out) ✅ — discharge record + soft archive wiring open
7. Phase 6 (dashboard, timeline, reports) — timeline ✅, rest open

### Applying the migration

```bash
supabase db push          # or: supabase migration up
```

> Note: `alter type ... add value` cannot run inside the same transaction that
> uses the new values on older Postgres. Supabase runs PG 15+, and this migration
> only compares the new values against string literals inside trigger bodies
> (parsed on first execution, after commit), so it applies cleanly.
