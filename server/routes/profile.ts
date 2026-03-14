import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get profile
router.get('/', (req: AuthRequest, res: Response) => {
  const user = db.prepare('SELECT id, login_id, email, name, role, created_at FROM users WHERE id = ?').get(req.userId) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// Update profile
router.patch('/', (req: AuthRequest, res: Response) => {
  const { name, email } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (email !== undefined) { updates.push('email = ?'); values.push(email); }

  if (updates.length > 0) {
    values.push(req.userId);
    try {
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  const user = db.prepare('SELECT id, login_id, email, name, role, created_at FROM users WHERE id = ?').get(req.userId);
  return res.json(user);
});

// Change password
router.post('/change-password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
