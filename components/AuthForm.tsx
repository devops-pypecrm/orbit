"use client";
import { useActionState } from "react";
import { loginAction, setupAction } from "@/lib/actions";

export function AuthForm({ mode }: { mode: "login" | "setup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : setupAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {mode === "setup" && (
        <div><label className="label">Your name</label><input name="name" className="input" required autoFocus /></div>
      )}
      <div><label className="label">Email</label><input name="email" type="email" className="input" required autoFocus={mode === "login"} /></div>
      <div><label className="label">Password</label><input name="password" type="password" className="input" required minLength={mode === "setup" ? 8 : undefined} /></div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "…" : mode === "login" ? "Sign in" : "Create workspace"}</button>
    </form>
  );
}
