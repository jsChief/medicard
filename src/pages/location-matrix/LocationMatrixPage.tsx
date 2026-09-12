import React, { useState } from "react"
import { Search, ChevronDown, ChevronUp, Building2, Home, Bed, UserCheck, AlertTriangle, Loader2, MapPin, RefreshCw, Download, Eye, Settings, Bell } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useAuth } from "@/context/AuthContext"
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
  ward: { label: "Ward", icon: Building2, color: "bg-blue-500" },
  icu: { label: "ICU", icon: AlertTriangle, color: "bg-red-500" },
  er: { label: "ER", icon: Home, color: "bg-orange-500" },
  clinic: { label: "Clinic", icon: Bed, color: "bg-green-500" },
  ot: { label: "OT", icon: UserCheck, color: "bg-purple-500" },
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

export function LocationMatrixPage() {
  const { user: _user } = useAuth()
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

  const filteredLocations = mockLocations
    .filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.wing.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === "All" || l.type === typeFilter
      const matchesStatus = statusFilter === "All" || l.status === statusFilter
      const matchesFloor = floorFilter === "All" || l.floor === floorFilter
      return matchesSearch && matchesType && matchesStatus && matchesFloor
    })
    .sort((a, b) => {
      const aVal = a[sortBy as keyof Location]
      const bVal = b[sortBy as keyof Location]
      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === "asc" ? cmp : -cmp
    })

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(field); setSortOrder("asc") }
  }

  const SortIcon = sortOrder === "asc" ? ChevronUp : ChevronDown

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Location Matrix</h1>
          <p className="text-text-muted mt-1">Real-time bed management and facility overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => {}}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" /> Configure</Button>
          <Button className="gap-2"><MapPin className="h-4 w-4" /> Add Location</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Total Beds</p><p className="text-2xl font-bold text-text">{totalCapacity}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><UserCheck className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Occupied</p><p className="text-2xl font-bold text-text">{totalOccupied}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><Bed className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Available</p><p className="text-2xl font-bold text-text">{totalAvailable}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bell className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Occupancy Rate</p><p className="text-2xl font-bold text-text">{overallOccupancy}%</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger/10 text-danger"><AlertTriangle className="h-5 w-5" /></div>
              <div><p className="text-sm text-text-muted">Alerts</p><p className="text-2xl font-bold text-text">{criticalCount + warningCount + maintenanceCount}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input placeholder="Search locations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select label="Type" value={typeFilter} onChange={setTypeFilter} options={types.map(t => ({ value: t, label: t === "All" ? "All Types" : locationTypes[t as keyof typeof locationTypes]?.label || t }))} />
            <Select label="Status" value={statusFilter} onChange={setStatusFilter} options={statuses.map(s => ({ value: s, label: s === "All" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1) }))} />
            <Select label="Floor" value={floorFilter} onChange={setFloorFilter} options={floors.map(f => ({ value: f, label: f === "All" ? "All Floors" : `Floor ${f}` }))} />
          </div>
        </CardContent>
      </Card>

      {selectedItems.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">{selectedItems.length} location(s) selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1"><Bell className="h-4 w-4" /> Notify Staff</Button>
            <Button variant="outline" size="sm" className="gap-1"><Settings className="h-4 w-4" /> Bulk Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItems([])}>Clear</Button>
          </div>
        </div>
      )}

      {viewMode === "table" ? (
        <Card>
          <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Location Details</CardTitle>
              <CardDescription>Showing {filteredLocations.length} of {mockLocations.length} locations</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className={cn("h-9 w-9", "bg-primary text-white")} aria-label="Table view"><Settings className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setViewMode("grid")} className="h-9 w-9" aria-label="Grid view"><MapPin className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="border-b border-border bg-bg/50">
                    <th className="px-4 py-3 text-left w-12"><input type="checkbox" checked={selectedItems.length === filteredLocations.length && filteredLocations.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border text-primary" /></th>
                    <th className="px-4 py-3 text-left"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("name")}>Location <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                    <th className="px-4 py-3 text-left hidden md:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("type")}>Type <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("floor")}>Floor <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                    <th className="px-4 py-3 text-right"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("capacity")}>Capacity <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                    <th className="px-4 py-3 text-right"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("occupied")}>Occupied <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                    <th className="px-4 py-3 text-center"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("status")}>Status <SortIcon className="h-4 w-4 ml-1 inline" /></Button></th>
                    <th className="px-4 py-3 text-center hidden xl:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("staffOnDuty")}>Staff</Button></th>
                    <th className="px-4 py-3 text-center hidden xl:table-cell"><Button variant="ghost" size="sm" className="h-auto p-0 text-left font-semibold text-text-muted hover:text-text" onClick={() => handleSort("equipmentStatus")}>Equipment</Button></th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLocations.map(location => {
                    const typeConfig = locationTypes[location.type]
                    const statusConfig = getStatusConfig(location.status)
                    const equipConfig = getEquipmentConfig(location.equipmentStatus)
                    const occupancyRate = getOccupancyRate(location.occupied, location.capacity)
                    const isSelected = selectedItems.includes(location.id)
                    const isExpanded = expandedRow === location.id
                    const Icon = typeConfig.icon
                    const StatusIcon = statusConfig.icon

                    return (
                      <React.Fragment key={location.id}>
                        <tr className={cn("hover:bg-bg/50 transition-colors cursor-pointer", isSelected && "bg-primary/5")} onClick={() => setExpandedRow(isExpanded ? null : location.id)}>
                          <td className="px-4 py-4"><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(location.id)} onClick={e => e.stopPropagation()} className="h-4 w-4 rounded border-border text-primary" /></td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", typeConfig.color + "/10")}>
                                <Icon className={cn("h-4 w-4", typeConfig.color)} aria-hidden="true" />
                              </div>
                              <div>
                                <p className="font-medium text-text">{location.name}</p>
                                <p className="text-xs text-text-muted">Floor {location.floor} • {location.wing} Wing</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell"><span className="text-sm text-text">Floor {location.floor}</span></td>
                          <td className="px-4 py-4 text-right font-mono text-sm text-text">{location.capacity}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="w-28">
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
                          <td className="px-4 py-4 text-center">
                            <Badge variant={statusConfig.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" aria-hidden="true" />
                              {statusConfig.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-center hidden xl:table-cell">
                            <span className="text-sm text-text">{location.staffOnDuty} on duty</span>
                          </td>
                          <td className="px-4 py-4 text-center hidden xl:table-cell">
                            <Badge variant={equipConfig.variant} className={cn("text-xs", equipConfig.color)}>{equipConfig.label}</Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); }} aria-label="View"><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => { e.stopPropagation(); }} aria-label="Edit"><Settings className="h-4 w-4" /></Button>
                              <span className={cn("h-8 w-8 flex items-center justify-center text-text-muted", isExpanded ? "rotate-180" : "")}>
                                <ChevronDown className="h-4 w-4" />
                              </span>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-bg/50">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="grid gap-6 md:grid-cols-3 p-4 border-t border-border">
                                <div className="md:col-span-2 space-y-4">
                                  <div>
                                    <h4 className="font-medium text-text mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Location Details</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <p><span className="font-medium text-text-muted">Floor: </span>{location.floor}</p>
                                      <p><span className="font-medium text-text-muted">Wing: </span>{location.wing}</p>
                                      <p><span className="font-medium text-text-muted">Type: </span>{typeConfig.label}</p>
                                      <p><span className="font-medium text-text-muted">Last Updated: </span>{location.lastUpdated}</p>
                                    </div>
                                  </div>
                                  {location.notes && (
                                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                                      <h4 className="font-medium text-text mb-2 flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notes</h4>
                                      <p className="text-sm text-text">{location.notes}</p>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium text-text mb-2 flex items-center gap-2"><Bed className="h-4 w-4" /> Bed Status</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between"><span className="text-text-muted">Total Capacity</span><span className="font-medium text-text">{location.capacity}</span></div>
                                      <div className="flex justify-between"><span className="text-text-muted">Occupied</span><span className="font-medium text-text">{location.occupied}</span></div>
                                      <div className="flex justify-between"><span className="text-text-muted">Available</span><span className="font-medium text-success">{location.available}</span></div>
                                      <div className="flex justify-between"><span className="text-text-muted">Occupancy Rate</span><span className={cn("font-medium", occupancyRate >= 90 ? "text-danger" : occupancyRate >= 75 ? "text-warning" : "text-text")}>{occupancyRate}%</span></div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-text mb-2 flex items-center gap-2"><UserCheck className="h-4 w-4" /> Staffing</h4>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between"><span className="text-text-muted">On Duty</span><span className="font-medium text-text">{location.staffOnDuty}</span></div>
                                      <div className="flex justify-between"><span className="text-text-muted">Ratio</span><span className="font-medium text-text">1:{Math.round(location.occupied / location.staffOnDuty) || 0}</span></div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-text mb-2 flex items-center gap-2"><Settings className="h-4 w-4" /> Equipment</h4>
                                    <Badge variant={equipConfig.variant} className={cn("text-sm", equipConfig.color)}>{equipConfig.label}</Badge>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filteredLocations.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-text-muted/30 mx-auto mb-3" />
                <p className="text-lg text-text-muted">No locations found</p>
                <p className="text-sm text-text-muted">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <span className="px-3 py-1 text-sm font-medium text-text">1</span>
              <span className="px-3 py-1 text-sm text-text-muted">2</span>
              <span className="px-3 py-1 text-sm text-text-muted">3</span>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLocations.map(location => {
            const typeConfig = locationTypes[location.type]
            const statusConfig = getStatusConfig(location.status)
            const equipConfig = getEquipmentConfig(location.equipmentStatus)
            const occupancyRate = getOccupancyRate(location.occupied, location.capacity)
            const isSelected = selectedItems.includes(location.id)
            const Icon = typeConfig.icon
            const StatusIcon = statusConfig.icon

            return (
              <Card
                key={location.id}
                className={cn("transition-all cursor-pointer hover:shadow-lg", isSelected && "ring-2 ring-primary border-primary")}
                onClick={() => toggleSelect(location.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(location.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", typeConfig.color + "/10")}>
                        <Icon className={cn("h-5 w-5", typeConfig.color)} />
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant} className="capitalize gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="font-semibold text-text truncate">{location.name}</p>
                    <p className="text-xs text-text-muted">Floor {location.floor} • {location.wing} Wing</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Badge variant="secondary" className="text-xs">{typeConfig.label}</Badge>
                      <Badge variant={equipConfig.variant} className={cn("text-xs", equipConfig.color)}>{equipConfig.label}</Badge>
                    </div>
                    <div className="w-full">
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
                      <p className="mt-1 text-xs font-mono text-text-muted text-right">{occupancyRate}% • {location.occupied}/{location.capacity}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>{location.staffOnDuty} staff on duty</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted">
                    Updated: {location.lastUpdated}
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