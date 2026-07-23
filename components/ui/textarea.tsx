import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <div className="relative w-full group">
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          className,
        )}
        ref={ref}
        {...props}
      />
      <div
        className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center justify-center w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity"
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="13" y1="5" x2="5" y2="13" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="13" y1="9" x2="9" y2="13" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="13" y1="13" x2="12.5" y2="13" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
