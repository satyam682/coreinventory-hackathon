import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function getNextReference(): string {
  const last = db.prepare("SELECT reference FROM receipts ORDER BY created_at DESC LIMIT 1").get() as any;
  if (!last) return 'WH/IN/0001';
  const num = parseInt(last.reference.split('/').pop()) + 1;
  return `WH/IN/${String(num).padStart(4, '0')}`;
}

// Get all receipts
router.get('/', (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM receipts';
  const params: any[] = [];
  const conditions: string[] = [];

  if (status && status !== 'All') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(reference LIKE ? OR from_location LIKE ? OR contact LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const receipts = db.prepare(query).all(...params);

  // Attach items to each receipt
  const enriched = receipts.map((r: any) => {
    const items = db.prepare(`
      SELECT ri.*, p.name as product_name, p.sku as product_sku, p.unit_of_measure
      FROM receipt_items ri JOIN products p ON ri.product_id = p.id
      WHERE ri.receipt_id = ?
    `).all(r.id);
    return { ...r, items };
  });

  return res.json({ data: enriched, total: enriched.length, page: 1, limit: 50 });
});

// Get single receipt
router.get('/:id', (req: AuthRequest, res: Response) => {
  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(req.params.id) as any;
  if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

  const items = db.prepare(`
    SELECT ri.*, p.name as product_name, p.sku as product_sku, p.unit_of_measure
    FROM receipt_items ri JOIN products p ON ri.product_id = p.id
    WHERE ri.receipt_id = ?
  `).all(receipt.id);

  return res.json({ ...receipt, items });
});

// Create receipt
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { from, to, contact, schedule_date, products, items } = req.body;

    if (!from) return res.status(400).json({ error: 'Vendor/From is required' });

    const id = uuid();
    const reference = getNextReference();
    const newlyCreatedProducts: string[] = [];

    db.prepare(`INSERT INTO receipts (id, reference, from_location, to_location, contact, schedule_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'Ready', ?)`).run(
      id, reference, from, to || 'WH/Stock', contact || '', schedule_date || new Date().toISOString().split('T')[0], req.userId
    );

    const insertItem = db.prepare('INSERT INTO receipt_items (id, receipt_id, product_id, quantity) VALUES (?, ?, ?, ?)');

    // ── New format: products array with mode ──
    if (products && Array.isArray(products)) {
      for (const row of products) {
        let productId = row.product_id;

        if (row.mode === 'new' && row.new_product_name?.trim()) {
          const trimmedName = row.new_product_name.trim();
          // Check if product already exists (case-insensitive)
          const existing = db.prepare(
            'SELECT id, name FROM products WHERE LOWER(name) = LOWER(?)'  
          ).get(trimmedName) as any;

          if (existing) {
            productId = existing.id;
          } else {
            // Auto-create new product with 0 stock
            productId = uuid();
            db.prepare(`INSERT INTO products (id, name, sku, category, per_unit_cost, on_hand, free, reorder_point, unit_of_measure, created_by)
              VALUES (?, ?, ?, 'Uncategorized', 0, 0, 0, 0, 'Units', ?)`
            ).run(productId, trimmedName, `AUTO-${Date.now()}`, req.userId);
            newlyCreatedProducts.push(trimmedName);
          }
        }

        if (productId && row.quantity > 0) {
          insertItem.run(uuid(), id, productId, row.quantity);
        }
      }
    }
    // ── Legacy format: items array ──
    else if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insertItem.run(uuid(), id, item.product_id, item.quantity);
        }
      }
    }

    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
    return res.status(201).json({
      ...receipt,
      newly_created_products: newlyCreatedProducts,
      message: newlyCreatedProducts.length > 0
        ? `Receipt created! New products added to inventory: ${newlyCreatedProducts.join(', ')}`
        : 'Receipt created successfully'
    });
  } catch (err: any) {
    console.error('Create receipt error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update receipt status (with stock update on "Done")
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(id) as any;
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    // If marking as Done, increase stock
    if (status === 'Done' && receipt.status !== 'Done') {
      const items = db.prepare('SELECT * FROM receipt_items WHERE receipt_id = ?').all(id) as any[];
      
      const updateStock = db.prepare('UPDATE products SET on_hand = on_hand + ?, free = free + ? WHERE id = ?');
      const insertLedger = db.prepare(`INSERT INTO stock_ledger (id, product_id, operation_type, operation_ref, quantity_change, balance_after, location, notes)
        VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?)`);

      for (const item of items) {
        updateStock.run(item.quantity, item.quantity, item.product_id);
        const product = db.prepare('SELECT on_hand FROM products WHERE id = ?').get(item.product_id) as any;
        insertLedger.run(uuid(), item.product_id, receipt.reference, item.quantity, product.on_hand, receipt.to_location, `Received via ${receipt.reference}`);
      }
    }

    db.prepare('UPDATE receipts SET status = ? WHERE id = ?').run(status, id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Update receipt status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete receipt
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM receipts WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export default router;
