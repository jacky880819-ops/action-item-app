import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { tasks, activities } from '@/db';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress', 'review', 'done', 'cancelled'],
  in_progress: ['todo', 'review', 'done', 'cancelled'],
  review: ['in_progress', 'done', 'cancelled'],
  done: ['todo'], // Can reopen
  cancelled: ['todo'], // Can reopen
};

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
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: '缺少 status 欄位' }, { status: 400 });
  }

  const validStatuses = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: '無效的狀態值' }, { status: 400 });
  }

  // Validate status transition
  const allowedNextStatuses = VALID_TRANSITIONS[existingTask.status] || [];
  if (existingTask.status !== status && !allowedNextStatuses.includes(status)) {
    return NextResponse.json(
      { error: `無法從 ${existingTask.status} 轉換為 ${status}` },
      { status: 400 },
    );
  }

  if (existingTask.status === status) {
    return NextResponse.json({ data: existingTask });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status,
    updatedAt: now,
  };

  // If marking as done, set completedAt
  if (status === 'done' && !existingTask.completedAt) {
    updates.completedAt = now;
  }

  // If reopening from done/cancelled, clear completedAt
  if (status !== 'done' && existingTask.completedAt) {
    updates.completedAt = null;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

  // Log status change to activities
  await db.insert(activities).values({
    id: crypto.randomUUID(),
    taskId: id,
    userId: session.user.id,
    event: 'status_changed',
    payload: JSON.stringify({
      oldStatus: existingTask.status,
      newStatus: status,
    }),
    createdAt: now,
  });

  const updatedTask = await db.select().from(tasks).where(eq(tasks.id, id)).get();

  return NextResponse.json({ data: updatedTask });
}