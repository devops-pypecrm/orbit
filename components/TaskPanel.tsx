"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  addCommentAction, addSubtaskAction, deleteSubtaskAction, deleteTaskAction, toggleSubtaskAction, updateTaskAction,
} from "@/lib/actions";
import { PRIORITIES, STATUSES, TASK_TYPES } from "@/lib/constants";
import { Avatar } from "./Avatar";

type U = { id: string; name: string; color: string };
export type PanelTask = {
  id: string; number: number; title: string; description: string; status: string; priority: string; type: string;
  labels: string; estimate: number | null; assigneeId: string | null; startDate: string | null; dueDate: string | null;
  createdAt: string; createdBy: string | null;
  subtasks: { id: string; title: string; done: boolean }[];
  comments: { id: string; body: string; createdAt: string; user: U }[];
};
export type Perm = { manage: boolean; work: boolean; member: boolean };

export function TaskPanel({ task, assignable, closeHref, projectKey, perm }: {
  task: PanelTask; assignable: U[]; closeHref: string; projectKey: string; perm: Perm;
}) {
  const [pending, start] = useTransition();
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");
  const save = (patch: Parameters<typeof updateTaskAction>[1]) => start(() => updateTaskAction(task.id, patch));
  const done = task.subtasks.filter((s) => s.done).length;
  const readOnly = !perm.manage && !perm.work;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link href={closeHref} className="absolute inset-0 bg-zinc-900/30" aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3 text-sm text-zinc-400">
          <span>{projectKey}-{task.number} {pending && "· saving…"}</span>
          <Link href={closeHref} className="rounded-md px-2 py-1 hover:bg-zinc-100">✕</Link>
        </div>
        <div key={task.id} className="space-y-5 p-6">
          {readOnly && <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-500">View only — you can see this task but it isn’t yours to change.</p>}
          <input defaultValue={task.title} disabled={!perm.manage} onBlur={(e) => e.target.value !== task.title && save({ title: e.target.value })}
            className="w-full rounded-lg bg-transparent px-2 py-1 text-xl font-semibold outline-none hover:bg-zinc-50 focus:bg-zinc-50 disabled:hover:bg-transparent" />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Status</label>
              <select className="input" disabled={readOnly} defaultValue={task.status} onChange={(e) => save({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            <div><label className="label">Priority</label>
              <select className="input" disabled={!perm.manage} defaultValue={task.priority} onChange={(e) => save({ priority: e.target.value })}>
                {PRIORITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            <div><label className="label">Type</label>
              <select className="input" disabled={!perm.manage} defaultValue={task.type} onChange={(e) => save({ type: e.target.value })}>
                {TASK_TYPES.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}</select></div>
            <div><label className="label">Assignee</label>
              <select className="input" disabled={!perm.manage} defaultValue={task.assigneeId ?? ""} onChange={(e) => save({ assigneeId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {assignable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div><label className="label">Start date</label>
              <input type="date" className="input" disabled={!perm.manage} defaultValue={task.startDate?.slice(0, 10) ?? ""} onChange={(e) => save({ startDate: e.target.value || null })} /></div>
            <div><label className="label">Due date</label>
              <input type="date" className="input" disabled={!perm.manage} defaultValue={task.dueDate?.slice(0, 10) ?? ""} onChange={(e) => save({ dueDate: e.target.value || null })} /></div>
            <div><label className="label">Estimate (hours)</label>
              <input type="number" min="0" step="0.5" className="input" disabled={!perm.manage} defaultValue={task.estimate ?? ""}
                onBlur={(e) => save({ estimate: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div><label className="label">Labels</label>
              <input className="input" disabled={!perm.manage} defaultValue={task.labels} placeholder="comma, separated"
                onBlur={(e) => e.target.value !== task.labels && save({ labels: e.target.value })} /></div>
          </div>
          <div><label className="label">Description</label>
            <textarea rows={5} className="input resize-y" disabled={readOnly} placeholder="Add details…" defaultValue={task.description}
              onBlur={(e) => e.target.value !== task.description && save({ description: e.target.value })} /></div>

          <div>
            <label className="label">Checklist {task.subtasks.length > 0 && `· ${done}/${task.subtasks.length}`}</label>
            {task.subtasks.length > 0 && (
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(done / task.subtasks.length) * 100}%` }} />
              </div>
            )}
            <div className="space-y-1">
              {task.subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-zinc-50">
                  <input type="checkbox" checked={s.done} disabled={readOnly} className="h-4 w-4 accent-green-500"
                    onChange={() => start(() => toggleSubtaskAction(s.id))} />
                  <span className={`flex-1 ${s.done ? "text-zinc-400 line-through" : ""}`}>{s.title}</span>
                  {perm.manage && <button className="text-xs text-zinc-300 opacity-0 hover:text-red-600 group-hover:opacity-100" onClick={() => start(() => deleteSubtaskAction(s.id))}>✕</button>}
                </div>
              ))}
            </div>
            {perm.manage && (
              <form className="mt-2 flex gap-2" action={() => { const t = newItem; setNewItem(""); start(() => addSubtaskAction(task.id, t)); }}>
                <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add checklist item…" className="input" />
                <button className="btn" disabled={!newItem.trim()}>Add</button>
              </form>
            )}
          </div>

          <div>
            <label className="label">Comments</label>
            <div className="space-y-3">
              {task.comments.length === 0 && <p className="text-sm text-zinc-400">No comments yet.</p>}
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.user.name} color={c.user.color} size={26} />
                  <div className="min-w-0 flex-1 rounded-lg bg-zinc-100 px-3 py-2 text-sm">
                    <div className="text-xs text-zinc-400"><b className="text-zinc-700">{c.user.name}</b> · {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            {perm.member ? (
              <form className="mt-3 flex gap-2" action={() => { const b = comment; setComment(""); start(() => addCommentAction(task.id, b)); }}>
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" className="input" />
                <button className="btn" disabled={!comment.trim()}>Send</button>
              </form>
            ) : <p className="mt-3 text-xs text-zinc-400">Only people on this project can comment.</p>}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 text-xs text-zinc-400">
            <span>Created {new Date(task.createdAt).toLocaleDateString()}{task.createdBy && ` by ${task.createdBy}`}</span>
            {perm.manage && (
              <button className="hover:text-red-600" onClick={() => confirm("Delete this task?") && start(() => deleteTaskAction(task.id))}>Delete task</button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
