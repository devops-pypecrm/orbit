export const STATUSES = [
  { id: "todo", label: "To do", dot: "bg-zinc-400" },
  { id: "doing", label: "In progress", dot: "bg-blue-500" },
  { id: "review", label: "Review", dot: "bg-amber-500" },
  { id: "done", label: "Done", dot: "bg-emerald-500" },
] as const;

export const PRIORITIES = [
  { id: "low", label: "Low", dot: "bg-zinc-300" },
  { id: "medium", label: "Medium", dot: "bg-sky-400" },
  { id: "high", label: "High", dot: "bg-orange-400" },
  { id: "urgent", label: "Urgent", dot: "bg-red-500" },
] as const;

export const ROLES = [
  { id: "ADMIN", label: "Admin" },
  { id: "COORDINATOR", label: "Project Coordinator" },
  { id: "DEVELOPER", label: "Developer" },
] as const;
export const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

export const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#ef4444", "#14b8a6"];

export const statusOf = (id: string) => STATUSES.find((s) => s.id === id) ?? STATUSES[0];
export const priorityOf = (id: string) => PRIORITIES.find((p) => p.id === id) ?? PRIORITIES[1];

export type TaskCard = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; name: string; color: string } | null;
  comments: number;
};

export function dueState(iso: string | null, status: string) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (status === "done") return { label, tone: "text-zinc-400" };
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label, tone: "text-red-600" };
  if (diff <= 2) return { label, tone: "text-amber-600" };
  return { label, tone: "text-zinc-500" };
}
