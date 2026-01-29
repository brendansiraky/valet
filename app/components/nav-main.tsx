import { Link, useLocation } from "react-router";
import { Home, Bot, GitBranch, FileText, Sparkles, Settings } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "~/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Agents", url: "/agents", icon: Bot },
  { title: "Pipelines", url: "/pipelines", icon: GitBranch },
  { title: "Artifacts", url: "/artifacts", icon: FileText },
  { title: "Traits", url: "/traits", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NavMain() {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.url || location.pathname.startsWith(item.url + "/")}
                tooltip={item.title}
              >
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
