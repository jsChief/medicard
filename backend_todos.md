# Backend / Firebase Connection Todos

Plan to connect every dashboard section to Firebase Firestore, per-hospital scoped.

## Foundation (high priority)

- [x] **Firestore security rules**: per-hospital scoping for `patients`, `locations`, `checkouts`, `hmo_approvals`, `archives`, `staff`, `users`. Create `firestore.rules` + `firebase.json` and deploy.
- [x] **Composite indexes**: create required indexes for `hospitalId + sort field` queries (see Indexes section).
- [x] **Create `locations` collection** — fields: `name`, `type` (`ward|icu|er|clinic|ot`), `floor`, `wing`, `capacity`, `occupied`, `status`, `staffOnDuty`, `equipmentStatus`, `notes`, `hospitalId`, `updatedAt`.
- [x] **Create `checkouts` collection** — fields per mock `Checkout` shape + `hospitalId`, `createdAt`, `updatedAt`.
- [x] **Create `hmo_approvals` collection** — fields per mock `HMOApproval` shape + `hospitalId`, `createdAt`, `updatedAt`.
- [x] **Create `archives` collection** — archived patient snapshots: `mrn`, name, `department`, `status` (`discharged|transferred|deceased`), `dischargeDate`, `dischargeReason`, `lengthOfStay`, `archivedAt`, `archivedBy`, `hospitalId`, timestamps.
- [x] **Add `room`/`bed` fields to `patients`** so checkouts and location occupancy can be derived/linked.

## Dashboard sections

- [x] **Metric cards**: replace hardcoded values with `getCountFromServer` count queries per hospital (total patients, archive balance, active checkouts, pending HMO). Time-range deltas from `createdAt`/`admissionDate` vs start of period. (Implemented `countPatients`/`countArchives`/`countCheckouts`/`countHMOApprovals` + `getDashboardCounts`; `DashboardPage` wired with loading state + range picker.)
- [x] **HMO Bottleneck Callout**: group `hmo_approvals` by `hmoProvider` (pending count, avg processing days from `createdAt` → `reviewedAt`). (`HMOBottleneckCallout` now queries `queryHMOApprovals` and derives trend/risk/card types.)
- [x] **Dashboard Location Matrix widget**: read `locations` collection (replace `mockLocations`). (`LocationMatrix` widget uses `queryLocations` with loading/empty states.)
- [x] **Action Watchlist**: derive overdue rows from `checkouts` (past `expectedDischargeDate`, not completed/cancelled) + pending `hmo_approvals` past SLA. (`ActionWatchlist` now derives rows from `queryCheckouts` + `queryHMOApprovals`.)
- [ ] **Quick Actions + System Status**: derive counts where feasible (cosmetic / low priority).

## Pages

- [x] **Location Matrix page**: replace `mockLocations` with `locations` query; keep filters/sorting. (`LocationMatrixPage` uses `queryLocations` with loading state, dynamic floors/departments, Refresh wired.)
- [x] **Checkouts page**: replace `mockCheckouts` with real data + stats + wire Approve/Start/Cancel actions to `updateDoc`. (`CheckoutsPage` uses `queryCheckouts` + `updateCheckout` bulk actions, dynamic departments.)
- [x] **HMO Approvals page**: replace `mockHMOApprovals` with real data + stats + wire Approve/Deny/Request-Info to `updateDoc`. (`HMOApprovalsPage` uses `queryHMOApprovals` + `updateHMOApproval` bulk actions, real "Approved Today"/"Denied This Week" from `reviewedAt`.)
- [x] **Archive page**: replace `mockArchivedPatients` with real data + Archive-Current / Restore / Delete (batch). (`ArchivePage` uses `queryArchives`, plus new `restoreArchive`/`bulkDeleteArchives`/`archivePatientAsDischarged` helpers.)
- [x] **Patient Cards page**: already connected to `patients`.

## Where the wiring already lives

- `src/lib/firestore.ts` — add query/count helpers for each new collection here (mirror `queryPatients` pattern).
- `src/lib/firebaseAuth.ts` — user profile holds `hospitalId`.

## Security rules sketch

```
match /{collection}/{id} {
  allow read, write: if isSignedIn()
    && request.resource.data.hospitalId == getUser().data.hospitalId;
}
```

- On updates, also verify the **existing** doc's `resource.data.hospitalId`.
- Resolve user's hospital via `get(/databases/$(database)/documents/users/$(request.auth.uid))`.

## Required composite indexes (create in console)

- `patients`: hospitalId + each sort field — `lastName`, `firstName`, `mrn`, `dob`, `department`, `attendingPhysician`, `status`, `admissionDate` (used by `queryPatients`).
- `patients`: `searchPatients` range query (hospitalId + lastName range).
- `locations`: hospitalId + `name` / `floor` / `capacity` / `occupied`.
- `checkouts`: hospitalId + `expectedDischargeDate` / `patientName` / `status`.
- `hmo_approvals`: hospitalId + `requestDate` / `status` / `hmoProvider` (incl. status + provider combos).

## Final polish

- [ ] Loading skeletons + empty states on every page after wiring.