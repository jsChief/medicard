import type { VisitStatus, OrderStatus, CardStatus, VisitStage } from "@/lib/visits"

/** Badge variant names shared by every visit-flow surface. */
export type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger"

export const VISIT_STATUS_VARIANT: Record<VisitStatus, BadgeVariant> = {
  "checked-in": "primary",
  vitals: "warning",
  "waiting-doctor": "warning",
  "in-consult": "primary",
  "awaiting-approval": "danger",
  "at-lab": "primary",
  "at-pharmacy": "primary",
  "ready-for-checkout": "success",
  "checked-out": "secondary",
  cancelled: "secondary",
}

export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  "pending-approval": "warning",
  approved: "primary",
  rejected: "danger",
  fulfilled: "success",
  dispensed: "success",
  external: "secondary",
  cancelled: "secondary",
}

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  "at-front-desk": "Card at front desk",
  "with-patient": "Card with patient",
  withdrawn: "Card withdrawn",
}

export const CARD_STATUS_VARIANT: Record<CardStatus, BadgeVariant> = {
  "at-front-desk": "warning",
  "with-patient": "primary",
  withdrawn: "secondary",
}

/** Stepper definition - one entry per flow stage, in flow.txt order. */
export const VISIT_STAGES: Array<{ stage: VisitStage; label: string }> = [
  { stage: "check-in", label: "Check-in" },
  { stage: "vitals", label: "Vitals" },
  { stage: "consult", label: "Doctor" },
  { stage: "orders", label: "Orders" },
  { stage: "check-out", label: "Check-out" },
]
