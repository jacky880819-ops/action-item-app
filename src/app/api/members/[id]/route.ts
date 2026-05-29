import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { users } from '@/db';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // Admin only for updating members
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理員可以更新成員' }, { status: 403 });
  }

  const db = await initDb();
  const { id } = await params;

  const existingUser = await db.select().from(users).where(eq(users.id, id)).get();
  if (!existingUser) {
    return NextResponse.json({ error: '成員不存在' }, { status: 404 });
  }

  const body = await request.json();
  const allowedFields = ['name', 'email', 'role', 'status', 'avatarUrl'];
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Validate role if being updated
  if (body.role && !['admin', 'member', 'guest'].includes(body.role)) {
    return NextResponse.json({ error: '無效的角色' }, { status: 400 });
  }

  // Validate status if being updated
  if (body.status && !['active', 'inactive'].includes(body.status)) {
    return NextResponse.json({ error: '無效的狀態' }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, id)).run();

  const updatedUser = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .get();

  return NextResponse.json({ data: updatedUser });
}