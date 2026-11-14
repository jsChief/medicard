import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react"
import { Badge, type BadgeProps } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Select } from "@/components/ui/Select"
import { describeError } from "@/lib/errors"
import { APP_ROLE_LABELS } from "@/lib/auth"
import {
  AUDIT_ACTIONS,
  AUDITED_TABLES,
  queryAuditEvents,
  type AuditAction,
  type AuditEvent,
} from "@/lib/audit"

const PAGE_SIZE = 100

const ACTION_DISPLAY: Record<
  AuditAction,
  { label: string; variant: BadgeProps["variant"] }
> = {
  insert: { label: "Created", variant: "success" },
  update: { label: "Updated", variant: "primary" },
  delete: { label: "Deleted", variant: "danger" },
  read: { label: "Viewed", variant: "secondary" },
  export: { label: "Exported", variant: "warning" },
}

const ACTION_OPTIONS = [
  { value: "all", label: "All actions" },
  ...AUDIT_ACTIONS.map((action) => ({ value: action, label: ACTION_DISPLAY[action].label })),
]

const TABLE_OPTIONS = [
  { value: "all", label: "All records" },
  ...AUDITED_TABLES.map((table) => ({ value: table, label: formatTableName(table) })),
]

function formatTableName(table: string): string {
  const label = table.replace(/_/g, " ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function roleLabel(role: string): string {
  return (APP_ROLE_LABELS as Record<string, string>)[role] ?? role.replace(/_/g, " ")
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id
}

function formatMetadataValue(value: unknown): string {
  if (value === null) return "null"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/**
 * Admin-only reader for the append-only audit trail.
 *
 * Every clinical write, patient read and CSV export lands in `audit_events`
 * through SECURITY DEFINER triggers/helpers. The table's RLS policy already
 * limits reads to admins of the same hospital (and to aal2 sessions when MFA is
 * required), so this page intentionally has no permission logic of its own.
 */
export function AuditLogPage() {
  const [action, setAction] = useState<AuditAction | "all">("all")
  const [tableName, setTableName] = useState<string>("all")
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  // Filter changes can land out of order; only the newest request may write.
  const requestIdRef = useRef(0)

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setError(null)
    setLoadMoreError(null)
    try {
      const page = await queryAuditEvents({ action, tableName, limit: PAGE_SIZE })
      if (requestId !== requestIdRef.current) return
      setEvents(page)
      setHasMore(page.length === PAGE_SIZE)
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return
      setError(describeError(loadError, "load the audit trail"))
      setEvents([])
      setHasMore(false)
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [action, tableName])

  useEffect(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  const loadMore = async () => {
    const last = events[events.length - 1]
    if (!last) return

    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await queryAuditEvents({
        action,
        tableName,
        beforeId: last.id,
        limit: PAGE_SIZE,
      })
      setEvents((previous) => [...previous, ...page])
      setHasMore(page.length === PAGE_SIZE)
    } catch (loadError) {
      setLoadMoreError(describeError(loadError, "load older audit events"))
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="p-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Audit trail</p>
            <p className="text-xs text-text-muted">
              Append-only record of patient access, exports and changes to clinical records. It
              cannot be edited or deleted.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
            <Select
              id="audit-action-filter"
              label="Action"
              compact
              value={action}
              onChange={(value) => setAction(value as AuditAction | "all")}
              options={ACTION_OPTIONS}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select
              id="audit-table-filter"
              label="Record type"
              compact
              value={tableName}
              onChange={setTableName}
              options={TABLE_OPTIONS}
            />
          </div>
          <div className="flex flex-1 items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs text-text-muted">
              {isLoading
                ? "Loading…"
                : `${events.length}${hasMore ? "+" : ""} ${events.length === 1 ? "event" : "events"}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadFirstPage()}
              isLoading={isLoading}
              className="gap-2"
            >
              {!isLoading && <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading audit events…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10">
              <TriangleAlert className="h-6 w-6 text-danger" />
            </span>
            <div>
              <p className="font-medium text-text">We could not load the audit trail</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">{error}</p>
            </div>
            <Button variant="outline" onClick={() => void loadFirstPage()}>
              Try again
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-medium text-text">No audit events found</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
              {action === "all" && tableName === "all"
                ? "Activity will appear here as soon as someone opens or changes a patient record."
                : "Nothing matches these filters. Try widening them."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Who</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const actionDisplay = ACTION_DISPLAY[event.action]
                    const metadata = Object.entries(event.metadata)
                    const hasDetails = event.changedColumns.length > 0 || metadata.length > 0

                    return (
                      <tr
                        key={event.id}
                        className="border-b border-border/60 align-top last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                          {formatTimestamp(event.occurredAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-text">{event.actorName}</p>
                          {event.actorRole && (
                            <p className="text-xs text-text-muted">{roleLabel(event.actorRole)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={actionDisplay.variant}>{actionDisplay.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-text">{formatTableName(event.tableName)}</p>
                          <div className="mt-1 space-y-0.5 text-xs text-text-muted">
                            {event.rowId && (
                              <p className="font-mono" title={event.rowId}>
                                {shortId(event.rowId)}
                              </p>
                            )}
                            {event.patientId && event.action !== "delete" && (
                              <Link
                                to={`/patients/${event.patientId}`}
                                className="inline-block font-medium text-primary underline-offset-4 hover:underline"
                              >
                                Open patient
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {hasDetails ? (
                            <div className="max-w-sm space-y-1.5">
                              {event.changedColumns.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {event.changedColumns.map((column) => (
                                    <code
                                      key={column}
                                      className="rounded bg-bg px-1.5 py-0.5 text-[11px] text-text-muted"
                                    >
                                      {column}
                                    </code>
                                  ))}
                                </div>
                              )}
                              {metadata.length > 0 && (
                                <p className="text-xs text-text-muted">
                                  {metadata
                                    .map(
                                      ([key, value]) => `${key}: ${formatMetadataValue(value)}`,
                                    )
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {(hasMore || loadMoreError) && (
              <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-4">
                {loadMoreError && (
                  <p role="alert" className="text-sm text-danger">
                    {loadMoreError}
                  </p>
                )}
                {hasMore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadMore()}
                    isLoading={isLoadingMore}
                  >
                    Load more
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
