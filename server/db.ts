import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcryptjs from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'stockflow.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      role TEXT DEFAULT 'inventory_manager',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'General',
      unit_of_measure TEXT DEFAULT 'Units',
      per_unit_cost REAL DEFAULT 0,
      on_hand INTEGER DEFAULT 0,
      free INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      address TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_code TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      contact TEXT DEFAULT '',
      schedule_date TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS receipt_items (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      contact TEXT DEFAULT '',
      receiver_name TEXT DEFAULT '',
      receiver_email TEXT DEFAULT '',
      schedule_date TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS delivery_items (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      from_location TEXT NOT NULL,
      to_location TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'Draft',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transfer_items (
      id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS adjustments (
      id TEXT PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      product_id TEXT NOT NULL,
      location TEXT DEFAULT '',
      recorded_qty INTEGER NOT NULL,
      counted_qty INTEGER NOT NULL,
      difference INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS stock_ledger (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      operation_ref TEXT NOT NULL,
      quantity_change INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      location TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Handle Migrations: Check if the new columns exist since schemas can drift without dropping.
  const columns = db.prepare('PRAGMA table_info(deliveries)').all() as any[];
  const hasReceiverName = columns.some(c => c.name === 'receiver_name');
  
  if (!hasReceiverName) {
    db.exec(`
      ALTER TABLE deliveries ADD COLUMN receiver_name TEXT DEFAULT '';
      ALTER TABLE deliveries ADD COLUMN receiver_email TEXT DEFAULT '';
    `);
  }

  // Seed default data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    seedData();
  }
}

function seedData() {
  const uuid = uuidv4;

  // Seed warehouses
  const wh1Id = uuid();
  const wh2Id = uuid();
  db.prepare('INSERT INTO warehouses (id, name, short_code, address) VALUES (?, ?, ?, ?)').run(
    wh1Id, 'Main Warehouse', 'WH', '123 Logistics Way, Industrial Zone'
  );
  db.prepare('INSERT INTO warehouses (id, name, short_code, address) VALUES (?, ?, ?, ?)').run(
    wh2Id, 'North Storage', 'NORTH', '456 Northern Ave, North Side'
  );

  // Seed locations
  db.prepare('INSERT INTO locations (id, name, short_code, warehouse_id) VALUES (?, ?, ?, ?)').run(uuid(), 'Stock Room 1', 'Stock1', wh1Id);
  db.prepare('INSERT INTO locations (id, name, short_code, warehouse_id) VALUES (?, ?, ?, ?)').run(uuid(), 'Receiving Bay', 'Bay1', wh1Id);
  db.prepare('INSERT INTO locations (id, name, short_code, warehouse_id) VALUES (?, ?, ?, ?)').run(uuid(), 'Cold Storage', 'Cold', wh2Id);

  // Seed products
  const products = [
    { name: 'Office Desk', sku: 'OD-001', category: 'Furniture', uom: 'Units', cost: 3000, on_hand: 25, free: 20 },
    { name: 'Ergonomic Chair', sku: 'EC-002', category: 'Furniture', uom: 'Units', cost: 1500, on_hand: 45, free: 40 },
    { name: 'Monitor Stand', sku: 'MS-003', category: 'Accessories', uom: 'Units', cost: 500, on_hand: 8, free: 5 },
    { name: 'Mechanical Keyboard', sku: 'MK-004', category: 'Electronics', uom: 'Units', cost: 1200, on_hand: 0, free: 0 },
    { name: 'Steel Rods', sku: 'SR-005', category: 'Raw Materials', uom: 'Kg', cost: 80, on_hand: 100, free: 100 },
  ];

  for (const p of products) {
    db.prepare(`INSERT INTO products (id, name, sku, category, unit_of_measure, per_unit_cost, on_hand, free) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      uuid(), p.name, p.sku, p.category, p.uom, p.cost, p.on_hand, p.free
    );
  }
}

export default db;
