import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { attachments, tasks } from '@/db';
import { eq } from 'drizzle-orm';

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

  const taskAttachments = await db
    .select()
    .from(attachments)
    .where(eq(attachments.taskId, id))
    .all();

  return NextResponse.json({ data: taskAttachments });
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
  const { fileName, fileUrl, fileSize, mimeType } = body;

  if (!fileName || !fileUrl) {
    return NextResponse.json(
      { error: '缺少必要欄位：fileName, fileUrl' },
      { status: 400 },
    );
  }

  const attachmentId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(attachments).values({
    id: attachmentId,
    taskId: id,
    userId: session.user.id,
    fileName,
    fileUrl,
    fileSize: fileSize || null,
    mimeType: mimeType || null,
    createdAt: now,
  });

  const newAttachment = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, attachmentId))
    .get();

  return NextResponse.json({ data: newAttachment }, { status: 201 });
}