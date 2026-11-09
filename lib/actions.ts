"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { COLORS, ROLES } from "./constants";
import { createSession, destroySession, requireAdmin, requireUser } from "./auth";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ---------- auth ---------- */

export async function setupAction(_: FormState, fd: FormData): Promise<FormState> {
  if ((await db.user.count()) > 0) return { error: "Workspace is already set up." };
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), password = str(fd, "password");
  if (!name || !email.includes("@")) return { error: "Enter your name and a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const user = await db.user.create({
    data: { name, email, role: "ADMIN", color: COLORS[0], passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase(), password = str(fd, "password");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Wrong email or password." };
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ---------- team (admin) ---------- */

export async function addMemberAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name"), email = str(fd, "email").toLowerCase(), password = str(fd, "password");
  const role = ROLES.find((r) => r.id === str(fd, "role"))?.id ?? "DEVELOPER";
  if (!name || !email.includes("@")) return { error: "Enter a name and a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (await db.user.findUnique({ where: { email } })) return { error: "That email already has an account." };
  const count = await db.user.count();
  await db.user.create({
    data: { name, email, role, color: COLORS[count % COLORS.length], passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/team");
  return { ok: `${name} added. Share the email and password with them.` };
}

export async function setRoleAction(userId: string, role: string) {
  const me = await requireAdmin();
  if (me.id === userId || !ROLES.some((r) => r.id === role)) return;
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/team");
}

export async function resetPasswordAction(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { ok: "Password updated." };
}

export async function removeMemberAction(userId: string) {
  const me = await requireAdmin();
  if (me.id === userId) return;
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/team");
}

/* ---------- projects ---------- */

export async function createProjectAction(fd: FormData) {
  await requireUser();
  const name = str(fd, "name");
  if (!name) return;
  const n = await db.project.count();
  const key = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "PRJ";
  const p = await db.project.create({ data: { name, key, color: COLORS[n % COLORS.length] } });
  revalidatePath("/", "layout");
  redirect(`/p/${p.id}`);
}

export async function deleteProjectAction(id: string) {
  const me = await requireUser();
  if (me.role === "DEVELOPER") throw new Error("Not allowed");
  await db.project.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/");
}

/* ---------- tasks ---------- */

export async function createTaskAction(projectId: string, status: string, title: string) {
  const me = await requireUser();
  title = title.trim();
  if (!title) return;
  const [last, top] = await Promise.all([
    db.task.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { number: true } }),
    db.task.findFirst({ where: { projectId, status }, orderBy: { position: "desc" }, select: { position: true } }),
  ]);
  await db.task.create({
    data: {
      projectId, title, status, number: (last?.number ?? 0) + 1, position: (top?.position ?? -1) + 1,
      assigneeId: me.id,
    },
  });
  revalidatePath(`/p/${projectId}`);
  revalidatePath("/");
}

export async function updateTaskAction(
  id: string,
  patch: { title?: string; description?: string; status?: string; priority?: string; assigneeId?: string | null; dueDate?: string | null },
) {
  await requireUser();
  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) { if (!patch.title.trim()) return; data.title = patch.title.trim(); }
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.assigneeId !== undefined) data.assigneeId = patch.assigneeId || null;
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
  const t = await db.task.update({ where: { id }, data });
  revalidatePath(`/p/${t.projectId}`);
  revalidatePath("/");
}

/** Place `taskId` into `status` with the given final order of ids for that column. */
export async function moveTaskAction(taskId: string, status: string, orderedIds: string[]) {
  await requireUser();
  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { status } }),
    ...orderedIds.map((id, position) => db.task.update({ where: { id }, data: { position } })),
  ]);
  const t = await db.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (t) revalidatePath(`/p/${t.projectId}`);
  revalidatePath("/");
}

export async function deleteTaskAction(id: string) {
  await requireUser();
  const t = await db.task.delete({ where: { id } });
  revalidatePath(`/p/${t.projectId}`);
  revalidatePath("/");
  redirect(`/p/${t.projectId}`);
}

export async function addCommentAction(taskId: string, body: string) {
  const me = await requireUser();
  body = body.trim();
  if (!body) return;
  const c = await db.comment.create({ data: { taskId, body, userId: me.id }, include: { task: true } });
  revalidatePath(`/p/${c.task.projectId}`);
}
