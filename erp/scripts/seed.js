/**
 * Database Master Seed Script
 * Seeds Default Super Admin and baseline demo data.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');
const { hashPassword } = require('../src/security');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL configured. Standalone in-memory mode active.');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const email = 'superadmin@anvimitra.com';
    const pass = 'SuperAdmin@123';
    const hash = await hashPassword(pass);

    await client.query(
      `INSERT INTO users (id, email, password_hash, role, status)
       VALUES ('00000000-0000-0000-0000-000000000001', $1, $2, 'super_admin', 'active')
       ON CONFLICT (id) DO UPDATE SET password_hash = $2, role = 'super_admin', status = 'active'`,
      [email, hash]
    );
    console.log('✓ Master seed completed successfully. Super Admin ready.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Seed error:', e.message);
  process.exit(1);
});
