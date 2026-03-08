#!/usr/bin/env node

/**
 * Seed script — creates an admin user in the VibeCoder database.
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Environment variables:
 *   DATABASE_URL     — PostgreSQL connection string (required)
 *   ADMIN_USERNAME   — Admin username (default: "admin")
 *   ADMIN_PASSWORD   — Admin password (default: "admin123")
 *
 * Example:
 *   DATABASE_URL=postgresql://vibecoder:secret@localhost:5432/vibecoder \
 *   ADMIN_USERNAME=admin \
 *   ADMIN_PASSWORD=my-secure-password \
 *   node scripts/seed-admin.js
 */

import pg from 'pg';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  console.error('Example: DATABASE_URL=postgresql://vibecoder:secret@localhost:5432/vibecoder');
  process.exit(1);
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SALT_ROUNDS = 10;

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function run() {
  try {
    // Ensure tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id, username FROM users WHERE username = $1',
      [ADMIN_USERNAME]
    );

    if (existing.rows.length > 0) {
      console.log(`Admin user "${ADMIN_USERNAME}" already exists (id: ${existing.rows[0].id}).`);
      console.log('To reset the password, delete the user first or use the admin panel.');
      process.exit(0);
    }

    // Create admin user
    const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [ADMIN_USERNAME, hash, 'admin']
    );

    console.log(`Admin user created successfully.`);
    console.log(`  Username: ${ADMIN_USERNAME}`);
    console.log(`  User ID:  ${result.rows[0].id}`);
    console.log(`  Role:     admin`);
  } catch (err) {
    console.error('Failed to seed admin user:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
