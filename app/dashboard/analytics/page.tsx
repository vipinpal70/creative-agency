import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Performance insights across your content and campaigns.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 py-20 text-center border-2 border-dashed border-gray-100 rounded-xl">
        <BarChart3 className="h-10 w-10 text-gray-200" />
        <p className="text-sm text-gray-500">Analytics is coming soon...</p>
      </div>
    </div>
  );
}
