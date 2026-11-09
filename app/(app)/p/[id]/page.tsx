import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canWork, getAccess } from "@/lib/access";
import { dueState, priorityOf, statusOf, typeOf, type TaskCard } from "@/lib/constants";
import { Board } from "@/components/Board";
import { Avatar } from "@/components/Avatar";
import { TaskPanel } from "@/components/TaskPanel";
import { NewTaskDrawer } from "@/components/NewTaskDrawer";
import { ProjectDrawer } from "@/components/ProjectDrawer";

type SP = { task?: string; view?: string; mine?: string; new?: string; members?: string };

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const me = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const project = await db.project.findUnique({
    where: { id },
    include: { coordinator: true, members: { include: { user: true }, orderBy: { user: { name: "asc" } } } },
  });
  if (!project) notFound();
  const access = await getAccess(me, id);
  const isAdmin = me.role === "ADMIN";

  const [rows, open, allDevs, coordinators] = await Promise.all([
    db.task.findMany({
      where: { projectId: id, ...(sp.mine ? { assigneeId: me.id } : {}) },
      include: { assignee: true, subtasks: { select: { done: true } }, _count: { select: { comments: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    sp.task
      ? db.task.findFirst({
          where: { id: sp.task, projectId: id },
          include: { createdBy: true, subtasks: { orderBy: { position: "asc" } }, comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
        })
      : null,
    sp.members ? db.user.findMany({ where: { role: "DEVELOPER" }, orderBy: { name: "asc" } }) : [],
    sp.members && isAdmin ? db.user.findMany({ where: { role: "COORDINATOR" }, orderBy: { name: "asc" } }) : [],
  ]);

  const tasks: TaskCard[] = rows.map((t) => ({
    id: t.id, number: t.number, title: t.title, status: t.status, priority: t.priority, type: t.type,
    dueDate: t.dueDate?.toISOString() ?? null, comments: t._count.comments,
    labels: t.labels ? t.labels.split(",") : [],
    subtasksTotal: t.subtasks.length, subtasksDone: t.subtasks.filter((s) => s.done).length,
    editable: canWork(access, t.assigneeId, me.id),
    assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name, color: t.assignee.color } : null,
  }));

  const slim = (u: { id: string; name: string; color: string }) => ({ id: u.id, name: u.name, color: u.color });
  const memberUsers = project.members.map((m) => slim(m.user));
  const assignable = [...(project.coordinator ? [slim(project.coordinator)] : []), ...memberUsers];
  if (open?.assigneeId && !assignable.some((u) => u.id === open.assigneeId)) {
    const u = await db.user.findUnique({ where: { id: open.assigneeId } });
    if (u) assignable.push(slim(u));
  }

  const view = sp.view === "list" ? "list" : "board";
  const q = (o: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { view: sp.view, mine: sp.mine, ...o };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : "?";
  };
  const closeHref = q({});
  const tab = (active: boolean) => `rounded-md px-3 py-1 text-sm ${active ? "bg-surface font-medium shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-6">
        <span className="h-4 w-4 rounded" style={{ background: project.color }} />
        <div>
          <h1 className="text-xl font-semibold leading-tight">{project.name}</h1>
          <p className="text-xs text-zinc-400">
            {project.coordinator ? `Coordinator: ${project.coordinator.name}` : "No coordinator assigned"}
            {!access.member && " · View only"}
          </p>
        </div>
        <Link href={q({ members: "1" })} className="ml-2 flex items-center -space-x-1.5" title="Project members">
          {memberUsers.slice(0, 5).map((u) => <span key={u.id} className="rounded-full ring-2 ring-[var(--color-surface)]"><Avatar name={u.name} color={u.color} size={24} /></span>)}
          <span className="pl-3 text-xs text-zinc-400 hover:text-zinc-700">{memberUsers.length} dev{memberUsers.length === 1 ? "" : "s"} · {access.manage ? "Manage" : "View"}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href={q({ mine: sp.mine ? undefined : "1" })} className={`rounded-lg border px-3 py-1 text-sm ${sp.mine ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-surface text-zinc-600"}`}>
            Only mine
          </Link>
          <div className="flex rounded-lg bg-zinc-100 p-0.5">
            <Link href={q({ view: undefined })} className={tab(view === "board")}>Board</Link>
            <Link href={q({ view: "list" })} className={tab(view === "list")}>List</Link>
          </div>
          {access.manage && <Link href={q({ new: "1" })} className="btn">＋ New task</Link>}
        </div>
      </header>

      {view === "board" ? (
        <Board tasks={tasks} />
      ) : (
        <div className="mx-6 mb-6 overflow-auto rounded-xl border border-zinc-200 bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs text-zinc-400">
              <tr><th className="px-4 py-2 font-medium">Task</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium">Priority</th><th className="px-4 py-2 font-medium">Assignee</th><th className="px-4 py-2 font-medium">Due</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tasks.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-400">No tasks yet.</td></tr>}
              {tasks.map((t) => {
                const due = dueState(t.dueDate, t.status);
                return (
                  <tr key={t.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5"><Link href={q({ task: t.id })} className="block">{t.type !== "task" && <span className="mr-1.5 text-xs text-zinc-400">{typeOf(t.type).icon}</span>}{t.title}</Link></td>
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

      {sp.new && access.manage && <NewTaskDrawer projectId={id} assignable={assignable} closeHref={closeHref} />}

      {sp.members && (
        <ProjectDrawer
          projectId={id} name={project.name} closeHref={closeHref} manage={access.manage} isAdmin={isAdmin}
          coordinator={project.coordinator ? slim(project.coordinator) : null}
          members={memberUsers}
          availableDevs={allDevs.filter((d) => !memberUsers.some((m) => m.id === d.id)).map(slim)}
          coordinators={coordinators.map(slim)}
        />
      )}

      {open && (
        <TaskPanel
          projectKey={project.key}
          closeHref={closeHref}
          assignable={assignable}
          perm={{ manage: access.manage, member: access.member, work: canWork(access, open.assigneeId, me.id) }}
          task={{
            id: open.id, number: open.number, title: open.title, description: open.description, status: open.status,
            priority: open.priority, type: open.type, labels: open.labels, estimate: open.estimate,
            assigneeId: open.assigneeId, startDate: open.startDate?.toISOString() ?? null, dueDate: open.dueDate?.toISOString() ?? null,
            createdAt: open.createdAt.toISOString(), createdBy: open.createdBy?.name ?? null,
            subtasks: open.subtasks.map((s) => ({ id: s.id, title: s.title, done: s.done })),
            comments: open.comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), user: slim(c.user) })),
          }}
        />
      )}
    </div>
  );
}
