"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { COLORS, PRIORITIES, ROLES, STATUSES, TASK_TYPES } from "./constants";
import { canWork, getAccess } from "./access";
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

/* ---------- helpers ---------- */

const denied = () => new Error("You don't have permission to do that.");
const num = (fd: FormData, k: string) => { const v = str(fd, k); const n = parseFloat(v); return v && !isNaN(n) && n >= 0 ? n : null; };
const dt = (fd: FormData, k: string) => { const v = str(fd, k); return v ? new Date(v) : null; };
const normLabels = (v: string) => [...new Set(v.split(",").map((l) => l.trim()).filter(Boolean))].slice(0, 8).join(",");

async function need(projectId: string, level: "manage" | "member") {
  const user = await requireUser();
  const access = await getAccess(user, projectId);
  if (!access[level]) throw denied();
  return { user, access };
}

async function taskCtx(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  const user = await requireUser();
  return { task, user, access: await getAccess(user, task.projectId) };
}

/** Assignee must be a developer on the project or its coordinator. */
async function validAssignee(projectId: string, userId: string | null) {
  if (!userId) return null;
  const p = await db.project.findUnique({ where: { id: projectId }, select: { coordinatorId: true, members: { where: { userId } } } });
  return p && (p.coordinatorId === userId || p.members.length > 0) ? userId : null;
}

const touch = (projectId: string) => { revalidatePath(`/p/${projectId}`); revalidatePath("/"); };

/* ---------- projects (admin creates & assigns a coordinator) ---------- */

export async function createProjectAction(fd: FormData) {
  await requireAdmin();
  const name = str(fd, "name");
  if (!name) return;
  const coordId = str(fd, "coordinatorId");
  const coordinator = coordId ? await db.user.findFirst({ where: { id: coordId, role: "COORDINATOR" } }) : null;
  const n = await db.project.count();
  const key = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "PRJ";
  const p = await db.project.create({ data: { name, key, color: COLORS[n % COLORS.length], coordinatorId: coordinator?.id ?? null } });
  revalidatePath("/", "layout");
  redirect(`/p/${p.id}`);
}

export async function setCoordinatorAction(fd: FormData) {
  await requireAdmin();
  const projectId = str(fd, "projectId"), coordId = str(fd, "coordinatorId");
  const coordinator = coordId ? await db.user.findFirst({ where: { id: coordId, role: "COORDINATOR" } }) : null;
  await db.project.update({ where: { id: projectId }, data: { coordinatorId: coordinator?.id ?? null } });
  revalidatePath("/", "layout");
}

export async function deleteProjectAction(fd: FormData) {
  await requireAdmin();
  await db.project.delete({ where: { id: str(fd, "projectId") } });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addProjectMemberAction(fd: FormData) {
  const projectId = str(fd, "projectId"), userId = str(fd, "userId");
  await need(projectId, "manage");
  const dev = await db.user.findFirst({ where: { id: userId, role: "DEVELOPER" } });
  if (!dev) return;
  await db.projectMember.createMany({ data: [{ projectId, userId }], skipDuplicates: true });
  revalidatePath("/", "layout");
}

export async function removeProjectMemberAction(fd: FormData) {
  const projectId = str(fd, "projectId"), userId = str(fd, "userId");
  await need(projectId, "manage");
  await db.$transaction([
    db.projectMember.deleteMany({ where: { projectId, userId } }),
    db.task.updateMany({ where: { projectId, assigneeId: userId }, data: { assigneeId: null } }),
  ]);
  revalidatePath("/", "layout");
}

/* ---------- tasks ---------- */

/** New tasks always start in "To do". Only the project's coordinator (or admin) can create them. */
export async function createTaskAction(fd: FormData) {
  const projectId = str(fd, "projectId");
  const { user } = await need(projectId, "manage");
  const title = str(fd, "title");
  if (!title) return;
  const type = TASK_TYPES.find((t) => t.id === str(fd, "type"))?.id ?? "task";
  const priority = PRIORITIES.find((t) => t.id === str(fd, "priority"))?.id ?? "medium";
  const assigneeId = await validAssignee(projectId, str(fd, "assigneeId") || null);
  const checklist = str(fd, "checklist").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 50);
  const [last, top] = await Promise.all([
    db.task.findFirst({ where: { projectId }, orderBy: { number: "desc" }, select: { number: true } }),
    db.task.findFirst({ where: { projectId, status: "todo" }, orderBy: { position: "desc" }, select: { position: true } }),
  ]);
  const t = await db.task.create({
    data: {
      projectId, title, type, priority, assigneeId, createdById: user.id, status: "todo",
      description: str(fd, "description"), labels: normLabels(str(fd, "labels")),
      startDate: dt(fd, "startDate"), dueDate: dt(fd, "dueDate"), estimate: num(fd, "estimate"),
      number: (last?.number ?? 0) + 1, position: (top?.position ?? -1) + 1,
      subtasks: { create: checklist.map((title, position) => ({ title, position })) },
    },
  });
  touch(projectId);
  redirect(`/p/${projectId}?task=${t.id}`);
}

