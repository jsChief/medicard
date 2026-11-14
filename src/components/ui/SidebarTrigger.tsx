import { useSidebar } from "@/components/ui/sidebar"
import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "./Button"
import cardeaseLogo from "@/assets/cardease.png";

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
      <img alt="cardease icon" className="size-12 md:hidden" src={cardeaseLogo}/>
    </Button>
  )
}