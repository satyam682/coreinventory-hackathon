import { Router, Response } from 'express';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Dashboard stats
router.get('/stats', (req: AuthRequest, res: Response) => {
  const totalProducts = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c;
  const lowStock = (db.prepare('SELECT COUNT(*) as c FROM products WHERE on_hand > 0 AND on_hand <= reorder_level').get() as any).c;
  const outOfStock = (db.prepare('SELECT COUNT(*) as c FROM products WHERE on_hand = 0').get() as any).c;
  const pendingReceipts = (db.prepare("SELECT COUNT(*) as c FROM receipts WHERE status NOT IN ('Done', 'Canceled')").get() as any).c;
  const pendingDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status NOT IN ('Done', 'Canceled')").get() as any).c;
  const pendingTransfers = (db.prepare("SELECT COUNT(*) as c FROM transfers WHERE status NOT IN ('Done', 'Canceled')").get() as any).c;
  const lateOps = (db.prepare("SELECT COUNT(*) as c FROM receipts WHERE status = 'Late'").get() as any).c
    + (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Late'").get() as any).c;
  const totalStockItems = (db.prepare('SELECT COALESCE(SUM(on_hand), 0) as c FROM products').get() as any).c;

  return res.json({
    total_products: totalProducts,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
    receipts_pending: pendingReceipts,
    deliveries_pending: pendingDeliveries,
    transfers_pending: pendingTransfers,
    late_operations_count: lateOps,
    total_stock_items: totalStockItems
  });
});

// Receipt summary
router.get('/receipt-summary', (req: AuthRequest, res: Response) => {
  const toReceive = (db.prepare("SELECT COUNT(*) as c FROM receipts WHERE status IN ('Ready', 'Draft')").get() as any).c;
  const total = (db.prepare('SELECT COUNT(*) as c FROM receipts').get() as any).c;
  const completed = (db.prepare("SELECT COUNT(*) as c FROM receipts WHERE status = 'Done'").get() as any).c;
  const late = (db.prepare("SELECT COUNT(*) as c FROM receipts WHERE status = 'Late'").get() as any).c;

  return res.json({ to_receive: toReceive, total_operations: total, completed, late_count: late });
});

// Delivery summary
router.get('/delivery-summary', (req: AuthRequest, res: Response) => {
  const toDeliver = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status IN ('Ready', 'Draft')").get() as any).c;
  const total = (db.prepare('SELECT COUNT(*) as c FROM deliveries').get() as any).c;
  const completed = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Done'").get() as any).c;
  const late = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Late'").get() as any).c;

  return res.json({ to_deliver: toDeliver, total_operations: total, completed, late_count: late });
});

// Recent moves from stock ledger
router.get('/recent-moves', (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  
  const moves = db.prepare(`
    SELECT sl.id, sl.operation_ref as reference, sl.operation_type as type,
           sl.location as "from", sl.location as "to",
           sl.quantity_change, sl.balance_after, sl.notes as contact,
           sl.created_at as date, 
           CASE sl.operation_type 
             WHEN 'RECEIPT' THEN 'IN'
             WHEN 'DELIVERY' THEN 'OUT'
             WHEN 'TRANSFER' THEN 'INTERNAL'
             WHEN 'ADJUSTMENT' THEN 'ADJ'
           END as move_type,
           'Done' as status,
           p.name as product_name
    FROM stock_ledger sl
    LEFT JOIN products p ON sl.product_id = p.id
    ORDER BY sl.created_at DESC
    LIMIT ?
  `).all(limit);

  // If no ledger entries yet, return from recent operations
  if (moves.length === 0) {
    const recentOps: any[] = [];
    
    const receipts = db.prepare("SELECT id, reference, 'IN' as type, from_location as 'from', to_location as 'to', contact, schedule_date as date, status FROM receipts ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
    const deliveries = db.prepare("SELECT id, reference, 'OUT' as type, from_location as 'from', to_location as 'to', contact, schedule_date as date, status FROM deliveries ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
    const transfers = db.prepare("SELECT id, reference, 'INTERNAL' as type, from_location as 'from', to_location as 'to', notes as contact, created_at as date, status FROM transfers ORDER BY created_at DESC LIMIT ?").all(limit) as any[];

    recentOps.push(...receipts, ...deliveries, ...transfers);
    recentOps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json(recentOps.slice(0, limit));
  }

  return res.json(moves);
});

export default router;
