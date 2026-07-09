"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, UserCircle, ChartBarStacked, ShieldCheck,
  Calendar, Bell, FolderOpen, BarChart3, ChevronLeft, LogOut, Loader2,
} from "lucide-react";
import logo from "@/public/CO-logo.png";
import shortLogo from "@/public/CO-short-logo.png";

// Client portal navigation. Mirrors the internal AppSidebar styling but exposes
// only the surfaces a client is allowed to use.
const NAV_GROUPS = [
  {
    label: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/client", icon: LayoutDashboard, exact: true },
      { title: "My Profile", href: "/client/profile", icon: UserCircle },
    ],
  },
  {
    label: "PROJECTS",
    items: [
      { title: "Gantt Chart", href: "/client/gantt-chart", icon: ChartBarStacked },
      { title: "Content Calendar", href: "/client/calendar", icon: Calendar },
      { title: "Approvals", href: "/client/approvals", icon: ShieldCheck },
    ],
  },
  {
    label: "MORE",
    items: [
      { title: "Analytics", href: "/client/analytics", icon: BarChart3 },
      { title: "Notifications", href: "/client/notifications", icon: Bell },
      { title: "File Repository", href: "/client/files", icon: FolderOpen },
    ],
  },
];

export function ClientSidebar() {
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
            {!collapsed && (
              <p className="text-[10px] font-normal tracking-widest text-gray-400 uppercase px-2 pt-3 pb-1 select-none">
                {group.label}
              </p>
            )}
            {collapsed && <div className="h-2" />}

            {group.items.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const ItemIcon = item.icon;

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
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-indigo-500" />
                  )}
                  <span className={`shrink-0 ${isActive ? "text-indigo-500" : "text-gray-600 group-hover:text-gray-600"}`}>
                    <ItemIcon width={15} height={15} strokeWidth={2} />
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
      <div className="border border-t border-gray-100 mb-2 mt-2" />
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center gap-2 mx-2 mb-3 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all duration-150 shrink-0 border border-gray-300"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
          <ChevronLeft width={14} height={14} strokeWidth={2.5} />
        </span>
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
