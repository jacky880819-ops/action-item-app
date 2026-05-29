import { createClient, type Client } from '@libsql/client';
import * as path from 'path';
import * as fs from 'fs';
import crypto from 'crypto';

// Resolve DB path from project root (cwd when script is invoked)
const DB_PATH = path.resolve(process.cwd(), 'data/action-item.db');

// ─── Password helpers ──────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function now(): string {
  return new Date().toISOString();
}

function uid(): string {
  return crypto.randomUUID();
}

// ─── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Ensure data directory
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // If DB already exists and has users, skip seeding (preserve data)
  if (fs.existsSync(DB_PATH)) {
    const checkClient: Client = createClient({ url: `file:${DB_PATH}` });
    try {
      const result = await checkClient.execute('SELECT COUNT(*) as cnt FROM users');
      const count = result.rows[0]?.cnt;
      if (count && Number(count) > 0) {
        console.log(`✅ Database already has ${count} users, skipping seed.`);
        await checkClient.close();
        return;
      }
    } catch {
      // Table might not exist, proceed to seed
    }
    await checkClient.close();
    // Remove corrupt/empty DB to start fresh
    fs.unlinkSync(DB_PATH);
  }

  const client: Client = createClient({
    url: `file:${DB_PATH}`,
  });

  // ── Create tables ────────────────────────────────────────────────────────────

  await client.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      status TEXT NOT NULL DEFAULT 'active',
      owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      start_date TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'p2',
      due_date TEXT,
      position INTEGER NOT NULL DEFAULT 1000,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS task_assignees (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'assignee'
    )`,
    `CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6B7280'
    )`,
    `CREATE TABLE IF NOT EXISTS task_labels (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_decision INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      read_at TEXT,
      task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      session_token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    )`,
  ]);

  const ts = now();

  // ── Users ────────────────────────────────────────────────────────────────────

  const admin1Id = uid();
  const admin2Id = uid();
  const member1Id = uid();
  const member2Id = uid();
  const member3Id = uid();

  await client.execute({
    sql: `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [admin1Id, '系統管理員', 'admin@test.com', hashPassword('password123'), 'admin', 'active', ts, ts],
  });
  await client.execute({ sql: `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [admin2Id, 'Admin Two', 'admin2@test.com', hashPassword('password123'), 'admin', 'active', ts, ts] });
  await client.execute({ sql: `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [member1Id, '王小明', 'member1@test.com', hashPassword('password123'), 'member', 'active', ts, ts] });
  await client.execute({ sql: `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [member2Id, '李小華', 'member2@test.com', hashPassword('password123'), 'member', 'active', ts, ts] });
  await client.execute({ sql: `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [member3Id, '陳大文', 'member3@test.com', hashPassword('password123'), 'member', 'active', ts, ts] });

  console.log('✅ Created 5 users');

  // ── Projects ─────────────────────────────────────────────────────────────────

  const project1Id = uid();
  const project2Id = uid();
  const project3Id = uid();

  await client.execute({ sql: `INSERT INTO projects (id, name, description, color, status, owner_id, start_date, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [project1Id, '系統開發', '新版本系統功能開發與技術架構優化', '#3B82F6', 'active', admin1Id, new Date(Date.now() - 7 * 86400000).toISOString(), new Date(Date.now() + 30 * 86400000).toISOString(), ts, ts] });
  await client.execute({ sql: `INSERT INTO projects (id, name, description, color, status, owner_id, start_date, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [project2Id, '行銷推廣', '產品推廣、內容行銷與廣告投放', '#10B981', 'active', member1Id, new Date().toISOString(), new Date(Date.now() + 14 * 86400000).toISOString(), ts, ts] });
  await client.execute({ sql: `INSERT INTO projects (id, name, description, color, status, owner_id, start_date, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [project3Id, '內部流程優化', '改善跨部門協作效率與流程標準化', '#8B5CF6', 'active', admin1Id, new Date(Date.now() + 7 * 86400000).toISOString(), null, ts, ts] });

  console.log('✅ Created 3 projects');

  // ── Labels ───────────────────────────────────────────────────────────────────

  const label1Id = uid();
  const label2Id = uid();
  const label3Id = uid();
  const label4Id = uid();
  const label5Id = uid();

  await client.execute({ sql: `INSERT INTO labels (id, project_id, name, color) VALUES (?, ?, ?, ?)`, args: [label1Id, project1Id, 'Feature', '#3B82F6'] });
  await client.execute({ sql: `INSERT INTO labels (id, project_id, name, color) VALUES (?, ?, ?, ?)`, args: [label2Id, project1Id, 'Bug', '#EF4444'] });
  await client.execute({ sql: `INSERT INTO labels (id, project_id, name, color) VALUES (?, ?, ?, ?)`, args: [label3Id, project1Id, 'Enhancement', '#F59E0B'] });
  await client.execute({ sql: `INSERT INTO labels (id, project_id, name, color) VALUES (?, ?, ?, ?)`, args: [label4Id, project2Id, 'Campaign', '#10B981'] });
  await client.execute({ sql: `INSERT INTO labels (id, project_id, name, color) VALUES (?, ?, ?, ?)`, args: [label5Id, project2Id, 'Social Media', '#EC4899'] });

  console.log('✅ Created 5 labels');

  // ── Tasks ────────────────────────────────────────────────────────────────────

  const taskDefinitions = [
    { projectId: project1Id, title: '設計新使用者認證流程', desc: '評估並實作 OAuth2 / JWT 混合方案', status: 'done', priority: 'p0', due: new Date(Date.now() - 2 * 86400000).toISOString(), createdBy: admin1Id, pos: 100 },
    { projectId: project1Id, title: '實作 REST API 端點', desc: '涵蓋 CRUD 任務 API 與分頁', status: 'in_progress', priority: 'p1', due: new Date(Date.now() + 5 * 86400000).toISOString(), createdBy: admin1Id, pos: 200 },
    { projectId: project1Id, title: '建立資料庫遷移腳本', desc: '使用 Drizzle ORM 定義 schema', status: 'done', priority: 'p1', due: new Date(Date.now() - 5 * 86400000).toISOString(), createdBy: admin1Id, pos: 300 },
    { projectId: project1Id, title: '效能優化與快取策略', desc: 'Redis 快取與資料庫查詢優化', status: 'review', priority: 'p2', due: new Date(Date.now() + 10 * 86400000).toISOString(), createdBy: admin1Id, pos: 400 },
    { projectId: project1Id, title: 'CI/CD Pipeline 建置', desc: 'GitHub Actions 自動化部署', status: 'todo', priority: 'p2', due: null, createdBy: member1Id, pos: 500 },
    { projectId: project1Id, title: '單元測試覆蓋率提升', desc: '目標：80% 覆蓋率', status: 'todo', priority: 'p3', due: null, createdBy: member1Id, pos: 600 },
    { projectId: project2Id, title: 'Q2 社群媒體內容企劃', desc: '每週 3 篇 FB/IG 貼文', status: 'in_progress', priority: 'p1', due: new Date(Date.now() + 7 * 86400000).toISOString(), createdBy: member1Id, pos: 100 },
    { projectId: project2Id, title: '線上廣告投放分析', desc: 'Google Ads & Meta Ads 數據追蹤', status: 'todo', priority: 'p1', due: new Date(Date.now() + 3 * 86400000).toISOString(), createdBy: member1Id, pos: 200 },
    { projectId: project2Id, title: '客戶成功案例撰寫', desc: '3 篇案例研究文章', status: 'todo', priority: 'p2', due: new Date(Date.now() + 14 * 86400000).toISOString(), createdBy: member2Id, pos: 300 },
    { projectId: project2Id, title: 'Email 行銷活動設計', desc: '新產品發布電子報', status: 'done', priority: 'p1', due: new Date(Date.now() - 3 * 86400000).toISOString(), createdBy: member2Id, pos: 400 },
    { projectId: project2Id, title: 'KOL 合作洽談', desc: '接洽 5 位潛在 KOL', status: 'review', priority: 'p2', due: new Date(Date.now() + 12 * 86400000).toISOString(), createdBy: member1Id, pos: 500 },
    { projectId: project3Id, title: '跨部門會議流程改造', desc: '減少非必要會議，提高決策效率', status: 'in_progress', priority: 'p0', due: new Date(Date.now() + 7 * 86400000).toISOString(), createdBy: admin1Id, pos: 100 },
    { projectId: project3Id, title: '文件管理系統整合', desc: '統一文件存放與版本控制', status: 'todo', priority: 'p1', due: new Date(Date.now() + 21 * 86400000).toISOString(), createdBy: admin1Id, pos: 200 },
    { projectId: project3Id, title: '新進員工入職流程標準化', desc: '建立 SOP 與培訓教材', status: 'done', priority: 'p1', due: new Date(Date.now() - 7 * 86400000).toISOString(), createdBy: member3Id, pos: 300 },
    { projectId: project3Id, title: '敏捷開發流程回顧', desc: 'Sprint Retrospective 改善建議', status: 'cancelled', priority: 'p3', due: null, createdBy: member3Id, pos: 400 },
  ];

  const taskIds: string[] = [];

  for (const t of taskDefinitions) {
    const id = uid();
    taskIds.push(id);
    const completedAt = t.status === 'done' ? now() : null;
    await client.execute({
      sql: `INSERT INTO tasks (id, project_id, title, description, status, priority, due_date, position, created_by, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, t.projectId, t.title, t.desc, t.status, t.priority, t.due, t.pos, t.createdBy, completedAt, ts, ts],
    });
  }

  console.log(`✅ Created ${taskDefinitions.length} tasks`);

  // ── Task Assignees ───────────────────────────────────────────────────────────

  const assigneeData = [
    [taskIds[0], admin1Id, 'owner'], [taskIds[0], member1Id, 'assignee'],
    [taskIds[1], member1Id, 'owner'], [taskIds[1], member2Id, 'assignee'],
    [taskIds[3], admin1Id, 'owner'],
    [taskIds[4], member1Id, 'owner'],
    [taskIds[5], member2Id, 'owner'],
    [taskIds[6], member1Id, 'owner'], [taskIds[6], member2Id, 'assignee'],
    [taskIds[7], member1Id, 'owner'],
    [taskIds[8], member2Id, 'owner'],
    [taskIds[9], member2Id, 'owner'],
    [taskIds[10], member1Id, 'owner'],
    [taskIds[11], admin1Id, 'owner'], [taskIds[11], member3Id, 'assignee'],
    [taskIds[12], member3Id, 'owner'],
    [taskIds[13], member3Id, 'owner'],
  ];

  for (const [taskId, userId, role] of assigneeData) {
    await client.execute({ sql: `INSERT INTO task_assignees (id, task_id, user_id, role) VALUES (?, ?, ?, ?)`, args: [uid(), taskId, userId, role] });
  }

  console.log('✅ Created task assignments');

  // ── Task Labels ──────────────────────────────────────────────────────────────

  const taskLabelData = [
    [taskIds[0], label1Id], [taskIds[1], label1Id], [taskIds[3], label3Id],
    [taskIds[6], label4Id], [taskIds[7], label4Id], [taskIds[8], label4Id],
    [taskIds[10], label5Id],
  ];

  for (const [taskId, labelId] of taskLabelData) {
    await client.execute({ sql: `INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)`, args: [taskId, labelId] });
  }

  console.log('✅ Created task-label associations');

  // ── Comments ─────────────────────────────────────────────────────────────────

  const commentData = [
    [taskIds[0], admin1Id, '確實需要支援 Google 登入，已列入需求。', 0],
    [taskIds[0], member1Id, '決定採用 OAuth2 + JWT 混合方案，兼顧安全性與效能。', 1],
    [taskIds[1], member1Id, 'REST API 已實作基本 CRUD，待加入分頁功能。', 0],
    [taskIds[1], admin1Id, '分頁改用 cursor-based pagination，避免大偏移量效能問題。', 1],
    [taskIds[6], member1Id, 'FB 與 IG 的內容調性不同，需要分開企劃。', 0],
    [taskIds[6], member2Id, '建議每週一固定發布，增加演算法曝光。', 0],
    [taskIds[11], member3Id, '每週例會時間可以從 2 小時縮短到 1 小時。', 0],
  ];

  for (const [taskId, userId, content, isDecision] of commentData) {
    await client.execute({ sql: `INSERT INTO comments (id, task_id, user_id, content, is_decision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [uid(), taskId, userId, content, isDecision, ts, ts] });
  }

  console.log('✅ Created comments');

  // ── Activities ───────────────────────────────────────────────────────────────

  const activityData = [
    [taskIds[0], admin1Id, 'created', 'Task created'],
    [taskIds[0], admin1Id, 'status_changed', 'Status changed'],
    [taskIds[1], member1Id, 'created', 'Task created'],
    [taskIds[6], member1Id, 'created', 'Task created'],
    [taskIds[11], admin1Id, 'created', 'Task created'],
  ];

  for (const [taskId, userId, event, desc] of activityData) {
    await client.execute({ sql: `INSERT INTO activities (id, task_id, user_id, event, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [uid(), taskId, userId, event, JSON.stringify({ description: desc }), ts] });
  }

  console.log('✅ Created activities');

  // ── Notifications ────────────────────────────────────────────────────────────

  const notifData = [
    [admin1Id, 'task_assigned', '新任務已指派給你', '實作 REST API 端點', taskIds[1]],
    [member1Id, 'task_mentioned', '你在任務中被提及', '設計新使用者認證流程', taskIds[0]],
    [member2Id, 'task_assigned', '新任務已指派給你', 'CI/CD Pipeline 建置', taskIds[4]],
    [member3Id, 'task_assigned', '新任務已指派給你', '跨部門會議流程改造', taskIds[11]],
  ];

  for (const [userId, type, title, body, taskId] of notifData) {
    await client.execute({ sql: `INSERT INTO notifications (id, user_id, type, title, body, task_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [uid(), userId, type, title, body, taskId, ts] });
  }

  console.log('✅ Created notifications');

  // ── Done ─────────────────────────────────────────────────────────────────────

  await client.close();

  console.log(`\n💾 Database saved to: ${DB_PATH}`);
  console.log('\n🎉 Seed complete!');
  console.log('\nTest accounts:');
  console.log('  admin@test.com  / password123  (admin)');
  console.log('  admin2@test.com / password123  (admin)');
  console.log('  member1@test.com / password123 (member)');
  console.log('  member2@test.com / password123 (member)');
  console.log('  member3@test.com / password123 (member)');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
