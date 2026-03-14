import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import nodemailer from 'nodemailer';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

function getNextReference(): string {
  const last = db.prepare("SELECT reference FROM deliveries ORDER BY created_at DESC LIMIT 1").get() as any;
  if (!last) return 'WH/OUT/0001';
  const num = parseInt(last.reference.split('/').pop()) + 1;
  return `WH/OUT/${String(num).padStart(4, '0')}`;
}

// Get all deliveries
router.get('/', (req: AuthRequest, res: Response) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM deliveries';
  const params: any[] = [];
  const conditions: string[] = [];

  if (status && status !== 'All') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(reference LIKE ? OR to_location LIKE ? OR contact LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const deliveries = db.prepare(query).all(...params);

  const enriched = deliveries.map((d: any) => {
    const items = db.prepare(`
      SELECT di.*, p.name as product_name, p.sku as product_sku, p.unit_of_measure
      FROM delivery_items di JOIN products p ON di.product_id = p.id
      WHERE di.delivery_id = ?
    `).all(d.id);
    return { ...d, items };
  });

  return res.json({ data: enriched, total: enriched.length, page: 1, limit: 50 });
});

// Create delivery
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { from, to, contact, schedule_date, items } = req.body;

    if (!to) return res.status(400).json({ error: 'Customer/To is required' });

    const id = uuid();
    const reference = getNextReference();

    db.prepare(`INSERT INTO deliveries (id, reference, from_location, to_location, contact, receiver_name, receiver_email, schedule_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Ready', ?)`).run(
      id, reference, from || 'WH/Stock', to, contact || '', req.body.receiver_name || '', req.body.receiver_email || '', schedule_date || new Date().toISOString().split('T')[0], req.userId
    );

    if (items && Array.isArray(items)) {
      const insertItem = db.prepare('INSERT INTO delivery_items (id, delivery_id, product_id, quantity) VALUES (?, ?, ?, ?)');
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insertItem.run(uuid(), id, item.product_id, item.quantity);
        }
      }
    }

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id);

    // Send email receipt
    if (req.body.receiver_email && process.env.SMTP_HOST) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        
        let productsHtml = '';
        if (items && Array.isArray(items)) {
          for (const item of items) {
             const prod = db.prepare('SELECT name FROM products WHERE id = ?').get(item.product_id) as any;
             if (prod) productsHtml += `<li>${item.quantity}x ${prod.name}</li>`;
          }
        }

        transporter.sendMail({
          from: `"Sanchay Logistics" <${process.env.SMTP_FROM || 'noreply@sanchay.com'}>`,
          to: req.body.receiver_email,
          subject: `Delivery Scheduled: ${reference}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h2 style="color: #0F1E38;">Delivery Scheduled</h2>
              <p>Hello <strong>${req.body.receiver_name || 'Customer'}</strong>,</p>
              <p>A delivery has been scheduled for you. Reference: <strong>${reference}</strong>.</p>
              <p><strong>Scheduled Date:</strong> ${schedule_date || new Date().toISOString().split('T')[0]}</p>
              <p><strong>Delivery Address:</strong> ${to}</p>
              <br/>
              <h3>Items:</h3>
              <ul>${productsHtml}</ul>
              <br/>
              <p>Thank you,<br/>Sanchay Logistics Team</p>
            </div>
          `
        }).catch(err => console.log('Mail send error:', err.message));
      } catch (e) {
        console.log('Mail configuration error');
      }
    }

    return res.status(201).json(delivery);
  } catch (err: any) {
    console.error('Create delivery error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update delivery status (with stock update on "Done")
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const delivery = db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id) as any;
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    if (status === 'Done' && delivery.status !== 'Done') {
      const items = db.prepare('SELECT * FROM delivery_items WHERE delivery_id = ?').all(id) as any[];
      
      const updateStock = db.prepare('UPDATE products SET on_hand = MAX(0, on_hand - ?), free = MAX(0, free - ?) WHERE id = ?');
      const insertLedger = db.prepare(`INSERT INTO stock_ledger (id, product_id, operation_type, operation_ref, quantity_change, balance_after, location, notes)
        VALUES (?, ?, 'DELIVERY', ?, ?, ?, ?, ?)`);

      let productsHtml = '';
      for (const item of items) {
        updateStock.run(item.quantity, item.quantity, item.product_id);
        const product = db.prepare('SELECT name, on_hand FROM products WHERE id = ?').get(item.product_id) as any;
        insertLedger.run(uuid(), item.product_id, delivery.reference, -item.quantity, product.on_hand, delivery.from_location, `Delivered via ${delivery.reference}`);
        if (product) productsHtml += `<li style="padding:4px 0">${item.quantity}x <strong>${product.name}</strong></li>`;
      }

      // Send completion email to receiver
      if (delivery.receiver_email && process.env.SMTP_HOST) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });

          transporter.sendMail({
            from: `"Sanchay Logistics" <${process.env.SMTP_FROM || 'noreply@sanchay.com'}>`,
            to: delivery.receiver_email,
            subject: `✅ Delivery Completed: ${delivery.reference}`,
            html: `
              <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
                <div style="background:#0F1E38;padding:24px 32px;display:flex;align-items:center;gap:12px">
                  <div style="background:white;color:#0F1E38;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;font-family:'Plus Jakarta Sans',sans-serif">S</div>
                  <span style="color:white;font-size:22px;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif">Sanchay<span style="color:#F97316">.</span></span>
                </div>
                <div style="padding:32px">
                  <div style="background:#d1fae5;color:#065f46;padding:8px 16px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;margin-bottom:16px">✅ Delivery Completed</div>
                  <p style="color:#1a1a1a;font-size:15px">Hello <strong>${delivery.receiver_name || 'Customer'}</strong>,</p>
                  <p style="color:#555;font-size:14px">Your delivery <strong style="color:#0F1E38">${delivery.reference}</strong> has been completed and dispatched.</p>
                  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
                    <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Delivery Details</p>
                    <table style="width:100%;font-size:13px;color:#555">
                      <tr><td style="padding:4px 0;color:#9ca3af">Reference</td><td style="text-align:right;font-weight:600;color:#0F1E38">${delivery.reference}</td></tr>
                      <tr><td style="padding:4px 0;color:#9ca3af">Destination</td><td style="text-align:right;font-weight:600;color:#0F1E38">${delivery.to_location}</td></tr>
                      <tr><td style="padding:4px 0;color:#9ca3af">Date</td><td style="text-align:right;font-weight:600;color:#0F1E38">${delivery.schedule_date || new Date().toISOString().split('T')[0]}</td></tr>
                    </table>
                  </div>
                  <p style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px">Items Delivered:</p>
                  <ul style="margin:0;padding-left:20px;color:#1a1a1a;font-size:13px">${productsHtml}</ul>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
                  <p style="font-size:12px;color:#9ca3af">Thank you for your business.<br/><strong>Sanchay</strong> — Warehouse Management System</p>
                </div>
              </div>
            `
          }).catch(err => console.log('Validate email error:', err.message));
        } catch (e) {
          console.log('Mail config error on validate');
        }
      }
    }

    db.prepare('UPDATE deliveries SET status = ? WHERE id = ?').run(status, id);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Update delivery status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete delivery
router.delete('/:id', (req: AuthRequest, res: Response) => {
  db.prepare('DELETE FROM deliveries WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

export default router;
