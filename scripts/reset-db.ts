import { createClient } from '@libsql/client';
import * as path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data/action-item.db');

async function resetDatabase() {
  console.log('🗑️ 清空資料庫...\n');
  
  const client = createClient({ url: `file:${DB_PATH}` });
  
  // Delete in order (respecting foreign keys)
  await client.execute('DELETE FROM task_labels');
  await client.execute('DELETE FROM labels');
  await client.execute('DELETE FROM attachments');
  await client.execute('DELETE FROM comments');
  await client.execute('DELETE FROM activities');
  await client.execute('DELETE FROM notifications');
  await client.execute('DELETE FROM task_assignees');
  await client.execute('DELETE FROM tasks');
  await client.execute('DELETE FROM projects');
  
  // Keep only the first admin user
  const result = await client.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (result.rows.length > 0) {
    const adminId = result.rows[0]?.id;
    await client.execute({
      sql: 'DELETE FROM users WHERE id != ?',
      args: [adminId],
    });
    console.log(`✅ 保留管理員帳號：${adminId}`);
  }
  
  await client.close();
  
  console.log('✅ 已成功清空所有資料！');
  console.log('\n現在可以開始使用系統了！');
}

resetDatabase().catch(console.error);
