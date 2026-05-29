import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { users, tasks, taskAssignees, projects, comments, activities, notifications, attachments, labels, taskLabels } from '@/db';
import { sql } from 'drizzle-orm';

// POST - 清空所有資料（保留 admin 帳號）
export async function POST(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理員可以清空資料' }, { status: 403 });
  }

  const body = await request.json();
  const { confirm } = body;

  if (confirm !== 'YES_DELETE_ALL_DATA') {
    return NextResponse.json(
      { error: '需要確認：請傳送 confirm: "YES_DELETE_ALL_DATA"' },
      { status: 400 }
    );
  }

  const db = await initDb();

  // Delete in order (respecting foreign keys)
  await db.delete(taskLabels);
  await db.delete(labels);
  await db.delete(attachments);
  await db.delete(comments);
  await db.delete(activities);
  await db.delete(notifications);
  await db.delete(taskAssignees);
  await db.delete(tasks);
  await db.delete(projects);
  
  // Delete all members except the current admin
  await db.delete(users).where(sql`${users.id} != ${session.user.id}`);

  return NextResponse.json({
    message: '已成功清空所有資料',
    data: {
      deletedBy: session.user.name,
      deletedAt: new Date().toISOString(),
    }
  });
}
