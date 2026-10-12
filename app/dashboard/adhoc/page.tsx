"use client";

import AdhocWorkspace from "@/components/adhoc/AdhocWorkspace";
import { Toaster } from "sonner";

export default function AdhocPage() {
  return (
    <>
      <AdhocWorkspace />
      <Toaster position="top-right" richColors />
    </>
  );
}
