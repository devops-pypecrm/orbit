import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function Setup() {
  if ((await db.user.count()) > 0) redirect("/login");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 logo h-11 w-11 text-lg">O</div>
          <h1 className="text-xl font-semibold">Set up your workspace</h1>
          <p className="text-sm text-zinc-500">Create the admin account. You can add teammates next.</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-surface p-6 shadow-sm"><AuthForm mode="setup" /></div>
      </div>
    </main>
  );
}
