// app/client/layout.tsx — server component wrapping all /client portal pages
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientSidebar } from "@/components/ClientSidebar";

export const metadata: Metadata = {
  title: "Client Portal — CreativeOS",
  description: "Your projects, approvals and files.",
};

export default async function ClientPortalLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  // Defense in depth: middleware already routes non-clients away, but guard here too.
  if (session.role !== "client") redirect("/dashboard");

  const initials = session.email.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased flex">
      <ClientSidebar />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-end border-b border-gray-100 bg-white px-5 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <Link
              href="/client/notifications"
              className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Notifications"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </Link>

            <div className="w-px h-5 bg-gray-100" />

            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-[11px] cursor-pointer">
              {initials}
            </div>

            <div className="hidden sm:flex flex-col items-start">
              <span className="text-[11px] font-semibold text-gray-700 leading-none">{session.email}</span>
              <span className="text-[9px] text-gray-400 capitalize mt-0.5">Client</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
