export type AIActivity = { id: number; heading: string; state: "working" | "complete" | "failed" | "stopped" };
const empty: AIActivity[] = [];
let activities = empty;
let sequence = 0;
const listeners = new Set<() => void>();
export const activitySnapshot = () => activities;
export const activityServerSnapshot = () => empty;
export function subscribeActivity(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish() { listeners.forEach(listener => listener()); }
export function dismissActivity(id: number) {
  activities = activities.filter(item => item.id !== id);
  publish();
}
export async function withAIActivity<T>(heading: string, complete: string, operation: (update: (heading: string) => void) => Promise<T>): Promise<T> {
  const id = ++sequence;
  const update = (heading: string, state: AIActivity["state"] = "working") => {
    activities = activities.map(item => item.id === id ? { ...item, heading, state } : item);
    publish();
  };
  activities = [...activities, { id, heading, state: "working" }];
  publish();
  try {
    const result = await operation(update);
    update(complete, "complete");
    return result;
  } catch (error) {
    const stopped = error instanceof Error && error.name === "AbortError";
    update(stopped ? "Generation stopped" : `${heading.replace(/…$/, "")} failed`, stopped ? "stopped" : "failed");
    throw error;
  } finally {
    if (typeof window !== "undefined") window.setTimeout(() => dismissActivity(id), 6000);
  }
}
