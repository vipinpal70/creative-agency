import ContentCalendar from "@/components/calendar/ContentCalendar";

export const metadata = { title: "Content Calendar" };

export default function CalendarPage() {
  return (
    <div className="p-6">
      <ContentCalendar />
    </div>
  );
}
