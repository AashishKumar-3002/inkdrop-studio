"use client";

import { useSyncExternalStore } from "react";
import { Check, Loader2, Square, TriangleAlert, X } from "lucide-react";
import { activityServerSnapshot, activitySnapshot, dismissActivity, subscribeActivity } from "@/lib/aiActivity";

export default function AIActivityPanel() {
  const activities = useSyncExternalStore(subscribeActivity, activitySnapshot, activityServerSnapshot);
  if (!activities.length) return null;
  return (
    <aside aria-label="AI activity" className="fixed bottom-5 left-4 z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
      <h2 className="border-b border-line px-4 py-3 text-xs font-medium text-ink-muted">AI activity</h2>
      <div className="max-h-[40vh] overflow-y-auto" role="status" aria-live="polite" aria-atomic="true">
        {activities.map(item => {
          const Icon = item.state === "working" ? Loader2 : item.state === "complete" ? Check : item.state === "stopped" ? Square : TriangleAlert;
          return (
            <div key={item.id} className="flex items-center gap-2.5 px-4 py-3">
              <Icon aria-hidden className={`h-4 w-4 shrink-0 ${item.state === "working" ? "motion-safe:animate-spin text-accent" : item.state === "failed" ? "text-danger" : "text-ink-muted"}`} />
              <h3 className="flex-1 text-[13px] font-medium text-ink">{item.heading}</h3>
              {item.state !== "working" && <button type="button" onClick={() => dismissActivity(item.id)} aria-label={`Dismiss ${item.heading}`} className="rounded p-1 text-ink-subtle hover:text-ink"><X className="h-3.5 w-3.5" /></button>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
