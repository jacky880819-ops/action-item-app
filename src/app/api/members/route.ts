import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { safeGetSession, hashPassword } from '@/lib/auth';
import { initDb } from '@/db';
import { users } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();

  const allMembers = await db
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
    .where(eq(users.status, 'active'))
    .all();

  return NextResponse.json({ data: allMembers });
}

export async function POST(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // Admin only for adding members
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理員可以新增成員' }, { status: 403 });
  }

  const db = await initDb();
  const body = await request.json();

  const { name, email, role, password } = body;

  if (!name || !email) {
    return NextResponse.json(
      { error: '缺少必要欄位：name, email' },
      { status: 400 },
    );
  }

  // Check if email already exists
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();

  if (existingUser) {
    return NextResponse.json({ error: '此 email 已被使用' }, { status: 400 });
  }

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(password || 'default123');

  await db.insert(users).values({
    id: userId,
    name,
    email,
    passwordHash,
    role: role || 'member',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  const newUser = await db
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
    .where(eq(users.id, userId))
    .get();

  return NextResponse.json({ data: newUser }, { status: 201 });
}