"use client";

import WriterDashboard from "@/components/writer/WriterDashboard";
import { Toaster } from "sonner";

export default function WriterPage() {
  return (
    <div className="max-w-7xl bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm">
      <WriterDashboard />
      <Toaster position="top-right" richColors />
    </div>
  );
}
