import { Router, Response } from 'express';
import db from '../db';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authMiddleware);

const COHERE_API_KEY = process.env.COHERE_API_KEY || '';

// ── Gather live database context for the AI ──
function getDatabaseContext(): string {
  const products = db.prepare('SELECT name, sku, on_hand, free, per_unit_cost, category, unit_of_measure FROM products ORDER BY name').all() as any[];
  const recentReceipts = db.prepare("SELECT reference, from_location, to_location, status, schedule_date FROM receipts ORDER BY created_at DESC LIMIT 10").all() as any[];
  const recentDeliveries = db.prepare("SELECT reference, from_location, to_location, status, schedule_date FROM deliveries ORDER BY created_at DESC LIMIT 10").all() as any[];
  const pendingReceipts = db.prepare("SELECT reference, from_location, status FROM receipts WHERE status IN ('Ready', 'Draft')").all() as any[];
  const pendingDeliveries = db.prepare("SELECT reference, to_location, status FROM deliveries WHERE status IN ('Ready', 'Draft')").all() as any[];

  const totalValue = products.reduce((sum: number, p: any) => sum + (p.on_hand * p.per_unit_cost), 0);
  const lowStock = products.filter((p: any) => p.on_hand > 0 && p.on_hand < 10);
  const outOfStock = products.filter((p: any) => p.on_hand === 0);

  return `
=== LIVE DATABASE STATE ===
PRODUCTS (${products.length} total, Total Inventory Value: ₹${totalValue.toLocaleString()}):
${products.map(p => `• ${p.name} (SKU: ${p.sku}) — On Hand: ${p.on_hand}, Free: ${p.free}, Cost: ₹${p.per_unit_cost}/${p.unit_of_measure}, Category: ${p.category}`).join('\n')}

LOW STOCK ALERTS (${lowStock.length}):
${lowStock.length > 0 ? lowStock.map(p => `⚠️ ${p.name}: only ${p.on_hand} units left`).join('\n') : 'None'}

OUT OF STOCK (${outOfStock.length}):
${outOfStock.length > 0 ? outOfStock.map(p => `❌ ${p.name}`).join('\n') : 'None'}

RECENT RECEIPTS (last 10):
${recentReceipts.map(r => `• ${r.reference} from ${r.from_location} → ${r.to_location} [${r.status}] on ${r.schedule_date}`).join('\n') || 'None'}

PENDING RECEIPTS (${pendingReceipts.length}):
${pendingReceipts.map(r => `• ${r.reference} from ${r.from_location} [${r.status}]`).join('\n') || 'None'}

RECENT DELIVERIES (last 10):
${recentDeliveries.map(d => `• ${d.reference} → ${d.to_location} [${d.status}] on ${d.schedule_date}`).join('\n') || 'None'}

PENDING DELIVERIES (${pendingDeliveries.length}):
${pendingDeliveries.map(d => `• ${d.reference} → ${d.to_location} [${d.status}]`).join('\n') || 'None'}
=== END DATABASE STATE ===
`;
}

