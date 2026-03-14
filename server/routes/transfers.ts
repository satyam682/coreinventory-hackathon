import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function getNextReference(): string {
  const last = db.prepare("SELECT reference FROM transfers ORDER BY created_at DESC LIMIT 1").get() as any;
  if (!last) return 'WH/INT/0001';
  const num = parseInt(last.reference.split('/').pop()) + 1;
  return `WH/INT/${String(num).padStart(4, '0')}`;
}

// Get all transfers
router.get('/', (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM transfers';
  const params: any[] = [];
  const conditions: string[] = [];

  if (status && status !== 'All') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(reference LIKE ? OR from_location LIKE ? OR to_location LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const transfers = db.prepare(query).all(...params);

  const enriched = transfers.map((t: any) => {
    const items = db.prepare(`
      SELECT ti.*, p.name as product_name, p.sku as product_sku, p.unit_of_measure
      FROM transfer_items ti JOIN products p ON ti.product_id = p.id
      WHERE ti.transfer_id = ?
    `).all(t.id);
    return { ...t, items };
  });

  return res.json({ data: enriched, total: enriched.length });
});

// Create transfer
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { from_location, to_location, notes, items } = req.body;

    if (!from_location || !to_location) {
      return res.status(400).json({ error: 'Source and destination locations are required' });
    }

    const id = uuid();
    const reference = getNextReference();

    db.prepare(`INSERT INTO transfers (id, reference, from_location, to_location, notes, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'Ready', ?)`).run(
      id, reference, from_location, to_location, notes || '', req.userId
    );

    if (items && Array.isArray(items)) {
      const insertItem = db.prepare('INSERT INTO transfer_items (id, transfer_id, product_id, quantity) VALUES (?, ?, ?, ?)');
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insertItem.run(uuid(), id, item.product_id, item.quantity);
        }
      }
    }

    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id);
    return res.status(201).json(transfer);
  } catch (err: any) {
    console.error('Create transfer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transfer status (log movement on "Done")
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any;
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

    if (status === 'Done' && transfer.status !== 'Done') {
      const items = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(id) as any[];
      
      const insertLedger = db.prepare(`INSERT INTO stock_ledger (id, product_id, operation_type, operation_ref, quantity_change, balance_after, location, notes)
        VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, ?)`);

      for (const item of items) {
        const product = db.prepare('SELECT on_hand FROM products WHERE id = ?').get(item.product_id) as any;
        // Log outgoing from source
        insertLedger.run(uuid(), item.product_id, transfer.reference, 0, product.on_hand, transfer.from_location, `Transferred from ${transfer.from_location} to ${transfer.to_location}`);
        // Log incoming to destination
        insertLedger.run(uuid(), item.product_id, transfer.reference, 0, product.on_hand, transfer.to_location, `Received transfer from ${transfer.from_location}`);
      }
    }

    db.prepare('UPDATE transfers SET status = ? WHERE id = ?').run(status, id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Update transfer status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete transfer
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM transfers WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export default router;
