-- 102_default_super_admin_seed.sql
-- Idempotent seed for default Platform Super Admin
-- Password: SuperAdmin@123 (scrypt hashed)

INSERT INTO users (
  id,
  school_id,
  branch_id,
  email,
  password_hash,
  role,
  status,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  NULL,
  'superadmin@anvimitra.com',
  'scrypt$16384$8$1$25abf06a595feb547ccb5505bc7bd2ef$18c73230c6ef8d7285bddd915ed030eeb31c4b89a481666ac3629391606e837190fc2f1a6ee1707eec5106950e687290f93a118d61bac4ea49057e76358917df',
  'super_admin',
  'active',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE lower(email) = 'superadmin@anvimitra.com'
);