// ── System prompt for the AI ──
function getSystemPrompt(): string {
  return `You are "Sanchay AI", the intelligent warehouse management assistant for the Sanchay WMS application.
You have REAL-TIME access to the warehouse database. Answer questions using ACTUAL data provided below.

${getDatabaseContext()}

CAPABILITIES — You can:
1. Answer ANY question about inventory, stock levels, products, receipts, deliveries using the real data above
2. Create receipts (incoming goods) — extract: product_name, quantity, from_location
3. Create delivery orders (outgoing goods) — extract: product_name, quantity, to_location  
4. Add new products — extract: product_name, per_unit_cost, on_hand (initial stock)
5. Provide analytics, summaries, alerts about warehouse operations

RESPONSE FORMAT — You MUST respond with valid JSON only, no other text:
{
  "message": "Your conversational response (use markdown for formatting: **bold**, bullet points etc)",
  "intent": "one of: check_stock | show_pending | create_receipt | create_delivery | create_product | general_query | help",
  "needs_confirmation": true/false (true ONLY when you have enough data to create a receipt/delivery/product),
  "confirmation_title": "Title for confirmation card (only if needs_confirmation)",
  "extracted_data": { extracted fields like product_name, quantity, from_location, to_location, per_unit_cost, on_hand, free } or null,
  "missing_fields": ["list of missing required fields"] or [],
  "stock_data": [array of {name, on_hand, free, per_unit_cost} objects if showing stock] or null,
  "pending_receipts": [array of {reference, from_location, status}] or null,
  "pending_deliveries": [array of {reference, to_location, status}] or null,
  "quick_replies": ["suggested follow-up actions"]
}

RULES:
- Use the REAL database data above to answer. Never make up data.
- For stock queries, include actual stock_data array from the database
- For "show pending", include actual pending_receipts and pending_deliveries arrays
- For creating things: if ALL required fields are present, set needs_confirmation=true with extracted_data
- For receipts, required: product_name, quantity, from_location
- For deliveries, required: product_name, quantity, to_location
- For products, required: product_name
- Keep messages friendly, concise, and use emojis sparingly
- Use ₹ for currency, never $
- If user asks about a product, look it up in the database above and give real numbers
- If asked "how many products" or stats, calculate from the actual data above
- Always respond with ONLY valid JSON, no extra text before or after`;
}

