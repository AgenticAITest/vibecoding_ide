import { Router } from 'express';
import { loginUser, createUser, getUserById, listUsers, deleteUser, updatePassword } from '../services/auth.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username?.trim() || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }
    const result = await loginUser(username.trim(), password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// GET /api/auth/me — validate token, return current user
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin routes ---

// GET /api/auth/users — list all users (admin only)
authRouter.get('/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users — create user (admin only)
authRouter.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body as { username: string; password: string; role?: string };
    if (!username?.trim() || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }
    const user = await createUser(username.trim(), password, (role === 'admin' ? 'admin' : 'user'));
    res.json({ user });
  } catch (err: any) {
    if (err.message?.includes('duplicate key') || err.message?.includes('unique')) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id — delete user (admin only)
authRouter.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    // Prevent admin from deleting themselves
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    await deleteUser(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id/password — reset password (admin only)
authRouter.put('/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body as { password: string };
    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }
    await updatePassword(req.params.id as string, password);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
