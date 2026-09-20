import { useSidebar } from "@/components/ui/sidebar"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "./Button"

export function CustomTrigger() {
  const { open, toggleSidebar } = useSidebar()
  const TriggerIcon = open ? PanelLeftClose : PanelLeft

  return (
    <Button
      variant="ghost"
      size="md"
      onClick={toggleSidebar}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
    >
      <TriggerIcon className="h-5 w-5 text-text hidden md:block" />
      <PanelLeft className="h-5 w-5 text-text block md:hidden" />
    </Button>
  )
}