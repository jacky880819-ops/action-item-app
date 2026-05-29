import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { projects, tasks, users } from '@/db';
import { eq, count, sql } from 'drizzle-orm';

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

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) {
    return NextResponse.json({ error: '專案不存在' }, { status: 404 });
  }

  // Get owner info
  let owner = null;
  if (project.ownerId) {
    owner = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, project.ownerId))
      .get();
  }

  // Get task counts by status
  const statusCounts = await db
    .select({
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .groupBy(tasks.status)
    .all();

  const taskStats = {
    total: 0,
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    cancelled: 0,
  };

  for (const sc of statusCounts) {
    taskStats.total += sc.count;
    if (sc.status in taskStats) {
      taskStats[sc.status as keyof typeof taskStats] = sc.count;
    }
  }

  return NextResponse.json({
    data: {
      ...project,
      owner,
      taskStats,
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

  const existingProject = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!existingProject) {
    return NextResponse.json({ error: '專案不存在' }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields = ['name', 'description', 'color', 'ownerId', 'startDate', 'dueDate'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Handle archive/activate - admin only
  if (body.status && body.status !== existingProject.status) {
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: '只有管理員可以封存/啟用專案' }, { status: 403 });
    }
    updates.status = body.status;
  }

  await db.update(projects).set(updates).where(eq(projects.id, id)).run();

  const updatedProject = await db.select().from(projects).where(eq(projects.id, id)).get();

  return NextResponse.json({ data: updatedProject });
}