import { db } from "./db";

export type Actor = { id: string; role: string };
export type Access = { manage: boolean; member: boolean };

/**
 * manage: admin, or the coordinator assigned to this project
 * member: manage, or a developer added to this project
 * Everyone signed in can VIEW everything; these flags only gate actions.
 */
export async function getAccess(user: Actor, projectId: string): Promise<Access> {
  if (user.role === "ADMIN") return { manage: true, member: true };
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: { coordinatorId: true, members: { where: { userId: user.id }, select: { userId: true } } },
  });
  if (!p) return { manage: false, member: false };
  const manage = user.role === "COORDINATOR" && p.coordinatorId === user.id;
  return { manage, member: manage || p.members.length > 0 };
}

/** Can this user change (status/description/checklist of) a task? Managers: any. Members: only tasks assigned to them. */
export const canWork = (a: Access, assigneeId: string | null, userId: string) =>
  a.manage || (a.member && assigneeId === userId);
