import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import {
  tasks,
  taskAssignees,
  taskLabels,
  projects,
  users,
  labels,
} from '@/db';
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { searchParams } = new URL(request.url);

  const projectId = searchParams.get('project_id');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const assigneeId = searchParams.get('assignee_id');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const conditions = [];

  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (status) conditions.push(eq(tasks.status, status));
  if (priority) conditions.push(eq(tasks.priority, priority));
  if (search) conditions.push(like(tasks.title, `%${search}%`));

  // Get all active projects for embedding in tasks
  const projectsData = await db
    .select({
      id: projects.id,
      name: projects.name,
      color: projects.color,
    })
    .from(projects)
    .all();

  // Get task IDs assigned to the user if filtering by assignee
  let assigneeTaskIds: string[] | null = null;
  if (assigneeId) {
    // Resolve "me" to current user's ID
    const effectiveAssigneeId = assigneeId === 'me' ? (session.user as { id: string }).id : assigneeId;
    const assignedTasks = await db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, effectiveAssigneeId))
      .all();
    assigneeTaskIds = assignedTasks.map((t) => t.taskId);
    if (assigneeTaskIds.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }
  }

  const orderColumn =
    sort === 'priority'
      ? tasks.priority
      : sort === 'due_date'
        ? tasks.dueDate
        : tasks.createdAt;

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
    .from(tasks);

  if (conditions.length > 0) {
    baseQuery = baseQuery.where(and(...conditions)) as typeof baseQuery;
  }

  if (assigneeTaskIds) {
    baseQuery = baseQuery.where(
      sql`${tasks.id} IN (${sql.join(
        assigneeTaskIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    ) as typeof baseQuery;
  }

  const orderDir = order === 'asc' ? asc : desc;
  const allTasks = await baseQuery.orderBy(orderDir(orderColumn)).all();

  // Get assignees and labels for each task
  const taskIds = allTasks.map((t) => t.id);
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
          taskIds.map((id) => sql`${id}`),
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
          taskIds.map((id) => sql`${id}`),
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

  const tasksWithRelations = allTasks.map((task) => {
    const project = projectsData.find((p: { id: string }) => p.id === task.projectId) || {
      id: task.projectId,
      name: '未知專案',
      color: '#6B7280',
    };
    return {
      ...task,
      project,
      assignees: assigneesMap[task.id] || [],
      labels: labelsMap[task.id] || [],
    };
  });

  const paginatedTasks = tasksWithRelations.slice(offset, offset + limit);

  return NextResponse.json({
    data: paginatedTasks,
    total: tasksWithRelations.length,
    limit,
    offset,
  });
}

export async function POST(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const body = await request.json();

  const { title, projectId, description, priority, dueDate, assigneeIds, labelIds } = body;

  if (!title || !projectId) {
    return NextResponse.json(
      { error: '缺少必要欄位：title, projectId' },
      { status: 400 },
    );
  }

  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    return NextResponse.json({ error: '專案不存在' }, { status: 404 });
  }

  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(tasks).values({
    id: taskId,
    projectId,
    title,
    description: description || null,
    status: 'todo',
    priority: priority || 'p2',
    dueDate: dueDate || null,
    position: 1000,
    createdBy: session.user.id,
    createdAt: now,
    updatedAt: now,
  });

  // Create task assignees
  if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
    const assigneeValues = assigneeIds.map((userId: string) => ({
      id: crypto.randomUUID(),
      taskId,
      userId,
      role: 'assignee' as const,
    }));
    await db.insert(taskAssignees).values(assigneeValues);
  }

  // Create task labels
  if (labelIds && Array.isArray(labelIds) && labelIds.length > 0) {
    const labelValues = labelIds.map((labelId: string) => ({
      taskId,
      labelId,
    }));
    await db.insert(taskLabels).values(labelValues);
  }

  const newTask = await db.select().from(tasks).where(eq(tasks.id, taskId)).get();

  return NextResponse.json({ data: newTask }, { status: 201 });
}