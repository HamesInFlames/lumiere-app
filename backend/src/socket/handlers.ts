import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "../db";
import { AuthPayload } from "../middleware/auth";

export function initSocketHandlers(io: SocketServer) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Missing auth token"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as AuthPayload;
    console.log(`Client connected: ${socket.id} (${user.name}, ${user.role})`);

    socket.on("join_channel", async (channelId: string) => {
      try {
        const { rows } = await pool.query(
          "SELECT 1 FROM channel_roles WHERE channel_id = $1 AND role = $2",
          [channelId, user.role]
        );

        if (rows.length === 0) {
          socket.emit("error", { message: "No access to this channel" });
          return;
        }

        socket.join(channelId);
        socket.emit("joined", { channelId });
      } catch (err) {
        console.error("join_channel error:", err);
        socket.emit("error", { message: "Failed to join channel" });
      }
    });

    socket.on("leave_channel", (channelId: string) => {
      socket.leave(channelId);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
