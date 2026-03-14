import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import database and routes
import { initializeDatabase } from "./server/db";
import authRoutes from "./server/routes/auth";
import productRoutes from "./server/routes/products";
import receiptRoutes from "./server/routes/receipts";
import deliveryRoutes from "./server/routes/deliveries";
import transferRoutes from "./server/routes/transfers";
import adjustmentRoutes from "./server/routes/adjustments";
import warehouseRoutes, { locationRouter } from "./server/routes/warehouses";
import dashboardRoutes from "./server/routes/dashboard";
import profileRoutes from "./server/routes/profile";
import chatRoutes from "./server/routes/chat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize database tables and seed data
  initializeDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ─── API Routes ──────────────────────────────────

  // Public routes (no auth required)
  app.use("/api/auth", authRoutes);

  // Protected routes (auth required — middleware is applied inside each router)
  app.use("/api/products", productRoutes);
  app.use("/api/receipts", receiptRoutes);
  app.use("/api/delivery", deliveryRoutes);
  app.use("/api/transfers", transferRoutes);
  app.use("/api/adjustments", adjustmentRoutes);
  app.use("/api/warehouses", warehouseRoutes);
  app.use("/api/locations", locationRouter);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/chat", chatRoutes);

  // ─── Vite Dev Server / Static Files ──────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 StockFlow server running on http://localhost:${PORT}\n`);
  });
}

startServer();
