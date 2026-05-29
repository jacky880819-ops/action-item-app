import { NextResponse } from 'next/server';
import { safeGetSession } from '@/lib/auth';
import { initDb } from '@/db';
import { labels } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const session = await safeGetSession();
  if (!session?.user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const db = await initDb();

  const allLabels = await db
    .select({
      id: labels.id,
      name: labels.name,
      color: labels.color,
    })
    .from(labels)
    .all();

  return NextResponse.json({ data: allLabels });
}
