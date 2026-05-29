import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { comments, users, notifications, tasks } from '@/db';
import { eq, desc, sql } from 'drizzle-orm';

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

  // Verify task exists
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) {
    return NextResponse.json({ error: '任務不存在' }, { status: 404 });
  }

  const taskComments = await db
    .select({
      id: comments.id,
      taskId: comments.taskId,
      userId: comments.userId,
      content: comments.content,
      isDecision: comments.isDecision,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.taskId, id))
    .orderBy(desc(comments.createdAt))
    .all();

  return NextResponse.json({ data: taskComments });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();
  const { id } = await params;

  // Verify task exists
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) {
    return NextResponse.json({ error: '任務不存在' }, { status: 404 });
  }

  const body = await request.json();
  const { content, isDecision } = body;

  if (!content) {
    return NextResponse.json({ error: '缺少 content 欄位' }, { status: 400 });
  }

  const commentId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(comments).values({
    id: commentId,
    taskId: id,
    userId: session.user.id,
    content,
    isDecision: isDecision ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  });

  // Parse @mentions from content and create notifications
  const mentionRegex = /@(\w+)/g;
  const mentions = content.match(mentionRegex);

  if (mentions) {
    const mentionedNames = [...new Set(mentions.map((m: string) => m.slice(1)))];

    // Find users by name
    for (const name of mentionedNames) {
      const mentionedUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.name, name as string))
        .get();

      if (mentionedUser && mentionedUser.id !== session.user.id) {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: mentionedUser.id,
          type: 'mention',
          title: '有人提到了你',
          body: `${session.user.name} 在任務中提到了你`,
          taskId: id,
          createdAt: now,
        });
      }
    }
  }

  const newComment = await db
    .select({
      id: comments.id,
      taskId: comments.taskId,
      userId: comments.userId,
      content: comments.content,
      isDecision: comments.isDecision,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .get();

  return NextResponse.json({ data: newComment }, { status: 201 });
}