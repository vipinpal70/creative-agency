"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {Briefcase, ChartBarStacked, Calendar, CheckSquare, BarChart3, Palette, Archive, FolderOpen, LogOut, Loader2 } from "lucide-react";
import logo from "@/public/CO-logo.png";
import shortLogo from "@/public/CO-short-logo.png";

const Icon = {
  Dashboard: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Clients: () => (
    <Briefcase width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Onboarding: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  Gantt: () => (
    <ChartBarStacked width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Calendar: () => (
    <Calendar width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Tasks: () => (
    <CheckSquare width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Approvals: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Upload: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
  Writer: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Designer: () => (
    <Palette width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Archive: () => (
    <Archive width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Portal: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Analytics: () => (
    <BarChart3 width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  ),
  Bell: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Files: () => (
    <FolderOpen width="15" height="15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> 
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Team: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <line x1="12" y1="14" x2="12" y2="14" />
    </svg>
  ),
  Activity: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
};

const NAV_GROUPS = [
  {
    label: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Icon.Dashboard },
      { title: "Clients", href: "/dashboard/clients", icon: Icon.Clients },
      { title: "Onboarding", href: "/dashboard/onboarding", icon: Icon.Onboarding },
      { title: "Team Management", href: "/dashboard/team", icon: Icon.Team },
    ],
  },
  {
    label: "PROJECTS",
    items: [
      { title: "Gantt Chart", href: "/dashboard/gantt-chart", icon: Icon.Gantt },
      { title: "Content Calendar", href: "/dashboard/calendar", icon: Icon.Calendar },
      { title: "Task Board", href: "/dashboard/tasks", icon: Icon.Tasks },
      { title: "Approvals", href: "/dashboard/approvals", icon: Icon.Approvals },
    ],
  },
  {
    label: "WORKSPACES",
    items: [
      { title: "Writer's Workspace", href: "/dashboard/writer", icon: Icon.Writer },
      { title: "Designer's Workspace", href: "/dashboard/designer", icon: Icon.Designer },
    ],
  },
  {
    label: "MORE",
    items: [
      { title: "Analytics", href: "/dashboard/analytics", icon: Icon.Analytics },
      { title: "Notifications", href: "/dashboard/notifications", icon: Icon.Bell },
      { title: "File Repository", href: "/dashboard/files", icon: Icon.Files },
      { title: "Archived", href: "/dashboard/archived", icon: Icon.Archive },
      { title: "Activity Logs", href: "/dashboard/logs", icon: Icon.Activity },
    ],
  },
];

// Component

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* clear the session regardless of the response */
    }
    // Full navigation so all in-memory app state is reset.
    window.location.href = "/sign-in";
  };

  return (
    <aside
      className="relative flex flex-col shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 transition-all duration-300 overflow-hidden"
      style={{ width: collapsed ? 56 : 200 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-100 shrink-0">
      {collapsed ? (
        <Image src={shortLogo} alt="logo" width={100} height={100} className="shrink-0 object-contain" />
      ) : (
        <Image src={logo} alt="logo" width={150} height={150} className="shrink-0 object-contain" />
      )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            {/* Group label */}
            {!collapsed && (
              <p className="text-[10px] font-normal tracking-widest text-gray-400 uppercase px-2 pt-3 pb-1 select-none">
                {group.label}
              </p>
            )}
            {collapsed && <div className="h-2" />}

            {/* Items */}
            {group.items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.title : undefined}
                  className={`
                    flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-150 group relative
                    ${isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    }
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-indigo-500" />
                  )}
                  <span className={`shrink-0 ${isActive ? "text-indigo-500" : "text-gray-600 group-hover:text-gray-600"}`}>
                    <item.icon />
                  </span>
                  {!collapsed && (
                    <span className="font-normal text-gray-800 leading-none">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 mt-2" />
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        title="Log out"
        className={`flex items-center gap-2.5 mx-2 mt-2 px-2 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-all duration-150 shrink-0 disabled:opacity-60 ${collapsed ? "justify-center" : ""}`}
      >
        <span className="shrink-0">
          {loggingOut ? <Loader2 width={15} height={15} className="animate-spin" /> : <LogOut width={15} height={15} strokeWidth={2} />}
        </span>
        {!collapsed && <span className="font-normal leading-none">Log out</span>}
      </button>

      {/* Collapse toggle */}
      <div className="border border-t border-gray-100 mb-2 mt-2"></div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center gap-2 mx-2 mb-3 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all duration-150 shrink-0 border border-gray-300"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
          <Icon.ChevronLeft />
        </span>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
