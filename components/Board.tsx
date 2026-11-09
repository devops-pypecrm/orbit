"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { moveTaskAction } from "@/lib/actions";
import { STATUSES, dueState, priorityOf, typeOf, type TaskCard } from "@/lib/constants";
import { Avatar } from "./Avatar";

export function Board({ tasks: initial }: { tasks: TaskCard[] }) {
  const [tasks, setTasks] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
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
            onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverCol(s.id); } }}
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
                  <div key={t.id} draggable={t.editable}
                    onDragStart={() => setDragId(t.id)} onDragEnd={reset}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(s.id, t.id); }}
                    className={`rounded-lg border border-zinc-200 bg-surface p-3 shadow-sm transition hover:border-indigo-300 ${t.editable ? "cursor-grab active:cursor-grabbing" : ""} ${dragId === t.id ? "opacity-40" : ""}`}
                  >
                    <Link href={`?task=${t.id}`} draggable={false} className="block text-sm leading-snug">
                      {t.type !== "task" && <span className="mr-1.5 text-xs text-zinc-400" title={typeOf(t.type).label}>{typeOf(t.type).icon}</span>}
                      {t.title}
                    </Link>
                    {t.labels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.labels.slice(0, 3).map((l) => <span key={l} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{l}</span>)}
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-400">
                      <span className={`h-2 w-2 rounded-full ${priorityOf(t.priority).dot}`} title={priorityOf(t.priority).label} />
                      {due && <span className={due.tone}>{due.label}</span>}
                      {t.subtasksTotal > 0 && <span>☑ {t.subtasksDone}/{t.subtasksTotal}</span>}
                      {t.comments > 0 && <span>💬 {t.comments}</span>}
                      <span className="ml-auto">{t.assignee && <Avatar name={t.assignee.name} color={t.assignee.color} size={20} />}</span>
                    </div>
                  </div>
                );
              })}
              {col.length === 0 && <p className="px-2 py-4 text-center text-xs text-zinc-400">Nothing here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
