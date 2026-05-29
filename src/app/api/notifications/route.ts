import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { notifications, tasks } from '@/db';
import { eq, desc, isNull } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { searchParams } = new URL(request.url);

  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const userNotifications = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      readAt: notifications.readAt,
      taskId: notifications.taskId,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  // Get task info for each notification that has a taskId
  const notificationsWithTaskInfo = await Promise.all(
    userNotifications.map(async (notif) => {
      if (notif.taskId) {
        const task = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
          })
          .from(tasks)
          .where(eq(tasks.id, notif.taskId))
          .get();
        return { ...notif, task };
      }
      return { ...notif, task: null };
    }),
  );

  return NextResponse.json({
    data: notificationsWithTaskInfo,
    unreadCount: notificationsWithTaskInfo.filter((n) => !n.readAt).length,
  });
}