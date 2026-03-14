import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Get all products
router.get('/', (req: AuthRequest, res: Response) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM products';
  const params: any[] = [];
  const conditions: string[] = [];

  if (search) {
    conditions.push('(name LIKE ? OR sku LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category && category !== 'All') {
    conditions.push('category = ?');
    params.push(category);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const products = db.prepare(query).all(...params);
  return res.json({ data: products, total: products.length });
});

// Get product stats
router.get('/stats', (req: AuthRequest, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count;
  const lowStock = (db.prepare('SELECT COUNT(*) as count FROM products WHERE on_hand > 0 AND on_hand <= reorder_level').get() as any).count;
  const outOfStock = (db.prepare('SELECT COUNT(*) as count FROM products WHERE on_hand = 0').get() as any).count;
  const totalValue = (db.prepare('SELECT COALESCE(SUM(per_unit_cost * on_hand), 0) as value FROM products').get() as any).value;

  return res.json({
    total,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
    total_value: totalValue
  });
});

// Get categories
router.get('/categories', (req: AuthRequest, res: Response) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  return res.json(categories.map((c: any) => c.category));
});

// Create product
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, sku, category, unit_of_measure, per_unit_cost, on_hand, free, reorder_level } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required' });
    }

    // Check SKU uniqueness
    const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existing) {
      return res.status(409).json({ error: 'A product with this SKU already exists' });
    }

    const id = uuid();
    db.prepare(`INSERT INTO products (id, name, sku, category, unit_of_measure, per_unit_cost, on_hand, free, reorder_level) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, name, sku, category || 'General', unit_of_measure || 'Units',
      per_unit_cost || 0, on_hand || 0, free ?? on_hand ?? 0, reorder_level || 10
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.status(201).json(product);
  } catch (err: any) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.patch('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const allowedFields = ['name', 'sku', 'category', 'unit_of_measure', 'per_unit_cost', 'on_hand', 'free', 'reorder_level'];
    const updates: string[] = [];
    const values: any[] = [];

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err: any) {
    console.error('Update product error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Remove related records first to avoid foreign key constraint errors
    db.prepare('DELETE FROM receipt_items WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM delivery_items WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM stock_ledger WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Delete product error:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
