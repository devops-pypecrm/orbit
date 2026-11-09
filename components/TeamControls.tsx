"use client";
import { useActionState, useState, useTransition } from "react";
import { ROLES } from "@/lib/constants";
import { addMemberAction, removeMemberAction, resetPasswordAction, setRoleAction } from "@/lib/actions";

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMemberAction, undefined);
  return (
    <form action={action} key={state?.ok} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
      <div><label className="label">Name</label><input name="name" className="input" required /></div>
      <div><label className="label">Email</label><input name="email" type="email" className="input" required /></div>
      <div><label className="label">Temporary password</label><input name="password" type="text" minLength={8} className="input" required /></div>
      <div><label className="label">Role</label>
        <select name="role" className="input">{ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn" disabled={pending}>Add account</button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-sm text-emerald-600">{state.ok}</span>}
      </div>
    </form>
  );
}

export function MemberActions({ id, role, isMe }: { id: string; role: string; isMe: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  if (isMe) return <span className="text-xs text-zinc-400">You</span>;
  return (
    <div className={`flex items-center gap-1 text-xs ${pending ? "opacity-50" : ""}`}>
      {msg && <span className="mr-1 text-emerald-600">{msg}</span>}
      <select className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs" value={role}
        onChange={(e) => start(() => setRoleAction(id, e.target.value))}>
        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      <button className="btn-ghost !px-2 !py-1" onClick={() => {
        const p = prompt("New password (min 8 characters)");
        if (p) start(async () => { const r = await resetPasswordAction(id, p); setMsg(r.error ?? r.ok ?? ""); });
      }}>Reset password</button>
      <button className="btn-ghost !px-2 !py-1 hover:!text-red-600" onClick={() => confirm("Remove this account?") && start(() => removeMemberAction(id))}>Remove</button>
    </div>
  );
}
