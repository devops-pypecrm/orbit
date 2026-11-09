"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createTaskAction, moveTaskAction } from "@/lib/actions";
import { STATUSES, dueState, priorityOf, type TaskCard } from "@/lib/constants";
import { Avatar } from "./Avatar";

export function Board({ projectId, tasks: initial }: { projectId: string; tasks: TaskCard[] }) {
  const [tasks, setTasks] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => setTasks(initial), [initial]);

  function drop(status: string, beforeId: string | null) {
    if (!dragId) return;
    const moving = tasks.find((t) => t.id === dragId);
    if (!moving || dragId === beforeId) return reset();
    const col = tasks.filter((t) => t.status === status && t.id !== dragId);
    const idx = beforeId ? col.findIndex((t) => t.id === beforeId) : col.length;
    col.splice(idx < 0 ? col.length : idx, 0, { ...moving, status });
    setTasks([...tasks.filter((t) => t.status !== status && t.id !== dragId), ...col]);
    start(() => moveTaskAction(dragId, status, col.map((t) => t.id)));
    reset();
  }
  const reset = () => { setDragId(null); setOverCol(null); };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-x-auto p-6 pt-2 md:grid-cols-4">
      {STATUSES.map((s) => {
        const col = tasks.filter((t) => t.status === s.id);
        return (
          <section
            key={s.id}
            onDragOver={(e) => { e.preventDefault(); setOverCol(s.id); }}
            onDrop={(e) => { e.preventDefault(); drop(s.id, null); }}
            className={`flex min-w-64 flex-col rounded-xl p-2 transition ${overCol === s.id ? "bg-indigo-50 ring-2 ring-indigo-200" : "bg-zinc-100/70"}`}
          >
            <header className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}
              <span className="text-xs text-zinc-400">{col.length}</span>
            </header>
            <div className="flex-1 space-y-2">
              {col.map((t) => {
                const due = dueState(t.dueDate, t.status);
                return (
                  <div key={t.id} draggable
                    onDragStart={() => setDragId(t.id)} onDragEnd={reset}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(s.id, t.id); }}
                    className={`cursor-grab rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-indigo-300 active:cursor-grabbing ${dragId === t.id ? "opacity-40" : ""}`}
                  >
                    <Link href={`?task=${t.id}`} draggable={false} className="block text-sm leading-snug">{t.title}</Link>
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-400">
                      <span className={`h-2 w-2 rounded-full ${priorityOf(t.priority).dot}`} title={priorityOf(t.priority).label} />
                      {due && <span className={due.tone}>{due.label}</span>}
                      {t.comments > 0 && <span>💬 {t.comments}</span>}
                      <span className="ml-auto">{t.assignee && <Avatar name={t.assignee.name} color={t.assignee.color} size={20} />}</span>
                    </div>
                  </div>
                );
              })}
              {adding === s.id ? (
                <form
                  action={(fd) => { const title = String(fd.get("title") ?? ""); start(() => createTaskAction(projectId, s.id, title)); setAdding(null); }}
                >
                  <input name="title" autoFocus placeholder="Task title, then Enter" className="input" onBlur={() => setAdding(null)} onKeyDown={(e) => e.key === "Escape" && setAdding(null)} />
                </form>
              ) : (
                <button onClick={() => setAdding(s.id)} className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-zinc-400 hover:bg-white hover:text-zinc-700">＋ Add task</button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
