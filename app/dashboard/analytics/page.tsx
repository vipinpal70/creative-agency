import { Suspense } from "react";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsDashboard variant="staff" />
    </Suspense>
  );
}
