import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dueState, priorityOf, statusOf } from "@/lib/constants";

export default async function Home() {
  const user = await requireUser();
  const [mine, projects] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: user.id, status: { not: "done" } },
      include: { project: true },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    db.project.findMany({ include: { tasks: { select: { status: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const overdue = mine.filter((t) => t.dueDate && t.dueDate < now).length;
  const soon = mine.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate.getTime() - now.getTime() <= 3 * 86400000).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <h1 className="text-2xl font-semibold">{greet}, {user.name.split(" ")[0]} 👋</h1>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[["Open tasks", mine.length, "text-zinc-900"], ["Due soon", soon, "text-amber-600"], ["Overdue", overdue, "text-red-600"]].map(([l, n, c]) => (
          <div key={l as string} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className={`text-2xl font-semibold ${c}`}>{n}</div>
            <div className="text-xs text-zinc-500">{l}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-zinc-500">Assigned to you</h2>
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {mine.length === 0 && <p className="p-6 text-center text-sm text-zinc-400">Nothing on your plate. Enjoy it ☕</p>}
        {mine.map((t) => {
          const due = dueState(t.dueDate?.toISOString() ?? null, t.status);
          return (
            <Link key={t.id} href={`/p/${t.projectId}?task=${t.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50">
              <span className={`h-2 w-2 rounded-full ${priorityOf(t.priority).dot}`} title={priorityOf(t.priority).label} />
              <span className="flex-1 truncate">{t.title}</span>
              <span className="hidden text-xs text-zinc-400 sm:inline">{statusOf(t.status).label}</span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-400"><span className="h-2 w-2 rounded-sm" style={{ background: t.project.color }} />{t.project.name}</span>
              {due && <span className={`w-14 text-right text-xs ${due.tone}`}>{due.label}</span>}
            </Link>
          );
        })}
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold text-zinc-500">Projects</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.length === 0 && <p className="text-sm text-zinc-400">No projects yet — create one from the sidebar.</p>}
        {projects.map((p) => {
          const done = p.tasks.filter((t) => t.status === "done").length;
          const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
          return (
            <Link key={p.id} href={`/p/${p.id}`} className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded" style={{ background: p.color }} /><span className="font-medium">{p.name}</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} /></div>
              <div className="mt-1.5 text-xs text-zinc-400">{done}/{p.tasks.length} done · {pct}%</div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
