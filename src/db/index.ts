import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import * as path from 'path';
import * as fs from 'fs';

// ─── Database configuration ───────────────────────────────────────────────────
// If TURSO_DATABASE_URL is set, use Turso (cloud SQLite for serverless).
// Otherwise, fall back to local file-based SQLite (for dev / Railway with volume).

const isTurso = !!process.env.TURSO_DATABASE_URL;

function createDbInstance() {
  if (isTurso) {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return drizzle(client, { schema });
  }

  // Local SQLite
  const DB_PATH = path.resolve(process.cwd(), 'data/action-item.db');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const client = createClient({
    url: `file:${DB_PATH}`,
  });
  return drizzle(client, { schema });
}

// ─── Singleton (dev hot-reload safe) ─────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __actionItemDb: ReturnType<typeof drizzle> | undefined;
}

const dbInstance = global.__actionItemDb ?? createDbInstance();
if (!global.__actionItemDb) global.__actionItemDb = dbInstance;

export const db = dbInstance;

export async function initDb() {
  return dbInstance;
}

export * from './schema';
