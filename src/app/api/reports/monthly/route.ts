import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { tasks, projects, taskAssignees, users } from '@/db';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { searchParams } = new URL(request.url);

  const projectId = searchParams.get('project_id');

  // Get start and end of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const startDate = startOfMonth.toISOString();
  const endDate = endOfMonth.toISOString();
  const today = new Date().toISOString().split('T')[0];

  // Per-member stats
  let memberCondition = '';
  let memberParams: string[] = [];

  if (projectId) {
    memberCondition = 'AND t.project_id = ?';
    memberParams = [projectId];
  }

  // Get all active users
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.status, 'active'))
    .all();

  const memberStats = await Promise.all(
    allUsers.map(async (user) => {
      // Tasks created by this user this month
      let createdCondition = and(
        eq(tasks.createdBy, user.id),
        gte(tasks.createdAt, startDate),
        lte(tasks.createdAt, endDate),
      );
      if (projectId) {
        createdCondition = and(
          eq(tasks.createdBy, user.id),
          eq(tasks.projectId, projectId),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate),
        );
      }

      const createdResult = await db
        .select({ count: count() })
        .from(tasks)
        .where(createdCondition)
        .get();

      // Tasks completed by this user (assigned as owner) this month
      const assignedTaskIds = await db
        .select({ taskId: taskAssignees.taskId })
        .from(taskAssignees)
        .where(eq(taskAssignees.userId, user.id))
        .all();

      let completedResult = { count: 0 };
      if (assignedTaskIds.length > 0) {
        const taskIds = assignedTaskIds.map((t) => t.taskId);
        const completedCondition = and(
          sql`${tasks.id} IN (${sql.join(
            taskIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          eq(tasks.status, 'done'),
          gte(tasks.completedAt, startDate),
          lte(tasks.completedAt, endDate),
        );

        const tempResult = await db
          .select({ count: count() })
          .from(tasks)
          .where(completedCondition)
          .get();
        completedResult = tempResult || { count: 0 };
      }

      // Overdue tasks assigned to this user
      const assignedTaskIdsSet = new Set(assignedTaskIds.map((t) => t.taskId));
      let overdueCount = 0;
      if (assignedTaskIdsSet.size > 0) {
        const overdueCondition = and(
          sql`${tasks.id} IN (${sql.join(
            [...assignedTaskIdsSet].map((id) => sql`${id}`),
            sql`, `,
          )})`,
          sql`${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${today} AND ${tasks.status} NOT IN ('done', 'cancelled')`,
        );

        const overdueResult = await db
          .select({ count: count() })
          .from(tasks)
          .where(overdueCondition)
          .get();
        overdueCount = overdueResult?.count || 0;
      }

      return {
        userId: user.id,
        userName: user.name,
        userAvatarUrl: user.avatarUrl,
        tasksCreated: createdResult?.count || 0,
        tasksCompleted: completedResult.count,
        tasksOverdue: overdueCount,
      };
    }),
  );

  // Per-project stats (if no project filter)
  let projectStats: Array<{
    projectId: string;
    projectName: string;
    projectColor: string;
    tasksCreated: number;
    tasksCompleted: number;
    tasksOverdue: number;
  }> = [];

  if (!projectId) {
    const allProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
      })
      .from(projects)
      .where(eq(projects.status, 'active'))
      .all();

    projectStats = await Promise.all(
      allProjects.map(async (project) => {
        // Created this month
        const createdResult = await db
          .select({ count: count() })
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, project.id),
              gte(tasks.createdAt, startDate),
              lte(tasks.createdAt, endDate),
            ),
          )
          .get();

        // Completed this month
        const completedResult = await db
          .select({ count: count() })
          .from(tasks)
          .where(
            and(
              eq(tasks.projectId, project.id),
              eq(tasks.status, 'done'),
              gte(tasks.completedAt, startDate),
              lte(tasks.completedAt, endDate),
            ),
          )
          .get();

        // Overdue
        const overdueResult = await db
          .select({ count: count() })
          .from(tasks)
          .where(
            sql`${tasks.projectId} = ${project.id} AND ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < ${today} AND ${tasks.status} NOT IN ('done', 'cancelled')`,
          )
          .get();

        return {
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          tasksCreated: createdResult?.count || 0,
          tasksCompleted: completedResult?.count || 0,
          tasksOverdue: overdueResult?.count || 0,
        };
      }),
    );
  }

  return NextResponse.json({
    data: {
      period: {
        start: startDate.split('T')[0],
        end: endDate.split('T')[0],
      },
      memberStats,
      projectStats,
    },
  });
}