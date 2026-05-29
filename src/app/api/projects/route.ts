import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { projects, tasks, users } from '@/db';
import { eq, count, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status') || 'active';

  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      status: projects.status,
      ownerId: projects.ownerId,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.status, status))
    .all();

  // Get task count for each project
  const projectsWithStats = await Promise.all(
    allProjects.map(async (project) => {
      const taskCountResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          sql`${tasks.projectId} = ${project.id} AND ${tasks.status} != 'cancelled'`,
        )
        .get();

      // Get owner info if exists
      let owner = null;
      if (project.ownerId) {
        owner = await db
          .select({
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(eq(users.id, project.ownerId))
          .get();
      }

      return {
        ...project,
        taskCount: taskCountResult?.count || 0,
        owner,
      };
    }),
  );

  return NextResponse.json({ data: projectsWithStats });
}

export async function POST(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // Admin only for creating projects
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理員可以建立專案' }, { status: 403 });
  }

  const db = await initDb();
  const body = await request.json();

  const { name, description, color, ownerId, startDate, dueDate } = body;

  if (!name) {
    return NextResponse.json({ error: '缺少必要欄位：name' }, { status: 400 });
  }

  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(projects).values({
    id: projectId,
    name,
    description: description || null,
    color: color || '#3B82F6',
    status: 'active',
    ownerId: ownerId || session.user.id,
    startDate: startDate || null,
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  });

  const newProject = await db.select().from(projects).where(eq(projects.id, projectId)).get();

  return NextResponse.json({ data: newProject }, { status: 201 });
}