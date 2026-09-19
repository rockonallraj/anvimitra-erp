/**
 * Standalone Super Admin Seed Script
 *
 * Usage:
 *   node erp/scripts/seed-superadmin.js
 *
 * Options via environment variables:
 *   DATABASE_URL: PostgreSQL connection string
 *   SUPERADMIN_EMAIL: (default: superadmin@anvimitra.com)
 *   SUPERADMIN_PASSWORD: (default: SuperAdmin@123)
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { hashPassword } = require('../src/security');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set.');
    console.error('Please set DATABASE_URL in erp/.env or environment variable.');
    process.exit(1);
  }

  const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@anvimitra.com').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';

  console.log(`Connecting to database to seed Super Admin [${email}]...`);
  const client = new Client({
    connectionString: databaseUrl,
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const passwordHash = await hashPassword(password);

    const existing = await client.query('SELECT id, email, role FROM users WHERE lower(email) = $1', [email]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      await client.query(
        "UPDATE users SET password_hash = $1, role = 'super_admin', status = 'active', updated_at = now() WHERE id = $2",
        [passwordHash, user.id]
      );
      console.log(`✓ Super Admin password and role updated successfully for existing user [${email}] (ID: ${user.id})`);
    } else {
      const inserted = await client.query(
        `INSERT INTO users (id, school_id, branch_id, email, password_hash, role, status)
         VALUES (gen_random_uuid(), NULL, NULL, $1, $2, 'super_admin', 'active')
         RETURNING id`,
        [email, passwordHash]
      );
      console.log(`✓ Super Admin user created successfully [${email}] (ID: ${inserted.rows[0].id})`);
    }

    console.log('\n--- Super Admin Credentials ---');
    console.log(`Email / Login : ${email}`);
    console.log(`Password      : ${password}`);
    console.log(`Role          : super_admin`);
    console.log(`School Code   : (Leave empty)`);
    console.log('-------------------------------\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Super Admin seed failed:', err.message);
  process.exit(1);
});
