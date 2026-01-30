import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Home, Bot, GitBranch, Sparkles, Settings } from "lucide-react";
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
  { title: "Traits", url: "/traits", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function NavMain() {
  const location = useLocation();
  // Track optimistic active state for instant visual feedback
  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);

  const isItemActive = (itemUrl: string) => {
    // Use optimistic URL if set, otherwise use actual location
    const activeUrl = optimisticUrl ?? location.pathname;
    return activeUrl === itemUrl || activeUrl.startsWith(itemUrl + "/");
  };

  const handleClick = (url: string) => {
    // Immediately show this item as active
    setOptimisticUrl(url);
    // Clear optimistic state after navigation completes (URL will be source of truth)
    // Use requestAnimationFrame to clear after React Router updates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOptimisticUrl(null);
      });
    });
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isItemActive(item.url)}
                tooltip={item.title}
              >
                <Link to={item.url} onClick={() => handleClick(item.url)}>
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
