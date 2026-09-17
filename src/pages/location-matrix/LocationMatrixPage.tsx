import { useState, Fragment } from "react"
import {
  Search,
  ChevronDown,
  Building2,
  Home,
  Bed,
  UserCheck,
  AlertTriangle,
  Loader2,
  MapPin,
  RefreshCw,
  Download,
  Eye,
  Settings,
  Bell,
  Grid,
  Table2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { FilterDropdown } from "@/components/ui/FilterDropdown"
import { SortableTh } from "@/components/ui/SortableTh"
import { cn } from "@/lib/utils"

interface Location {
  id: string
  name: string
  type: "ward" | "icu" | "er" | "clinic" | "ot"
  floor: string
  wing: string
  capacity: number
  occupied: number
  available: number
  status: "normal" | "warning" | "critical" | "maintenance"
  staffOnDuty: number
  equipmentStatus: "operational" | "degraded" | "offline"
  lastUpdated: string
  notes?: string
}

const locationTypes = {
  ward: { label: "Ward", icon: Building2, container: "bg-blue-500/10", fg: "text-blue-500" },
  icu: { label: "ICU", icon: AlertTriangle, container: "bg-red-500/10", fg: "text-red-500" },
  er: { label: "ER", icon: Home, container: "bg-orange-500/10", fg: "text-orange-500" },
  clinic: { label: "Clinic", icon: Bed, container: "bg-green-500/10", fg: "text-green-500" },
  ot: { label: "OT", icon: UserCheck, container: "bg-purple-500/10", fg: "text-purple-500" },
}

const mockLocations: Location[] = [
  { id: "1", name: "General Ward A", type: "ward", floor: "3", wing: "North", capacity: 40, occupied: 32, available: 8, status: "normal", staffOnDuty: 8, equipmentStatus: "operational", lastUpdated: "2 min ago", notes: "Standard medical-surgical ward" },
  { id: "2", name: "General Ward B", type: "ward", floor: "3", wing: "South", capacity: 35, occupied: 28, available: 7, status: "normal", staffOnDuty: 7, equipmentStatus: "operational", lastUpdated: "5 min ago", notes: "Post-surgical recovery" },
  { id: "3", name: "ICU Unit 1", type: "icu", floor: "4", wing: "North", capacity: 12, occupied: 11, available: 1, status: "critical", staffOnDuty: 6, equipmentStatus: "operational", lastUpdated: "1 min ago", notes: "Critical care - high acuity" },
  { id: "4", name: "ICU Unit 2", type: "icu", floor: "4", wing: "South", capacity: 10, occupied: 7, available: 3, status: "warning", staffOnDuty: 5, equipmentStatus: "degraded", lastUpdated: "3 min ago", notes: "Step-down ICU, ventilator #3 offline" },
  { id: "5", name: "Emergency Room", type: "er", floor: "1", wing: "Main", capacity: 25, occupied: 22, available: 3, status: "warning", staffOnDuty: 12, equipmentStatus: "operational", lastUpdated: "Just now", notes: "High volume - divert status active" },
  { id: "6", name: "Trauma Bay", type: "er", floor: "1", wing: "Main", capacity: 8, occupied: 8, available: 0, status: "critical", staffOnDuty: 8, equipmentStatus: "operational", lastUpdated: "Just now", notes: "All bays occupied - trauma alert" },
  { id: "7", name: "Cardiology Clinic", type: "clinic", floor: "2", wing: "East", capacity: 20, occupied: 15, available: 5, status: "normal", staffOnDuty: 4, equipmentStatus: "operational", lastUpdated: "10 min ago", notes: "Outpatient consultations" },
  { id: "8", name: "Orthopedic Clinic", type: "clinic", floor: "2", wing: "West", capacity: 15, occupied: 8, available: 7, status: "normal", staffOnDuty: 3, equipmentStatus: "operational", lastUpdated: "15 min ago", notes: "Follow-ups and pre-op assessments" },
  { id: "9", name: "Operating Theater 1", type: "ot", floor: "5", wing: "Main", capacity: 1, occupied: 1, available: 0, status: "normal", staffOnDuty: 6, equipmentStatus: "operational", lastUpdated: "5 min ago", notes: "Case in progress - Lap chole" },
  { id: "10", name: "Operating Theater 2", type: "ot", floor: "5", wing: "Main", capacity: 1, occupied: 0, available: 1, status: "normal", staffOnDuty: 6, equipmentStatus: "operational", lastUpdated: "20 min ago", notes: "Available - next case 14:00" },
  { id: "11", name: "Operating Theater 3", type: "ot", floor: "5", wing: "Main", capacity: 1, occupied: 0, available: 1, status: "maintenance", staffOnDuty: 0, equipmentStatus: "offline", lastUpdated: "1 hour ago", notes: "Scheduled maintenance - HVAC repair" },
  { id: "12", name: "Pediatric Ward", type: "ward", floor: "6", wing: "North", capacity: 30, occupied: 18, available: 12, status: "normal", staffOnDuty: 6, equipmentStatus: "operational", lastUpdated: "8 min ago", notes: "Pediatric medical-surgical" },
  { id: "13", name: "NICU", type: "icu", floor: "6", wing: "South", capacity: 15, occupied: 12, available: 3, status: "warning", staffOnDuty: 8, equipmentStatus: "operational", lastUpdated: "4 min ago", notes: "Neonatal intensive care" },
  { id: "14", name: "Psychiatric Ward", type: "ward", floor: "7", wing: "East", capacity: 20, occupied: 14, available: 6, status: "normal", staffOnDuty: 5, equipmentStatus: "operational", lastUpdated: "12 min ago", notes: "Acute psychiatric care" },
  { id: "15", name: "Dialysis Unit", type: "clinic", floor: "1", wing: "West", capacity: 18, occupied: 16, available: 2, status: "warning", staffOnDuty: 6, equipmentStatus: "degraded", lastUpdated: "7 min ago", notes: "Machine #4 under repair" },
]

function getOccupancyRate(occupied: number, capacity: number) {
  return Math.round((occupied / capacity) * 100)
}

function getOccupancyBarColor(rate: number) {
  return rate >= 90 ? "bg-danger" : rate >= 75 ? "bg-warning" : "bg-primary"
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

function getEquipmentConfig(status: Location["equipmentStatus"]) {
  switch (status) {
    case "operational": return { label: "Operational", variant: "success" as const, color: "text-success" }
    case "degraded": return { label: "Degraded", variant: "warning" as const, color: "text-warning" }
    case "offline": return { label: "Offline", variant: "danger" as const, color: "text-danger" }
  }
}

function OccupancyBar({ occupied, capacity }: { occupied: number; capacity: number }) {
  const rate = getOccupancyRate(occupied, capacity)
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getOccupancyBarColor(rate))}
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className={cn("mt-1 text-right font-mono text-xs", rate >= 90 ? "text-danger" : rate >= 75 ? "text-warning" : "text-text-muted")}>
        {rate}%
      </p>
    </div>
  )
}

