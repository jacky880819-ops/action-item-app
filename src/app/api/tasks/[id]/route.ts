import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import {
  tasks,
  taskAssignees,
  taskLabels,
  labels,
  users,
  projects,
  activities,
} from '@/db';
import { eq, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { id } = await params;

  const task = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      position: tasks.position,
      createdBy: tasks.createdBy,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.id, id))
    .get();

  if (!task) {
    return NextResponse.json({ error: '任務不存在' }, { status: 404 });
  }

  // Get project info
  const project = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
    })
    .from(projects)
    .where(eq(projects.id, task.projectId))
    .get();

  // Get assignees
  const assignees = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: taskAssignees.role,
    })
    .from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.id))
    .where(eq(taskAssignees.taskId, id))
    .all();

  // Get labels
  const taskLabelsData = await db
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
    })
    .from(taskLabels)
    .innerJoin(labels, eq(taskLabels.labelId, labels.id))
    .where(eq(taskLabels.taskId, id))
    .all();

  // Get creator info
  const creator = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, task.createdBy))
    .get();

  return NextResponse.json({
    data: {
      ...task,
      project,
      assignees,
      labels: taskLabelsData,
      creator,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { id } = await params;

  const existingTask = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existingTask) {
    return NextResponse.json({ error: '任務不存在' }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields = [
    'title',
    'description',
    'status',
    'priority',
    'dueDate',
    'position',
    'projectId',
  ];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Handle status change with activity log
  if (body.status && body.status !== existingTask.status) {
    // Log status change to activities
    await db.insert(activities).values({
      id: crypto.randomUUID(),
      taskId: id,
      userId: session.user.id,
      event: 'status_changed',
      payload: JSON.stringify({
        oldStatus: existingTask.status,
        newStatus: body.status,
      }),
      createdAt: new Date().toISOString(),
    });

    // If completing the task, set completedAt
    if (body.status === 'done' && !existingTask.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

  const updatedTask = await db.select().from(tasks).where(eq(tasks.id, id)).get();

  return NextResponse.json({ data: updatedTask });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { id } = await params;

  const existingTask = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!existingTask) {
    return NextResponse.json({ error: '任務不存在' }, { status: 404 });
  }

  // Hard delete - completely remove the task and related data
  
  // Delete related records first
  await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
  await db.delete(taskAssignees).where(eq(taskAssignees.taskId, id));
  await db.delete(activities).where(eq(activities.taskId, id));
  
  // Delete the task
  await db.delete(tasks).where(eq(tasks.id, id));

  return NextResponse.json({ 
    message: '任務已刪除',
    data: { id }
  });
}