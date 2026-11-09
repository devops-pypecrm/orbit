import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createProjectAction, logoutAction } from "@/lib/actions";
import { roleLabel } from "@/lib/constants";
import { Avatar } from "@/components/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, coordinators] = await Promise.all([
    db.project.findMany({ orderBy: { createdAt: "asc" }, include: { members: { select: { userId: true } } } }),
    user.role === "ADMIN" ? db.user.findMany({ where: { role: "COORDINATOR" }, orderBy: { name: "asc" } }) : [],
  ]);
  const isMine = (p: (typeof projects)[number]) => p.coordinatorId === user.id || p.members.some((m) => m.userId === user.id);
  const mine = projects.filter(isMine);
  const others = projects.filter((p) => !isMine(p));
  const link = (p: (typeof projects)[number]) => (
    <Link key={p.id} href={`/p/${p.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
      <span className="truncate">{p.name}</span>
    </Link>
  );
  const head = "mb-1 mt-4 px-2.5 text-xs font-medium uppercase tracking-wide text-zinc-400";

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-surface p-3 md:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2 py-1.5">
          <img src="/logo.png" alt="ProHostix" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold">Orbit</span>
        </Link>
        <nav className="space-y-0.5 text-sm">
          <Link href="/" className="block rounded-lg px-2.5 py-1.5 hover:bg-zinc-100">🏠 My work</Link>
          <Link href="/team" className="block rounded-lg px-2.5 py-1.5 hover:bg-zinc-100">👥 Team</Link>
        </nav>
        <nav className="flex-1 overflow-y-auto text-sm">
          {mine.length > 0 && <div className={head}>My projects</div>}
          <div className="space-y-0.5">{mine.map(link)}</div>
          {others.length > 0 && <div className={head}>{mine.length ? "Other projects" : "Projects"}</div>}
          <div className="space-y-0.5">{others.map(link)}</div>
          {user.role === "ADMIN" && (
            <details className="mt-2">
              <summary className="cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-100">＋ New project</summary>
              <form action={createProjectAction} className="space-y-2 p-1.5">
                <input name="name" placeholder="Project name" className="input" required autoFocus />
                <select name="coordinatorId" className="input" defaultValue="">
                  <option value="">No coordinator yet</option>
                  {coordinators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {coordinators.length === 0 && <p className="text-xs text-zinc-400">Add a Project Coordinator on the Team page first.</p>}
                <button className="btn w-full">Create project</button>
              </form>
            </details>
          )}
        </nav>
        <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
          <Avatar name={user.name} color={user.color} size={28} />
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-medium leading-tight">{user.name}</div>
            <div className="truncate text-xs text-zinc-400">{roleLabel(user.role)}</div>
          </div>
          <ThemeToggle />
          <form action={logoutAction}><button className="rounded-md p-1.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Sign out">⏻</button></form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 overflow-x-auto border-b border-zinc-200 bg-surface px-4 py-2.5 text-sm md:hidden">
          <Link href="/" className="font-semibold">Orbit</Link>
          <Link href="/team" className="text-zinc-500">Team</Link>
          {projects.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="whitespace-nowrap text-zinc-500">{p.name}</Link>)}
          <span className="ml-auto flex items-center"><ThemeToggle /><form action={logoutAction}><button className="p-1.5 text-zinc-400">⏻</button></form></span>
        </div>
        {children}
      </div>
    </div>
  );
}
