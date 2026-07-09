import { Bell } from "lucide-react";

export default function ClientNotificationsPage() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5" /> Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Updates about your content, approvals and deliverables.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 py-20 text-center border-2 border-dashed border-gray-100 rounded-xl">
        <Bell className="h-10 w-10 text-gray-200" />
        <p className="text-sm text-gray-500">You&apos;re all caught up — no notifications yet.</p>
      </div>
    </div>
  );
}