export function LocationMatrixPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [floorFilter, setFloorFilter] = useState("All")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")

  const types = ["All", "ward", "icu", "er", "clinic", "ot"]
  const statuses = ["All", "normal", "warning", "critical", "maintenance"]
  const floors = ["All", "1", "2", "3", "4", "5", "6", "7"]

  const typeOptions = types.map(t => ({ value: t, label: t === "All" ? "All Types" : locationTypes[t as keyof typeof locationTypes]?.label || t }))
  const statusOptions = statuses.map(s => ({ value: s, label: s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1) }))
  const floorOptions = floors.map(f => ({ value: f, label: f === "All" ? "All Floors" : `Floor ${f}` }))

  const filteredLocations = mockLocations
    .filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.wing.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "All" || l.type === typeFilter
      const matchesStatus = statusFilter === "All" || l.status === statusFilter
      const matchesFloor = floorFilter === "All" || l.floor === floorFilter
      return matchesSearch && matchesType && matchesStatus && matchesFloor
    })
    .sort((a, b) => {
      const aVal = sortBy === "occupied"
        ? getOccupancyRate(a.occupied, a.capacity)
        : a[sortBy as keyof Location]
      const bVal = sortBy === "occupied"
        ? getOccupancyRate(b.occupied, b.capacity)
        : b[sortBy as keyof Location]
      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === "asc" ? cmp : -cmp
    })

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortOrder("asc") }
  }

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredLocations.length) setSelectedItems([])
    else setSelectedItems(filteredLocations.map(l => l.id))
  }

  const totalCapacity = mockLocations.reduce((sum, l) => sum + l.capacity, 0)
  const totalOccupied = mockLocations.reduce((sum, l) => sum + l.occupied, 0)
  const totalAvailable = totalCapacity - totalOccupied
  const overallOccupancy = Math.round((totalOccupied / totalCapacity) * 100)
  const criticalCount = mockLocations.filter(l => l.status === "critical").length
  const warningCount = mockLocations.filter(l => l.status === "warning").length
  const maintenanceCount = mockLocations.filter(l => l.status === "maintenance").length

  const stats = [
    { label: "Total Beds", value: String(totalCapacity), icon: Building2, iconBg: "bg-primary/10 text-primary" },
    { label: "Occupied", value: String(totalOccupied), icon: UserCheck, iconBg: "bg-success/10 text-success" },
    { label: "Available", value: String(totalAvailable), icon: Bed, iconBg: "bg-blue-500/10 text-blue-500" },
    { label: "Occupancy Rate", value: `${overallOccupancy}%`, icon: Bell, iconBg: "bg-primary/10 text-primary" },
    { label: "Alerts", value: String(criticalCount + warningCount + maintenanceCount), icon: AlertTriangle, iconBg: "bg-danger/10 text-danger" },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Location Matrix</h1>
          <p className="text-text-muted mt-1">Real-time bed management and facility overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-surface p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn("h-8 w-8 p-0", viewMode === "table" && "bg-primary text-white hover:bg-primary-hover")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("grid")}
              className={cn("h-8 w-8 p-0", viewMode === "grid" && "bg-primary text-white hover:bg-primary-hover")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Configure
          </Button>
          <Button className="gap-2">
            <MapPin className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map(stat => (
          <Card key={stat.label} className="p-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", stat.iconBg)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-text">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-0">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_200px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Search locations or wings..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <FilterDropdown value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
            <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
            <FilterDropdown value={floorFilter} onChange={setFloorFilter} options={floorOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selectedItems.length} location(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><Bell className="h-4 w-4" /> Notify Staff</Button>
            <Button variant="outline" size="sm" className="gap-1"><Settings className="h-4 w-4" /> Bulk Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      {filteredLocations.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg">
            <MapPin className="h-6 w-6 text-text-muted/40" />
          </div>
          <p className="text-lg font-medium text-text">No locations found</p>
          <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === "table" ? (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-text">Location Details</p>
            <p className="text-xs text-text-muted">{filteredLocations.length} of {mockLocations.length} locations</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border bg-bg/50 text-left">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredLocations.length && filteredLocations.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary"
                      aria-label="Select all locations"
                    />
                  </th>
                  <SortableTh field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Location</SortableTh>
                  <SortableTh field="type" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell">Type</SortableTh>
                  <SortableTh field="floor" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden lg:table-cell">Floor</SortableTh>
                  <SortableTh field="capacity" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="text-right">Capacity</SortableTh>
                  <SortableTh field="occupied" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="text-right">Occupied</SortableTh>
                  <SortableTh field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort}>Status</SortableTh>
                  <SortableTh field="staffOnDuty" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden text-center xl:table-cell">Staff</SortableTh>
                  <SortableTh field="equipmentStatus" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} className="hidden text-center xl:table-cell">Equipment</SortableTh>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLocations.map(location => {
                  const typeConfig = locationTypes[location.type]
                  const statusConfig = getStatusConfig(location.status)
                  const equipConfig = getEquipmentConfig(location.equipmentStatus)
                  const isSelected = selectedItems.includes(location.id)
                  const isExpanded = expandedRow === location.id
                  const Icon = typeConfig.icon
                  const StatusIcon = statusConfig.icon

                  return (
                    <Fragment key={location.id}>
                      <tr
                        className={cn("cursor-pointer transition-colors hover:bg-bg/60", isSelected && "bg-primary/5")}
                        onClick={() => setExpandedRow(isExpanded ? null : location.id)}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(location.id)}
                            onClick={e => e.stopPropagation()}
                            className="h-4 w-4 rounded border-border text-primary"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", typeConfig.container)}>
                              <Icon className={cn("h-4 w-4", typeConfig.fg)} />
                            </div>
                            <div>
                              <p className="font-medium text-text">{location.name}</p>
                              <p className="text-xs text-text-muted">Floor {location.floor} • {location.wing} Wing</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 md:table-cell">
                          <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                        </td>
                        <td className="hidden px-4 py-4 text-sm text-text lg:table-cell">Floor {location.floor}</td>
                        <td className="px-12 py-4 text-right font-mono text-sm text-text">{location.capacity}</td>
                        <td className="px-4 py-4">
                          <div className="w-28 pt-4">
                            <OccupancyBar occupied={location.occupied} capacity={location.capacity} />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusConfig.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td className="hidden px-4 py-4 text-center text-sm text-text xl:table-cell">{location.staffOnDuty} on duty</td>
                        <td className="hidden px-4 py-4 text-center xl:table-cell">
                          <Badge variant={equipConfig.variant} className={cn("text-xs", equipConfig.color)}>{equipConfig.label}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()} aria-label="View location">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()} aria-label="Edit location">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <span className={cn("flex h-8 w-8 items-center justify-center text-text-muted transition-transform", isExpanded && "rotate-180")}>
                              <ChevronDown className="h-4 w-4" />
                            </span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-bg/40">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid gap-6 border-t border-border p-4 md:grid-cols-3">
                              <div className="space-y-4 md:col-span-2">
                                <div>
                                  <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                    <MapPin className="h-4 w-4" /> Location Details
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <p><span className="font-medium text-text-muted">Floor: </span>{location.floor}</p>
                                    <p><span className="font-medium text-text-muted">Wing: </span>{location.wing}</p>
                                    <p><span className="font-medium text-text-muted">Type: </span>{typeConfig.label}</p>
                                    <p><span className="font-medium text-text-muted">Last Updated: </span>{location.lastUpdated}</p>
                                  </div>
                                </div>
                                {location.notes && (
                                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                      <Bell className="h-4 w-4 text-primary" /> Notes
                                    </h4>
                                    <p className="text-sm text-text">{location.notes}</p>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                    <Bed className="h-4 w-4" /> Bed Status
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-text-muted">Total Capacity</span><span className="font-medium text-text">{location.capacity}</span></div>
                                    <div className="flex justify-between"><span className="text-text-muted">Occupied</span><span className="font-medium text-text">{location.occupied}</span></div>
                                    <div className="flex justify-between"><span className="text-text-muted">Available</span><span className="font-medium text-success">{location.available}</span></div>
                                    <div className="flex justify-between">
                                      <span className="text-text-muted">Occupancy Rate</span>
                                      <span className={cn("font-medium", location.occupied / location.capacity >= 0.9 ? "text-danger" : location.occupied / location.capacity >= 0.75 ? "text-warning" : "text-text")}>
                                        {getOccupancyRate(location.occupied, location.capacity)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                    <UserCheck className="h-4 w-4" /> Staffing
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-text-muted">On Duty</span><span className="font-medium text-text">{location.staffOnDuty}</span></div>
                                    <div className="flex justify-between"><span className="text-text-muted">Ratio</span><span className="font-medium text-text">1:{Math.round(location.occupied / location.staffOnDuty) || 0}</span></div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="mb-2 flex items-center gap-2 font-medium text-text">
                                    <Settings className="h-4 w-4" /> Equipment
                                  </h4>
                                  <Badge variant={equipConfig.variant} className={cn("text-sm", equipConfig.color)}>{equipConfig.label}</Badge>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLocations.map(location => {
            const typeConfig = locationTypes[location.type]
            const statusConfig = getStatusConfig(location.status)
            const equipConfig = getEquipmentConfig(location.equipmentStatus)
            const isSelected = selectedItems.includes(location.id)
            const Icon = typeConfig.icon
            const StatusIcon = statusConfig.icon

            return (
              <Card
                key={location.id}
                className={cn(
                  "cursor-pointer overflow-hidden transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-primary border-primary"
                )}
                onClick={() => toggleSelect(location.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(location.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", typeConfig.container)}>
                        <Icon className={cn("h-5 w-5", typeConfig.fg)} />
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant} className="shrink-0 gap-1 capitalize">
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <p className="truncate font-semibold text-text">{location.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">Floor {location.floor} • {location.wing} Wing</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                    <Badge variant={equipConfig.variant} className={cn("text-xs", equipConfig.color)}>{equipConfig.label}</Badge>
                  </div>

                  <div className="mt-4">
                    <OccupancyBar occupied={location.occupied} capacity={location.capacity} />
                    <p className="mt-1 text-right font-mono text-xs text-text-muted">{location.occupied}/{location.capacity} beds</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
                    <span>{location.staffOnDuty} staff on duty</span>
                    <span>Updated: {location.lastUpdated}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}