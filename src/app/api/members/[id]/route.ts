import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { users, tasks, taskAssignees, projects, comments, activities, notifications, attachments } from '@/db';
import { eq } from 'drizzle-orm';

// GET - 獲取單一成員資訊
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const { id } = await params;
  const db = await initDb();

  const member = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!member) {
    return NextResponse.json({ error: '成員不存在' }, { status: 404 });
  }

  return NextResponse.json({ data: member });
}

// PUT - 更新成員資訊
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理員可以編輯成員' }, { status: 403 });
  }

  const { id } = await params;
  const db = await initDb();
  const body = await request.json();

  const { name, email, role, status } = body;

  // Check if member exists
  const existingMember = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!existingMember) {
    return NextResponse.json({ error: '成員不存在' }, { status: 404 });
  }

  // Check if email is already used by another member
  if (email) {
    const emailInUse = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (emailInUse && emailInUse.id !== id) {
      return NextResponse.json({ error: '此 email 已被使用' }, { status: 400 });
    }
  }

  const updateData: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (status !== undefined) updateData.status = status;

  await db.update(users).set(updateData).where(eq(users.id, id));

  const updatedMember = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  return NextResponse.json({ data: updatedMember });
}

// DELETE - 刪除成員
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // Admin only
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理員可以刪除成員' }, { status: 403 });
  }

  const { id } = await params;
  const db = await initDb();

  // Check if member exists
  const member = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, id))
    .get();

  if (!member) {
    return NextResponse.json({ error: '成員不存在' }, { status: 404 });
  }

  // Prevent deleting yourself
  if (id === session.user.id) {
    return NextResponse.json({ error: '不能刪除自己' }, { status: 400 });
  }

  // Delete related records first (cascade)
  await db.delete(attachments).where(eq(attachments.userId, id));
  await db.delete(comments).where(eq(comments.userId, id));
  await db.delete(activities).where(eq(activities.userId, id));
  await db.delete(notifications).where(eq(notifications.userId, id));
  
  // Delete task assignments
  await db.delete(taskAssignees).where(eq(taskAssignees.userId, id));
  
  // Update tasks created by this user (set to admin or null)
  const adminUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .limit(1)
    .get();
  
  if (adminUser) {
    await db.update(tasks)
      .set({ createdBy: adminUser.id })
      .where(eq(tasks.createdBy, id));
  }

  // Update projects owned by this user
  if (adminUser) {
    await db.update(projects)
      .set({ ownerId: adminUser.id })
      .where(eq(projects.ownerId, id));
  }

  // Finally delete the user
  await db.delete(users).where(eq(users.id, id));

  return NextResponse.json({ 
    message: `已刪除成員：${member.name}`,
    data: { id: member.id, name: member.name }
  });
}
