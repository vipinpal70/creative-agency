import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export default function ClientAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsDashboard variant="client" />
    </Suspense>
  );
}
