import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteProjectAction } from "@/lib/actions";
import { dueState, priorityOf, statusOf, type TaskCard } from "@/lib/constants";
import { Board } from "@/components/Board";
import { Avatar } from "@/components/Avatar";
import { TaskPanel } from "@/components/TaskPanel";

type SP = { task?: string; view?: string; mine?: string };

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const me = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();

  const [rows, users, open] = await Promise.all([
    db.task.findMany({
      where: { projectId: id, ...(sp.mine ? { assigneeId: me.id } : {}) },
      include: { assignee: true, _count: { select: { comments: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    sp.task
      ? db.task.findFirst({ where: { id: sp.task, projectId: id }, include: { comments: { include: { user: true }, orderBy: { createdAt: "asc" } } } })
      : null,
  ]);

  const tasks: TaskCard[] = rows.map((t) => ({
    id: t.id, number: t.number, title: t.title, status: t.status, priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null, comments: t._count.comments,
    assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, color: t.assignee.color } : null,
  }));

  const view = sp.view === "list" ? "list" : "board";
  const q = (o: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { view: sp.view, mine: sp.mine, ...o };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : "?";
  };
  const closeHref = q({ task: undefined });
  const tab = (active: boolean) => `rounded-md px-3 py-1 text-sm ${active ? "bg-white font-medium shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-6">
        <span className="h-4 w-4 rounded" style={{ background: project.color }} />
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href={q({ mine: sp.mine ? undefined : "1" })} className={`rounded-lg border px-3 py-1 text-sm ${sp.mine ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-white text-zinc-600"}`}>
            Only mine
          </Link>
          <div className="flex rounded-lg bg-zinc-100 p-0.5">
            <Link href={q({ view: undefined })} className={tab(view === "board")}>Board</Link>
            <Link href={q({ view: "list" })} className={tab(view === "list")}>List</Link>
          </div>
          {me.role === "ADMIN" && (
            <form action={async () => { "use server"; await deleteProjectAction(id); }}>
              <button className="btn-ghost text-zinc-400 hover:text-red-600" title="Delete project">🗑</button>
            </form>
          )}
        </div>
      </header>

      {view === "board" ? (
        <Board projectId={id} tasks={tasks} />
      ) : (
        <div className="mx-6 mb-6 overflow-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs text-zinc-400">
              <tr><th className="px-4 py-2 font-medium">Task</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Priority</th><th className="px-4 py-2 font-medium">Assignee</th><th className="px-4 py-2 font-medium">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {tasks.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-400">No tasks yet. Switch to Board to add some.</td></tr>}
              {tasks.map((t) => {
                const due = dueState(t.dueDate, t.status);
                return (
                  <tr key={t.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5"><Link href={q({ task: t.id })} className="block">{t.title}</Link></td>
                    <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${statusOf(t.status).dot}`} />{statusOf(t.status).label}</span></td>
                    <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${priorityOf(t.priority).dot}`} />{priorityOf(t.priority).label}</span></td>
                    <td className="px-4 py-2.5">{t.assignee ? <span className="inline-flex items-center gap-1.5"><Avatar name={t.assignee.name} color={t.assignee.color} size={20} />{t.assignee.name}</span> : <span className="text-zinc-300">—</span>}</td>
                    <td className={`px-4 py-2.5 ${due?.tone ?? ""}`}>{due?.label ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <TaskPanel
          projectKey={project.key}
          closeHref={closeHref}
          users={users}
          task={{
            id: open.id, number: open.number, title: open.title, description: open.description, status: open.status,
            priority: open.priority, assigneeId: open.assigneeId, dueDate: open.dueDate?.toISOString() ?? null,
            createdAt: open.createdAt.toISOString(),
            comments: open.comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), user: { id: c.user.id, name: c.user.name, color: c.user.color } })),
          }}
        />
      )}
    </div>
  );
}
