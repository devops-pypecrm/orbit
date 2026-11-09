import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createProjectAction, logoutAction } from "@/lib/actions";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const projects = await db.project.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-white p-3 md:flex">
        <Link href="/" className="mb-4 flex items-center gap-2 px-2 py-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">O</span>
          <span className="font-semibold">Orbit</span>
        </Link>
        <nav className="space-y-0.5 text-sm">
          <Link href="/" className="block rounded-lg px-2.5 py-1.5 hover:bg-zinc-100">🏠 My work</Link>
          <Link href="/team" className="block rounded-lg px-2.5 py-1.5 hover:bg-zinc-100">👥 Team</Link>
        </nav>
        <div className="mb-1 mt-5 px-2.5 text-xs font-medium uppercase tracking-wide text-zinc-400">Projects</div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto text-sm">
          {projects.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-zinc-100">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-100">＋ New project</summary>
            <form action={createProjectAction} className="p-1.5">
              <input name="name" placeholder="Project name" className="input" required autoFocus />
            </form>
          </details>
        </nav>
        <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
          <Avatar name={user.name} color={user.color} size={28} />
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-medium leading-tight">{user.name}</div>
            <div className="text-xs text-zinc-400">{user.role === "ADMIN" ? "Admin" : "Member"}</div>
          </div>
          <form action={logoutAction}><button className="rounded-md p-1.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Sign out">⏻</button></form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 overflow-x-auto border-b border-zinc-200 bg-white px-4 py-2.5 text-sm md:hidden">
          <Link href="/" className="font-semibold">Orbit</Link>
          <Link href="/team" className="text-zinc-500">Team</Link>
          {projects.map((p) => <Link key={p.id} href={`/p/${p.id}`} className="whitespace-nowrap text-zinc-500">{p.name}</Link>)}
        </div>
        {children}
      </div>
    </div>
  );
}
