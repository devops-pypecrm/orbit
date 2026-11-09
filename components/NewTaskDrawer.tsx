import Link from "next/link";
import { createTaskAction } from "@/lib/actions";
import { PRIORITIES, TASK_TYPES } from "@/lib/constants";

type U = { id: string; name: string };

export function NewTaskDrawer({ projectId, assignable, closeHref }: { projectId: string; assignable: U[]; closeHref: string }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link href={closeHref} className="absolute inset-0 bg-zinc-900/30" aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
          <div><div className="font-semibold">New task</div><div className="text-xs text-zinc-400">Starts in “To do”</div></div>
          <Link href={closeHref} className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100">✕</Link>
        </div>
        <form action={createTaskAction} className="space-y-4 p-6">
          <input type="hidden" name="projectId" value={projectId} />
          <div><label className="label">Title *</label><input name="title" className="input" required autoFocus placeholder="What needs to be done?" /></div>
          <div><label className="label">Description</label><textarea name="description" rows={4} className="input resize-y" placeholder="Context, acceptance criteria, links…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label>
              <select name="type" className="input">{TASK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}</select></div>
            <div><label className="label">Priority</label>
              <select name="priority" className="input" defaultValue="medium">{PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
            <div className="col-span-2"><label className="label">Assign to</label>
              <select name="assigneeId" className="input" defaultValue="">
                <option value="">Unassigned</option>
                {assignable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {assignable.length === 0 && <p className="mt-1 text-xs text-zinc-400">Add developers to this project (Members) to assign work.</p>}
            </div>
            <div><label className="label">Start date</label><input type="date" name="startDate" className="input" /></div>
            <div><label className="label">Due date</label><input type="date" name="dueDate" className="input" /></div>
            <div><label className="label">Estimate (hours)</label><input type="number" name="estimate" min="0" step="0.5" className="input" /></div>
            <div><label className="label">Labels (comma separated)</label><input name="labels" className="input" placeholder="frontend, urgent" /></div>
          </div>
          <div><label className="label">Checklist (one item per line)</label><textarea name="checklist" rows={4} className="input resize-y" placeholder={"Design review\nImplement\nQA"} /></div>
          <button className="btn w-full">Create task</button>
        </form>
      </aside>
    </div>
  );
}
