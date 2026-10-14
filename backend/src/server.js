import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";
import ticketRoutes from "./routes/tickets.js";
import { authenticate } from "./middleware/auth.js";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ok", database: "connected" }); }
  catch { res.status(503).json({ status: "error", database: "unavailable" }); }
});
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/tickets", ticketRoutes);
app.get("/api/me", authenticate, (req, res) => res.json({ user: req.user }));

app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`BookLeaf API listening on port ${port}`));
