import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import type { User, UserRole } from '@vibecoder/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'vibecoder-dev-secret-change-in-production';
const JWT_EXPIRY = '24h';
const SALT_ROUNDS = 10;

interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role as UserRole,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

export async function createUser(username: string, password: string, role: UserRole = 'user'): Promise<User> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
    [username, hash, role]
  );
  return rowToUser(result.rows[0]);
}

export async function loginUser(username: string, password: string): Promise<{ user: User; token: string }> {
  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  if (result.rows.length === 0) {
    throw new Error('Invalid username or password');
  }
  const row = result.rows[0];
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    throw new Error('Invalid username or password');
  }
  const user = rowToUser(row);
  const token = signToken({ userId: user.id, username: user.username, role: user.role });
  return { user, token };
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (result.rows.length === 0) return null;
  return rowToUser(result.rows[0]);
}

export async function listUsers(): Promise<User[]> {
  const result = await query('SELECT * FROM users ORDER BY created_at ASC');
  return result.rows.map(rowToUser);
}

export async function deleteUser(id: string): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [id]);
}

export async function updatePassword(id: string, newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
}

/**
 * Create default admin account on first boot if no admin exists.
 */
export async function seedAdmin(): Promise<void> {
  const result = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (result.rows.length > 0) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  await createUser(username, password, 'admin');
  console.log(`Admin account created: ${username}`);
}
