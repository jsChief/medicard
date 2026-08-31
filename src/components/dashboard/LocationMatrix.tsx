import {
  Building2,
  Home,
  Bed,
  UserCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

interface Location {
  id: string
  name: string
  type: "ward" | "icu" | "er" | "clinic" | "ot"
  capacity: number
  occupied: number
  status: "normal" | "warning" | "critical" | "maintenance"
  lastUpdated: string
}

const locationTypes = {
  ward: { label: "Ward", icon: Building2, color: "bg-blue-500" },
  icu: { label: "ICU", icon: AlertTriangle, color: "bg-red-500" },
  er: { label: "ER", icon: Home, color: "bg-orange-500" },
  clinic: { label: "Clinic", icon: Bed, color: "bg-green-500" },
  ot: { label: "OT", icon: UserCheck, color: "bg-purple-500" },
}

const mockLocations: Location[] = [
  { id: "1", name: "General Ward A", type: "ward", capacity: 40, occupied: 32, status: "normal", lastUpdated: "2 min ago" },
  { id: "2", name: "General Ward B", type: "ward", capacity: 35, occupied: 28, status: "normal", lastUpdated: "5 min ago" },
  { id: "3", name: "ICU Unit 1", type: "icu", capacity: 12, occupied: 11, status: "critical", lastUpdated: "1 min ago" },
  { id: "4", name: "ICU Unit 2", type: "icu", capacity: 10, occupied: 7, status: "warning", lastUpdated: "3 min ago" },
  { id: "5", name: "Emergency Room", type: "er", capacity: 25, occupied: 22, status: "warning", lastUpdated: "Just now" },
  { id: "6", name: "Trauma Bay", type: "er", capacity: 8, occupied: 8, status: "critical", lastUpdated: "Just now" },
  { id: "7", name: "Cardiology Clinic", type: "clinic", capacity: 20, occupied: 15, status: "normal", lastUpdated: "10 min ago" },
  { id: "8", name: "Orthopedic Clinic", type: "clinic", capacity: 15, occupied: 8, status: "normal", lastUpdated: "15 min ago" },
  { id: "9", name: "Operating Theater 1", type: "ot", capacity: 1, occupied: 1, status: "normal", lastUpdated: "5 min ago" },
  { id: "10", name: "Operating Theater 2", type: "ot", capacity: 1, occupied: 0, status: "normal", lastUpdated: "20 min ago" },
  { id: "11", name: "Operating Theater 3", type: "ot", capacity: 1, occupied: 1, status: "maintenance", lastUpdated: "1 hour ago" },
  { id: "12", name: "Pediatric Ward", type: "ward", capacity: 30, occupied: 18, status: "normal", lastUpdated: "8 min ago" },
]

function getOccupancyRate(occupied: number, capacity: number) {
  return Math.round((occupied / capacity) * 100)
}

function getStatusConfig(status: Location["status"]) {
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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Live Location Matrix</CardTitle>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Live</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
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
              {mockLocations.map((location) => {
                const typeConfig = locationTypes[location.type]
                const statusConfig = getStatusConfig(location.status)
                const occupancyRate = getOccupancyRate(location.occupied, location.capacity)
                const Icon = typeConfig.icon
                const StatusIcon = statusConfig.icon

                return (
                  <tr key={location.id} className="hover:bg-bg/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", typeConfig.color + "/10")}>
                          <Icon className={cn("h-4 w-4", typeConfig.color)} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-medium text-text">{location.name}</p>
                          <p className="text-xs text-text-muted">{location.occupied}/{location.capacity} beds</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={typeConfig.color.replace("bg-", "").replace("-500", "") as "primary" | "secondary" | "success" | "warning" | "danger"}>
                        {typeConfig.label}
                      </Badge>
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
                      {location.lastUpdated}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}