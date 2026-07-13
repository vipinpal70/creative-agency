// app/dashboard/layout.tsx — server component that wraps all /dashboard pages
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "./AppSidebar";

export const metadata: Metadata = {
  title: "Dashboard — CreativeOS",
  description: "CreativeOS agency command center.",
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  // Defense in depth: middleware already routes clients to /client, but guard
  // here too so no staff page ever renders for a client account.
  if (session.role === "client") redirect("/client");

  const initials = session.email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased flex">

      {/* ── Sidebar (client component) ─────────────────────────────────── */}
      <AppSidebar />

      {/* ── Main column ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-end border-b border-gray-100 bg-white px-5 shrink-0 sticky top-0 z-30">

          {/* Right — notifications + user avatar */}
          <div className="flex items-center gap-2.5">
            {/* Bell */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Notifications"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {/* dot */}
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </Link>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-100" />

            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-[11px] cursor-pointer">
              {initials}
            </div>

            {/* User info */}
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-[11px] font-semibold text-gray-700 leading-none">{session.email}</span>
              <span className="text-[9px] text-gray-400 capitalize mt-0.5">{session.role}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
