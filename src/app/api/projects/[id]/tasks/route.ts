import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { tasks, taskAssignees, users, labels, taskLabels } from '@/db';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

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
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assigneeId = searchParams.get('assignee_id');
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  const conditions = [eq(tasks.projectId, id)];

  if (status) conditions.push(eq(tasks.status, status));
  if (priority) conditions.push(eq(tasks.priority, priority));

  let baseQuery = db
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
    .where(and(...conditions));

  const orderColumn =
    sort === 'priority'
      ? tasks.priority
      : sort === 'due_date'
        ? tasks.dueDate
        : tasks.createdAt;

  const orderDir = order === 'asc' ? asc : desc;
  const projectTasks = await baseQuery.orderBy(orderDir(orderColumn)).all();

  // Filter by assignee if needed
  let filteredTasks = projectTasks;
  if (assigneeId) {
    const assignedTaskIds = await db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, assigneeId))
      .all();

    const taskIdSet = new Set(assignedTaskIds.map((t) => t.taskId));
    filteredTasks = projectTasks.filter((t) => taskIdSet.has(t.id));
  }

  // Get assignees and labels for each task
  const taskIds = filteredTasks.map((t) => t.id);
  let assigneesMap: Record<string, Array<{ id: string; name: string; avatarUrl: string | null }>> = {};
  let labelsMap: Record<string, Array<{ id: string; name: string; color: string }>> = {};

  if (taskIds.length > 0) {
    const allAssignees = await db
      .select({
        taskId: taskAssignees.taskId,
        userId: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(
        sql`${taskAssignees.taskId} IN (${sql.join(
          taskIds.map((tid) => sql`${tid}`),
          sql`, `,
        )})`,
      )
      .all();

    for (const a of allAssignees) {
      if (!assigneesMap[a.taskId]) assigneesMap[a.taskId] = [];
      assigneesMap[a.taskId].push({
        id: a.userId,
        name: a.name,
        avatarUrl: a.avatarUrl,
      });
    }

    const allTaskLabels = await db
      .select({
        taskId: taskLabels.taskId,
        labelId: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(
        sql`${taskLabels.taskId} IN (${sql.join(
          taskIds.map((tid) => sql`${tid}`),
          sql`, `,
        )})`,
      )
      .all();

    for (const l of allTaskLabels) {
      if (!labelsMap[l.taskId]) labelsMap[l.taskId] = [];
      labelsMap[l.taskId].push({
        id: l.labelId,
        name: l.name,
        color: l.color,
      });
    }
  }

  const tasksWithRelations = filteredTasks.map((task) => ({
    ...task,
    assignees: assigneesMap[task.id] || [],
    labels: labelsMap[task.id] || [],
  }));

  return NextResponse.json({ data: tasksWithRelations });
}