import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { tasks } from '@/db';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { searchParams } = new URL(request.url);

  const projectId = searchParams.get('project_id');

  // Get start and end of current week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startDate = startOfWeek.toISOString();
  const endDate = endOfWeek.toISOString();
  const today = new Date().toISOString().split('T')[0];

  // Build base condition
  let baseCondition = sql`${tasks.status} != 'cancelled'`;
  if (projectId) {
    baseCondition = sql`${tasks.projectId} = ${projectId} AND ${tasks.status} != 'cancelled'`;
  }

  // New tasks created this week
  const newTasksResult = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        baseCondition,
        gte(tasks.createdAt, startDate),
        lte(tasks.createdAt, endDate),
      ),
    )
    .get();

  // Completed tasks this week (marked as done with completedAt in this week)
  const completedTasksResult = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        baseCondition,
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, startDate),
        lte(tasks.completedAt, endDate),
      ),
    )
    .get();

  // Overdue tasks (dueDate < today and not done/cancelled)
  const overdueCondition = projectId
    ? sql`${tasks.projectId} = ${projectId} AND ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${today} AND ${tasks.status} NOT IN ('done', 'cancelled')`
    : sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${today} AND ${tasks.status} NOT IN ('done', 'cancelled')`;

  const overdueTasksResult = await db
    .select({ count: count() })
    .from(tasks)
    .where(overdueCondition)
    .get();

  return NextResponse.json({
    data: {
      period: {
        start: startDate.split('T')[0],
        end: endDate.split('T')[0],
      },
      newTasksCount: newTasksResult?.count || 0,
      completedTasksCount: completedTasksResult?.count || 0,
      overdueTasksCount: overdueTasksResult?.count || 0,
    },
  });
}