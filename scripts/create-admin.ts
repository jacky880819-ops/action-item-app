import { createClient } from '@libsql/client';
import crypto from 'crypto';
import * as path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'data/action-item.db');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createAdmin() {
  console.log('👤 建立超級管理員帳號...\n');
  
  const client = createClient({ url: `file:${DB_PATH}` });
  
  const adminId = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword('Admin@123456');
  
  try {
    await client.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [adminId, '超級管理員', 'superadmin@actionitem.com', passwordHash, 'admin', 'active', now, now],
    });
    
    console.log('✅ 超級管理員帳號建立成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: superadmin@actionitem.com');
    console.log('🔑 Password: Admin@123456');
    console.log('👑 Role: 超級管理員 (Admin)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('請立即登入並修改密碼！\n');
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('⚠️  帳號已存在，使用現有帳號即可\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email: superadmin@actionitem.com');
      console.log('🔑 Password: Admin@123456');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      throw error;
    }
  }
  
  await client.close();
}

createAdmin().catch(console.error);
