import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { notifications } from '@/db';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { id } = await params;

  const notification = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .get();

  if (!notification) {
    return NextResponse.json({ error: '通知不存在' }, { status: 404 });
  }

  // Ensure the notification belongs to the current user
  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: '無權限' }, { status: 403 });
  }

  // Mark as read if not already
  if (!notification.readAt) {
    await db
      .update(notifications)
      .set({ readAt: new Date().toISOString() })
      .where(eq(notifications.id, id))
      .run();
  }

  const updatedNotification = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .get();

  return NextResponse.json({ data: updatedNotification });
}