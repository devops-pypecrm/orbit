import Link from "next/link";
import { addProjectMemberAction, deleteProjectAction, removeProjectMemberAction, setCoordinatorAction } from "@/lib/actions";
import { Avatar } from "./Avatar";
import { ConfirmButton } from "./ConfirmButton";

type U = { id: string; name: string; color: string };

export function ProjectDrawer(props: {
  projectId: string; name: string; closeHref: string; manage: boolean; isAdmin: boolean;
  coordinator: U | null; members: U[]; availableDevs: U[]; coordinators: U[];
}) {
  const { projectId, manage, isAdmin } = props;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <Link href={props.closeHref} className="absolute inset-0 bg-zinc-900/30" aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-3">
          <div><div className="font-semibold">{props.name}</div><div className="text-xs text-zinc-400">People on this project</div></div>
          <Link href={props.closeHref} className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-100">✕</Link>
        </div>
        <div className="space-y-6 p-6">
          <section>
            <div className="label">Project coordinator</div>
            {props.coordinator ? (
              <div className="flex items-center gap-2 text-sm"><Avatar name={props.coordinator.name} color={props.coordinator.color} size={26} />{props.coordinator.name}</div>
            ) : <p className="text-sm text-zinc-400">Not assigned — admins manage this project.</p>}
            {isAdmin && (
              <form action={setCoordinatorAction} className="mt-2 flex gap-2">
                <input type="hidden" name="projectId" value={projectId} />
                <select name="coordinatorId" className="input" defaultValue={props.coordinator?.id ?? ""}>
                  <option value="">No coordinator</option>
                  {props.coordinators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn">Save</button>
              </form>
            )}
          </section>

          <section>
            <div className="label">Developers ({props.members.length})</div>
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {props.members.length === 0 && <p className="p-3 text-sm text-zinc-400">No developers yet.</p>}
              {props.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Avatar name={m.name} color={m.color} size={24} /><span className="flex-1">{m.name}</span>
                  {manage && (
                    <form action={removeProjectMemberAction}>
                      <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="userId" value={m.id} />
                      <ConfirmButton message={`Remove ${m.name}? Their tasks here become unassigned.`} className="text-xs text-zinc-400 hover:text-red-600">Remove</ConfirmButton>
                    </form>
                  )}
                </div>
              ))}
            </div>
            {manage && (
              <form action={addProjectMemberAction} className="mt-3 flex gap-2">
                <input type="hidden" name="projectId" value={projectId} />
                <select name="userId" className="input" required defaultValue="">
                  <option value="" disabled>Add a developer…</option>
                  {props.availableDevs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button className="btn">Add</button>
              </form>
            )}
          </section>

          {isAdmin && (
            <form action={deleteProjectAction}>
              <input type="hidden" name="projectId" value={projectId} />
              <ConfirmButton message="Delete this project and all its tasks?" className="text-xs text-zinc-400 hover:text-red-600">Delete project</ConfirmButton>
            </form>
          )}
        </div>
      </aside>
    </div>
  );
}
