import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketServer } from "socket.io";
import pool from "./db";
import authRoutes from "./routes/auth";
import channelRoutes from "./routes/channels";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import { initSocketHandlers } from "./socket/handlers";
import { startNoShowChecker } from "./jobs/noShowChecker";

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io);

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "error", message: "Database unreachable" });
  }
});

initSocketHandlers(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Lumiere Pasterie API running on port ${PORT}`);
  startNoShowChecker();
});

export { app, server, io };
