import {
  LayoutDashboard, Users, UserPlus, FolderOpen, GanttChart,
  Calendar, CheckCircle, Columns3, Upload, Globe, BarChart3,
  Bell, Archive, PenTool, Palette
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Onboarding", url: "/onboarding", icon: UserPlus },
];

const projectNav = [
  { title: "Gantt Chart", url: "/gantt", icon: GanttChart },
  { title: "Content Calendar", url: "/calendar", icon: Calendar },
  { title: "Task Board", url: "/tasks", icon: Columns3 },
  { title: "Approvals", url: "/approvals", icon: CheckCircle },
  { title: "Creative Upload", url: "/uploads", icon: Upload },
];

const roleNav = [
  { title: "Writer's Workspace", url: "/writer", icon: PenTool },
  { title: "Designer's Workspace", url: "/designer", icon: Palette },
];

const otherNav = [
  { title: "Client Portal", url: "/portal", icon: Globe },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "File Repository", url: "/files", icon: Archive },
];

function NavGroup({ label, items, collapsed }: { label: string; items: typeof mainNav; collapsed: boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">CA</span>
        </div>
        {!collapsed && (
          <div>
            <h2 className="text-sm font-bold text-foreground">CreativeOS</h2>
            <p className="text-[10px] text-muted-foreground">Agency Platform</p>
          </div>
        )}
      </div>
      <SidebarContent className="px-2 py-2">
        <NavGroup label="Overview" items={mainNav} collapsed={collapsed} />
        <NavGroup label="Projects" items={projectNav} collapsed={collapsed} />
        <NavGroup label="Workspaces" items={roleNav} collapsed={collapsed} />
        <NavGroup label="More" items={otherNav} collapsed={collapsed} />
      </SidebarContent>
    </Sidebar>
  );
}
