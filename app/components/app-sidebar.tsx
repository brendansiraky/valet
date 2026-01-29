import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { NavMain } from "~/components/nav-main";

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
  };
}

export function AppSidebar({ user: _user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Valet
          </span>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  );
}
