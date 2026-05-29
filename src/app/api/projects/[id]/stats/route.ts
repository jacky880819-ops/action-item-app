import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { projects, tasks, taskAssignees, users } from '@/db';
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

  const now = new Date().toISOString().split('T')[0];

  // Task count by status
  const statusCounts = await db
    .select({
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .groupBy(tasks.status)
    .all();

  const taskCountByStatus: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    cancelled: 0,
  };

  for (const sc of statusCounts) {
    taskCountByStatus[sc.status] = sc.count;
  }

  const totalTasks = Object.values(taskCountByStatus).reduce((a, b) => a + b, 0);

  // Overdue count (tasks with dueDate before today and not done/cancelled)
  const overdueTasks = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      sql`${tasks.projectId} = ${id} AND ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${now} AND ${tasks.status} NOT IN ('done', 'cancelled')`,
    )
    .get();

  // Completion rate
  const completionRate = totalTasks > 0
    ? Math.round((taskCountByStatus.done / totalTasks) * 100)
    : 0;

  // Member contribution - count of tasks per assignee
  const memberContributions = await db
    .select({
      userId: taskAssignees.userId,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      taskCount: count(),
    })
    .from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.id))
    .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
    .where(eq(tasks.projectId, id))
    .groupBy(taskAssignees.userId, users.name, users.avatarUrl)
    .all();

  return NextResponse.json({
    data: {
      totalTasks,
      taskCountByStatus,
      overdueCount: overdueTasks?.count || 0,
      completionRate,
      memberContributions,
    },
  });
}