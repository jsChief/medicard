import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import { AppSidebar } from "../ui/AppSidebar";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <TooltipProvider>
        <SidebarProvider>
      
        <main className="flex-1">
          <Outlet />
        </main>
        
      </SidebarProvider>
      </TooltipProvider>
      <Footer />
    </div>
  );
}
