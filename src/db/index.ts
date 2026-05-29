import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import * as path from 'path';
import * as fs from 'fs';

// Resolve from project root so the DB is always at data/action-item.db
const DB_PATH = path.resolve(process.cwd(), 'data/action-item.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ─── Singleton ──────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __actionItemDb: ReturnType<typeof drizzle> | undefined;
}

function createDbInstance() {
  const client = createClient({
    url: `file:${DB_PATH}`,
  });
  return drizzle(client, { schema });
}

// Reuse across hot-reloads
const dbInstance = global.__actionItemDb ?? createDbInstance();
if (!global.__actionItemDb) global.__actionItemDb = dbInstance;

export const db = dbInstance;

// Helper for API routes that need async init
export async function initDb() {
  return dbInstance;
}

// Re-export all schema for convenience
export * from './schema';