// ── Call Cohere API ──
async function callCohere(userMessage: string, conversationHistory: any[]): Promise<any> {
  // Build chat history for Cohere
  const chatHistory = conversationHistory.slice(-10).map((h: any) => ({
    role: h.role === 'user' ? 'USER' : 'CHATBOT',
    message: h.content
  }));

  const response = await fetch('https://api.cohere.com/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COHERE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'command-r-plus',
      message: userMessage,
      preamble: getSystemPrompt(),
      chat_history: chatHistory,
      temperature: 0.3,
      prompt_truncation: 'AUTO'
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Cohere API error:', response.status, err);
    throw new Error(`Cohere API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// ── Parse AI response into structured JSON ──
function parseAIResponse(text: string): any {
  // Try to extract JSON from the response
  try {
    // Direct JSON parse
    return JSON.parse(text);
  } catch {
    // Try to find JSON block in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }
    // Fallback: return as plain message
    return {
      message: text,
      intent: 'general_query',
      needs_confirmation: false,
      extracted_data: null,
      missing_fields: [],
      stock_data: null,
      pending_receipts: null,
      pending_deliveries: null,
      quick_replies: ['Check stock levels', 'Show pending operations']
    };
  }
}

// POST /chat/message — AI-powered message processing
router.post('/message', async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversation_history } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!COHERE_API_KEY) {
      return res.status(500).json({ error: 'Cohere API key not configured. Add COHERE_API_KEY to your .env file.' });
    }

    const cohereResponse = await callCohere(message, conversation_history || []);
    const aiText = cohereResponse.text || '';
    const parsed = parseAIResponse(aiText);

    return res.json({
      intent: parsed.intent || 'general_query',
      message: parsed.message || aiText,
      extracted_data: parsed.extracted_data || null,
      needs_confirmation: parsed.needs_confirmation || false,
      confirmation_title: parsed.confirmation_title || null,
      missing_fields: parsed.missing_fields || [],
      stock_data: parsed.stock_data || null,
      pending_receipts: parsed.pending_receipts || null,
      pending_deliveries: parsed.pending_deliveries || null,
      quick_replies: parsed.quick_replies || ['Check stock levels', 'Show pending operations']
    });
  } catch (err: any) {
    console.error('Chat message error:', err);
    return res.status(500).json({ error: 'Failed to process message: ' + (err.message || '') });
  }
});

// POST /chat/execute — execute confirmed action (receipts, deliveries, products)
router.post('/execute', (req: AuthRequest, res: Response) => {
  try {
    const { intent, data } = req.body;

    if (intent === 'create_receipt') {
      // Find or create product
      let product = db.prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?)').get(data.product_name) as any;
      if (!product) {
        const pid = uuid();
        db.prepare('INSERT INTO products (id, name, sku, category, per_unit_cost, on_hand, free, reorder_point, unit_of_measure, created_by) VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)').run(
          pid, data.product_name, `AUTO-${Date.now()}`, 'Uncategorized', 'Units', req.userId
        );
        product = { id: pid };
      }

      const receiptId = uuid();
      const last = db.prepare("SELECT reference FROM receipts ORDER BY created_at DESC LIMIT 1").get() as any;
      const num = last ? parseInt(last.reference.split('/').pop()) + 1 : 1;
      const reference = `WH/IN/${String(num).padStart(4, '0')}`;

      db.prepare('INSERT INTO receipts (id, reference, from_location, to_location, contact, schedule_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        receiptId, reference, data.from_location, data.to_location || 'WH/Stock', data.contact || '', data.schedule_date || new Date().toISOString().split('T')[0], 'Ready', req.userId
      );
      db.prepare('INSERT INTO receipt_items (id, receipt_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(uuid(), receiptId, product.id, data.quantity);

      return res.json({ success: true, message: `✅ Receipt **${reference}** created for ${data.quantity} ${data.product_name} from ${data.from_location}. Go to Receipts to validate it!` });
    }

    if (intent === 'create_delivery') {
      let product = db.prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?)').get(data.product_name) as any;
      if (!product) return res.json({ success: false, message: `❌ Product "${data.product_name}" not found in inventory. Add it first.` });

      const deliveryId = uuid();
      const last = db.prepare("SELECT reference FROM deliveries ORDER BY created_at DESC LIMIT 1").get() as any;
      const num = last ? parseInt(last.reference.split('/').pop()) + 1 : 1;
      const reference = `WH/OUT/${String(num).padStart(4, '0')}`;

      db.prepare('INSERT INTO deliveries (id, reference, from_location, to_location, contact, schedule_date, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        deliveryId, reference, data.from_location || 'WH/Stock', data.to_location, data.contact || '', data.schedule_date || new Date().toISOString().split('T')[0], 'Ready', req.userId
      );
      db.prepare('INSERT INTO delivery_items (id, delivery_id, product_id, quantity) VALUES (?, ?, ?, ?)').run(uuid(), deliveryId, product.id, data.quantity);

      return res.json({ success: true, message: `✅ Delivery **${reference}** created for ${data.quantity} ${data.product_name} to ${data.to_location}. Go to Deliveries to validate!` });
    }

    if (intent === 'create_product') {
      const existing = db.prepare('SELECT id FROM products WHERE LOWER(name) = LOWER(?)').get(data.product_name) as any;
      if (existing) return res.json({ success: false, message: `⚠️ Product "${data.product_name}" already exists in your inventory.` });

      const pid = uuid();
      db.prepare('INSERT INTO products (id, name, sku, category, per_unit_cost, on_hand, free, reorder_point, unit_of_measure, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)').run(
        pid, data.product_name, `SKU-${Date.now()}`, data.category || 'Uncategorized', data.per_unit_cost || 0, data.on_hand || 0, data.free || data.on_hand || 0, 'Units', req.userId
      );
      return res.json({ success: true, message: `✅ Product **${data.product_name}** added to inventory${data.on_hand ? ` with ${data.on_hand} units in stock` : ''}${data.per_unit_cost ? ` at ₹${data.per_unit_cost}/unit` : ''}!` });
    }

    return res.json({ success: false, message: 'Unknown action type.' });
  } catch (err: any) {
    console.error('Chat execute error:', err);
    return res.status(500).json({ success: false, message: 'Failed to execute action: ' + (err.message || '') });
  }
});

export default router;
