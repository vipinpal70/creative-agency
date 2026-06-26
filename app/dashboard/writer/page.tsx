"use client";

import WriterDashboard from "@/components/writer/WriterDashboard";
import { Toaster } from "sonner";

export default function WriterPage() {
  return (
    <>
      <WriterDashboard />
      <Toaster position="top-right" richColors />
    </>
  );
}
