import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function getNextReference(): string {
  const last = db.prepare("SELECT reference FROM adjustments ORDER BY created_at DESC LIMIT 1").get() as any;
  if (!last) return 'WH/ADJ/0001';
  const num = parseInt(last.reference.split('/').pop()) + 1;
  return `WH/ADJ/${String(num).padStart(4, '0')}`;
}

// Get all adjustments
router.get('/', (req: AuthRequest, res: Response) => {
  const adjustments = db.prepare(`
    SELECT a.*, p.name as product_name, p.sku as product_sku, p.unit_of_measure
    FROM adjustments a
    JOIN products p ON a.product_id = p.id
    ORDER BY a.created_at DESC
  `).all();

  return res.json({ data: adjustments, total: adjustments.length });
});

// Create adjustment (auto-updates stock)
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { product_id, location, counted_qty, reason } = req.body;

    if (!product_id || counted_qty === undefined) {
      return res.status(400).json({ error: 'Product and counted quantity are required' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any;
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const recorded_qty = product.on_hand;
    const difference = counted_qty - recorded_qty;
    const id = uuid();
    const reference = getNextReference();

    // Create adjustment record
    db.prepare(`INSERT INTO adjustments (id, reference, product_id, location, recorded_qty, counted_qty, difference, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, reference, product_id, location || '', recorded_qty, counted_qty, difference, reason || '', req.userId
    );

    // Update product stock
    db.prepare('UPDATE products SET on_hand = ?, free = MAX(0, free + ?) WHERE id = ?').run(
      counted_qty, difference, product_id
    );

    // Log to stock ledger
    db.prepare(`INSERT INTO stock_ledger (id, product_id, operation_type, operation_ref, quantity_change, balance_after, location, notes)
      VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?)`).run(
      uuid(), product_id, reference, difference, counted_qty, location || '', reason || `Stock adjustment: ${recorded_qty} → ${counted_qty}`
    );

    const adjustment = db.prepare(`
      SELECT a.*, p.name as product_name, p.sku as product_sku
      FROM adjustments a JOIN products p ON a.product_id = p.id WHERE a.id = ?
    `).get(id);

    return res.status(201).json(adjustment);
  } catch (err: any) {
    console.error('Create adjustment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete adjustment
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM adjustments WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export default router;
