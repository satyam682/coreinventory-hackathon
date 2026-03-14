import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ─── WAREHOUSES ────────────────────────────────────

router.get('/', (req: AuthRequest, res: Response) => {
  const warehouses = db.prepare('SELECT * FROM warehouses ORDER BY created_at DESC').all();
  return res.json(warehouses);
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, short_code, address } = req.body;
    if (!name || !short_code) return res.status(400).json({ error: 'Name and short code required' });

    const id = uuid();
    db.prepare('INSERT INTO warehouses (id, name, short_code, address) VALUES (?, ?, ?, ?)').run(
      id, name, short_code, address || ''
    );
    const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    return res.status(201).json(warehouse);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Short code already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, short_code, address } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (name) { updates.push('name = ?'); values.push(name); }
  if (short_code) { updates.push('short_code = ?'); values.push(short_code); }
  if (address !== undefined) { updates.push('address = ?'); values.push(address); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE warehouses SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  return res.json({ success: true });
});

router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM warehouses WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// ─── LOCATIONS ────────────────────────────────────

const locationRouter = Router();
locationRouter.use(authMiddleware);

locationRouter.get('/', (req: AuthRequest, res: Response) => {
  const locations = db.prepare(`
    SELECT l.*, w.name as warehouse_name, w.short_code as warehouse_short_code
    FROM locations l
    LEFT JOIN warehouses w ON l.warehouse_id = w.id
    ORDER BY l.created_at DESC
  `).all();
  return res.json(locations);
});

locationRouter.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, short_code, warehouse_id } = req.body;
    if (!name || !short_code || !warehouse_id) {
      return res.status(400).json({ error: 'Name, short code, and warehouse are required' });
    }

    const id = uuid();
    db.prepare('INSERT INTO locations (id, name, short_code, warehouse_id) VALUES (?, ?, ?, ?)').run(
      id, name, short_code, warehouse_id
    );

    const location = db.prepare(`
      SELECT l.*, w.name as warehouse_name
      FROM locations l LEFT JOIN warehouses w ON l.warehouse_id = w.id
      WHERE l.id = ?
    `).get(id);
    return res.status(201).json(location);
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

locationRouter.patch('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, short_code, warehouse_id } = req.body;
  const updates: string[] = [];
  const values: any[] = [];

  if (name) { updates.push('name = ?'); values.push(name); }
  if (short_code) { updates.push('short_code = ?'); values.push(short_code); }
  if (warehouse_id) { updates.push('warehouse_id = ?'); values.push(warehouse_id); }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  return res.json({ success: true });
});

locationRouter.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export { locationRouter };
export default router;
