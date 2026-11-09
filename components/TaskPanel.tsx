"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { addCommentAction, deleteTaskAction, updateTaskAction } from "@/lib/actions";
import { PRIORITIES, STATUSES } from "@/lib/constants";
import { Avatar } from "./Avatar";

type U = { id: string; name: string; color: string };
export type PanelTask = {
  id: string; number: number; title: string; description: string; status: string; priority: string;
  assigneeId: string | null; dueDate: string | null; createdAt: string;
  comments: { id: string; body: string; createdAt: string; user: U }[];
};

export function TaskPanel({ task, users, closeHref, projectKey }: { task: PanelTask; users: U[]; closeHref: string; projectKey: string }) {
  const [pending, start] = useTransition();
  const [comment, setComment] = useState("");
  const save = (patch: Parameters<typeof updateTaskAction>[1]) => start(() => updateTaskAction(task.id, patch));
  const ref = useRef<HTMLFormElement>(null);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link href={closeHref} className="absolute inset-0 bg-zinc-900/20" aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3 text-sm text-zinc-400">
          <span>{projectKey}-{task.number} {pending && "· saving…"}</span>
          <Link href={closeHref} className="rounded-md px-2 py-1 hover:bg-zinc-100">✕</Link>
        </div>
        <div key={task.id} className="space-y-5 p-6">
          <input defaultValue={task.title} onBlur={(e) => e.target.value !== task.title && save({ title: e.target.value })}
            className="w-full rounded-lg px-2 py-1 text-xl font-semibold outline-none hover:bg-zinc-50 focus:bg-zinc-50" />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Status</label>
              <select className="input" defaultValue={task.status} onChange={(e) => save({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select></div>
            <div><label className="label">Priority</label>
              <select className="input" defaultValue={task.priority} onChange={(e) => save({ priority: e.target.value })}>
                {PRIORITIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select></div>
            <div><label className="label">Assignee</label>
              <select className="input" defaultValue={task.assigneeId ?? ""} onChange={(e) => save({ assigneeId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select></div>
            <div><label className="label">Due date</label>
              <input type="date" className="input" defaultValue={task.dueDate?.slice(0, 10) ?? ""} onChange={(e) => save({ dueDate: e.target.value || null })} /></div>
          </div>
          <div><label className="label">Description</label>
            <textarea rows={5} className="input resize-y" placeholder="Add details…" defaultValue={task.description}
              onBlur={(e) => e.target.value !== task.description && save({ description: e.target.value })} /></div>

          <div>
            <label className="label">Comments</label>
            <div className="space-y-3">
              {task.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.user.name} color={c.user.color} size={26} />
                  <div className="min-w-0 flex-1 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    <div className="text-xs text-zinc-400"><b className="text-zinc-700">{c.user.name}</b> · {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <form ref={ref} className="mt-3 flex gap-2" action={() => { const b = comment; setComment(""); start(() => addCommentAction(task.id, b)); }}>
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment…" className="input" />
              <button className="btn" disabled={!comment.trim()}>Send</button>
            </form>
          </div>

          <form action={() => { if (confirm("Delete this task?")) start(() => deleteTaskAction(task.id)); }}>
            <button className="text-xs text-zinc-400 hover:text-red-600">Delete task</button>
          </form>
        </div>
      </aside>
    </div>
  );
}
