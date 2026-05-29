import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { projects, tasks } from '@/db';
import { eq, count, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();

  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
      status: projects.status,
    })
    .from(projects)
    .all();

  const now = new Date().toISOString().split('T')[0];

  const projectsOverview = await Promise.all(
    allProjects.map(async (project) => {
      // Total tasks
      const totalResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          sql`${tasks.projectId} = ${project.id} AND ${tasks.status} != 'cancelled'`,
        )
        .get();

      // Done tasks
      const doneResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          sql`${tasks.projectId} = ${project.id} AND ${tasks.status} = 'done'`,
        )
        .get();

      // Overdue tasks
      const overdueResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          sql`${tasks.projectId} = ${project.id} AND ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${now} AND ${tasks.status} NOT IN ('done', 'cancelled')`,
        )
        .get();

      const totalTasks = totalResult?.count || 0;
      const doneTasks = doneResult?.count || 0;

      return {
        id: project.id,
        name: project.name,
        color: project.color,
        status: project.status,
        totalTasks,
        doneTasks,
        overdueCount: overdueResult?.count || 0,
        progressPercentage: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      };
    }),
  );

  return NextResponse.json({ data: projectsOverview });
}