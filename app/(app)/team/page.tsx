import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { roleLabel } from "@/lib/constants";
import { Avatar } from "@/components/Avatar";
import { AddMemberForm, MemberActions } from "@/components/TeamControls";

export default async function Team() {
  const me = await requireUser();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { tasks: { where: { status: { not: "done" } } } } } } });
  const admin = me.role === "ADMIN";
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="text-2xl font-semibold">Team</h1>
      <p className="mb-6 text-sm text-zinc-500">{users.length} {users.length === 1 ? "person" : "people"} in your workspace.</p>
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar name={u.name} color={u.color} size={34} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{u.name} <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">{roleLabel(u.role)}</span></div>
              <div className="truncate text-xs text-zinc-400">{u.email} · {u._count.tasks} open</div>
            </div>
            {admin && <MemberActions id={u.id} role={u.role} isMe={u.id === me.id} />}
          </div>
        ))}
      </div>
      {admin && (<><h2 className="mb-2 mt-8 text-sm font-semibold text-zinc-500">Add an account</h2><AddMemberForm /></>)}
    </main>
  );
}