type Patch = {
  title?: string; description?: string; status?: string; priority?: string; type?: string;
  assigneeId?: string | null; dueDate?: string | null; startDate?: string | null; estimate?: number | null; labels?: string;
};

export async function updateTaskAction(id: string, patch: Patch) {
  const { task, user, access } = await taskCtx(id);
  if (!canWork(access, task.assigneeId, user.id)) throw denied();
  // developers working their own task may only change status & description
  if (!access.manage) patch = { status: patch.status, description: patch.description };

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined && patch.title.trim()) data.title = patch.title.trim();
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.status !== undefined && STATUSES.some((s) => s.id === patch.status)) data.status = patch.status;
  if (patch.priority !== undefined && PRIORITIES.some((s) => s.id === patch.priority)) data.priority = patch.priority;
  if (patch.type !== undefined && TASK_TYPES.some((s) => s.id === patch.type)) data.type = patch.type;
  if (patch.assigneeId !== undefined) data.assigneeId = await validAssignee(task.projectId, patch.assigneeId);
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
  if (patch.startDate !== undefined) data.startDate = patch.startDate ? new Date(patch.startDate) : null;
  if (patch.estimate !== undefined) data.estimate = patch.estimate != null && patch.estimate >= 0 ? patch.estimate : null;
  if (patch.labels !== undefined) data.labels = normLabels(patch.labels);
  await db.task.update({ where: { id }, data });
  touch(task.projectId);
}

/** Place `taskId` into `status` with the given final order of ids for that column. */
export async function moveTaskAction(taskId: string, status: string, orderedIds: string[]) {
  const { task, user, access } = await taskCtx(taskId);
  if (!canWork(access, task.assigneeId, user.id) || !STATUSES.some((s) => s.id === status)) throw denied();
  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { status } }),
    ...orderedIds.map((id, position) => db.task.updateMany({ where: { id, projectId: task.projectId }, data: { position } })),
  ]);
  touch(task.projectId);
}

export async function deleteTaskAction(id: string) {
  const { task, access } = await taskCtx(id);
  if (!access.manage) throw denied();
  await db.task.delete({ where: { id } });
  touch(task.projectId);
  redirect(`/p/${task.projectId}`);
}

export async function addCommentAction(taskId: string, body: string) {
  const { task, user, access } = await taskCtx(taskId);
  if (!access.member) throw denied();
  body = body.trim();
  if (!body) return;
  await db.comment.create({ data: { taskId, body, userId: user.id } });
  touch(task.projectId);
}

/* ---------- checklist ---------- */

export async function addSubtaskAction(taskId: string, title: string) {
  const { task, access } = await taskCtx(taskId);
  if (!access.manage || !title.trim()) throw denied();
  const last = await db.subtask.findFirst({ where: { taskId }, orderBy: { position: "desc" } });
  await db.subtask.create({ data: { taskId, title: title.trim(), position: (last?.position ?? -1) + 1 } });
  touch(task.projectId);
}

export async function toggleSubtaskAction(id: string) {
  const st = await db.subtask.findUnique({ where: { id } });
  if (!st) return;
  const { task, user, access } = await taskCtx(st.taskId);
  if (!canWork(access, task.assigneeId, user.id)) throw denied();
  await db.subtask.update({ where: { id }, data: { done: !st.done } });
  touch(task.projectId);
}

export async function deleteSubtaskAction(id: string) {
  const st = await db.subtask.findUnique({ where: { id } });
  if (!st) return;
  const { task, access } = await taskCtx(st.taskId);
  if (!access.manage) throw denied();
  await db.subtask.delete({ where: { id } });
  touch(task.projectId);
}
