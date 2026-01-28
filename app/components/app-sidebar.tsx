import { Form } from "react-router";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "~/components/ui/sidebar";
import { NavMain } from "~/components/nav-main";

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            Valet
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
              <span className="text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Form method="post" action="/logout">
              <SidebarMenuButton
                asChild
                tooltip="Sign out"
              >
                <button type="submit" className="w-full">
                  <LogOut />
                  <span>Sign out</span>
                </button>
              </SidebarMenuButton>
            </Form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
