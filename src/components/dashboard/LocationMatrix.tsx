import {
  Building2,
  Home,
  Bed,
  UserCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { cn, formatRelativeTime } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { queryLocations, type Location as LocationDoc } from "@/lib/firestore"

const locationTypes = {
  ward: { label: "Ward", icon: Building2, container: "bg-blue-500/10", fg: "text-blue-500" },
  icu: { label: "ICU", icon: AlertTriangle, container: "bg-red-500/10", fg: "text-red-500" },
  er: { label: "ER", icon: Home, container: "bg-orange-500/10", fg: "text-orange-500" },
  clinic: { label: "Clinic", icon: Bed, container: "bg-green-500/10", fg: "text-green-500" },
  ot: { label: "OT", icon: UserCheck, container: "bg-purple-500/10", fg: "text-purple-500" },
}

function getOccupancyRate(occupied: number, capacity: number) {
  return Math.round((occupied / capacity) * 100)
}

function getStatusConfig(status: LocationDoc["status"]) {
  switch (status) {
    case "normal":
      return { label: "Normal", variant: "success" as const, icon: UserCheck }
    case "warning":
      return { label: "High Occupancy", variant: "warning" as const, icon: AlertTriangle }
    case "critical":
      return { label: "Critical", variant: "danger" as const, icon: AlertTriangle }
    case "maintenance":
      return { label: "Maintenance", variant: "secondary" as const, icon: Loader2 }
  }
}

export function LocationMatrix() {
  const { user } = useAuth()
  const [locations, setLocations] = useState<LocationDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchLocations = async () => {
      if (!user?.hospitalId) {
        setIsLoading(false)
        return
      }
      try {
        const result = await queryLocations({ hospitalId: user.hospitalId, sortBy: "name", sortOrder: "asc" })
        if (!cancelled) setLocations(result)
      } catch (error) {
        console.error("Failed to fetch locations:", error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchLocations()
    return () => { cancelled = true }
  }, [user?.hospitalId])

  const lastUpdated = locations.length > 0 ? formatRelativeTime(locations[0].updatedAt.toISOString()) : "Just now"

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Location Matrix</CardTitle>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading</span>
            </>
          ) : locations.length > 0 ? (
            <>
              <span className={cn("h-2 w-2 rounded-full", "bg-success")} />
              <span>Live · {lastUpdated}</span>
            </>
          ) : (
            <>
              <span className={cn("h-2 w-2 rounded-full", "bg-text-muted/40")} />
              <span>No data</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && locations.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            No locations yet. Add location records to see the matrix.
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Occupancy</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.map((location) => {
                const typeConfig = locationTypes[location.type]
                const statusConfig = getStatusConfig(location.status)
                const occupancyRate = getOccupancyRate(location.occupied, location.capacity)
                const Icon = typeConfig.icon
                const StatusIcon = statusConfig.icon

                return (
                  <tr key={location.id} className="hover:bg-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", typeConfig.container)}>
                          <Icon className={cn("h-4 w-4", typeConfig.fg)} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-medium text-text">{location.name}</p>
                          <p className="text-xs text-text-muted">{location.occupied}/{location.capacity} beds</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{typeConfig.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="w-32">
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              occupancyRate >= 90 ? "bg-danger" :
                              occupancyRate >= 75 ? "bg-warning" :
                              "bg-primary"
                            )}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-mono text-text-muted text-right">{occupancyRate}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusConfig.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" aria-hidden="true" />
                        {statusConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-text-muted">
                      {formatRelativeTime(location.updatedAt.toISOString())}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  )
}