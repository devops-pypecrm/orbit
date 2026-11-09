import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await getUser()) redirect("/");
  if ((await db.user.count()) === 0) redirect("/setup");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="ProHostix" className="mx-auto mb-3 h-14 w-14 rounded-2xl" />
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-sm text-zinc-500">Sign in to Orbit</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm"><AuthForm mode="login" /></div>
      </div>
    </main>
  );
}
