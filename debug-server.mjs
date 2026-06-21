import { getDb } from './src/lib/server/db.js';
import { listWeddings } from './src/lib/server/repository.js';
import fs from 'fs';
import path from 'path';

const testDataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

async function test() {
  try {
    console.log('初始化数据库...');
    const db = await getDb();
    console.log('✅ 数据库初始化成功');

    console.log('查询婚礼列表...');
    const weddings = await listWeddings();
    console.log('✅ 查询成功，婚礼数量:', weddings.length);
  } catch (e) {
    console.error('❌ 错误:', e);
    console.error('堆栈:', e.stack);
    process.exit(1);
  }
}

test();
