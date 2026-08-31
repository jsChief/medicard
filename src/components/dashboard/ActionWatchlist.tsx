import { AlertCircle, Clock, ArrowRight, ExternalLink, User, Building2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn, formatDate } from "@/lib/utils"

interface OverdueCard {
  id: string
  patientName: string
  patientId: string
  cardType: "admission" | "discharge" | "transfer" | "referral" | "hmo"
  department: string
  dueDate: string
  daysOverdue: number
  priority: "low" | "medium" | "high" | "critical"
  assignedTo?: string
  hmoProvider?: string
}

const mockOverdueCards: OverdueCard[] = [
  {
    id: "PC-2024-001234",
    patientName: "Maria Santos",
    patientId: "PAT-789456",
    cardType: "discharge",
    department: "Cardiology",
    dueDate: "2024-01-15",
    daysOverdue: 5,
    priority: "critical",
    assignedTo: "Dr. James Doe",
  },
  {
    id: "PC-2024-001235",
    patientName: "Robert Chen",
    patientId: "PAT-789457",
    cardType: "hmo",
    department: "Orthopedics",
    dueDate: "2024-01-16",
    daysOverdue: 4,
    priority: "high",
    hmoProvider: "PhilHealth",
  },
  {
    id: "PC-2024-001236",
    patientName: "Jennifer Lopez",
    patientId: "PAT-789458",
    cardType: "transfer",
    department: "ICU",
    dueDate: "2024-01-17",
    daysOverdue: 3,
    priority: "high",
    assignedTo: "Nurse Sarah Wilson",
  },
  {
    id: "PC-2024-001237",
    patientName: "Michael Brown",
    patientId: "PAT-789459",
    cardType: "admission",
    department: "Emergency",
    dueDate: "2024-01-18",
    daysOverdue: 2,
    priority: "medium",
  },
  {
    id: "PC-2024-001238",
    patientName: "Lisa Anderson",
    patientId: "PAT-789460",
    cardType: "referral",
    department: "Neurology",
    dueDate: "2024-01-19",
    daysOverdue: 1,
    priority: "medium",
    assignedTo: "Dr. Emily Davis",
  },
  {
    id: "PC-2024-001239",
    patientName: "David Wilson",
    patientId: "PAT-789461",
    cardType: "hmo",
    department: "Oncology",
    dueDate: "2024-01-19",
    daysOverdue: 1,
    priority: "high",
    hmoProvider: "Maxicare",
  },
  {
    id: "PC-2024-001240",
    patientName: "Amanda Taylor",
    patientId: "PAT-789462",
    cardType: "discharge",
    department: "Pediatrics",
    dueDate: "2024-01-20",
    daysOverdue: 0,
    priority: "low",
  },
]

function getPriorityConfig(priority: OverdueCard["priority"]) {
  switch (priority) {
    case "critical":
      return { label: "Critical", variant: "danger" as const, icon: AlertCircle, color: "text-danger" }
    case "high":
      return { label: "High", variant: "warning" as const, icon: AlertCircle, color: "text-warning" }
    case "medium":
      return { label: "Medium", variant: "primary" as const, icon: Clock, color: "text-primary" }
    case "low":
      return { label: "Low", variant: "secondary" as const, icon: Clock, color: "text-text-muted" }
  }
}

function getCardTypeConfig(type: OverdueCard["cardType"]) {
  switch (type) {
    case "admission":
      return { label: "Admission", color: "bg-blue-100 text-blue-700" }
    case "discharge":
      return { label: "Discharge", color: "bg-green-100 text-green-700" }
    case "transfer":
      return { label: "Transfer", color: "bg-purple-100 text-purple-700" }
    case "referral":
      return { label: "Referral", color: "bg-orange-100 text-orange-700" }
    case "hmo":
      return { label: "HMO", color: "bg-red-100 text-red-700" }
  }
}

export function ActionWatchlist() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Action Watchlist — Overdue Cards</CardTitle>
        <Button variant="ghost" size="sm">
          <ArrowRight className="h-4 w-4 mr-1" />
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Card Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Overdue</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Assigned</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockOverdueCards.map((card) => {
                const priorityConfig = getPriorityConfig(card.priority)
                const typeConfig = getCardTypeConfig(card.cardType)
                const PriorityIcon = priorityConfig.icon
                const isCritical = card.priority === "critical" || card.priority === "high"

                return (
                  <tr
                    key={card.id}
                    className={cn(
                      "hover:bg-bg/50 transition-colors",
                      isCritical && "bg-danger/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text">{card.patientName}</p>
                        <p className="text-xs text-text-muted">{card.patientId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium", typeConfig.color)}>
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-text-muted">
                        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {card.department}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-text">{formatDate(card.dueDate)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        card.daysOverdue > 0 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                      )}>
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {card.daysOverdue > 0 ? `${card.daysOverdue}d overdue` : "Due today"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={priorityConfig.variant} className="gap-1">
                        <PriorityIcon className="h-3 w-3" aria-hidden="true" />
                        {priorityConfig.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {card.assignedTo ? (
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <User className="h-3.5 w-3.5" aria-hidden="true" />
                          {card.assignedTo}
                        </div>
                      ) : card.hmoProvider ? (
                        <div className="flex items-center gap-1.5 text-sm text-text-muted">
                          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {card.hmoProvider}
                        </div>
                      ) : (
                        <span className="text-sm text-text-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Showing {mockOverdueCards.length} overdue cards
        </p>
        <Button variant="outline" size="sm">
          <ArrowRight className="h-4 w-4 mr-1" />
          Manage All
        </Button>
      </CardFooter>
    </Card>
  )
}