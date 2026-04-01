import { Router, Request, Response } from "express";
import pool from "../db";
import { verifyToken } from "../middleware/auth";
import { notifyByRole } from "../services/notifications";

const router = Router();

router.use(verifyToken);

async function userHasChannelAccess(
  role: string,
  channelId: string
): Promise<boolean> {
  const { rows } = await pool.query(
    "SELECT 1 FROM channel_roles WHERE channel_id = $1 AND role = $2",
    [channelId, role]
  );
  return rows.length > 0;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.label
       FROM channels c
       JOIN channel_roles cr ON cr.channel_id = c.id
       WHERE cr.role = $1
       ORDER BY c.name`,
      [req.user!.role]
    );
    res.json(rows);
  } catch (err) {
    console.error("Get channels error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/messages", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const before = req.query.before as string | undefined;

  try {
    if (!(await userHasChannelAccess(req.user!.role, id))) {
      res.status(403).json({ error: "No access to this channel" });
      return;
    }

    let query: string;
    let params: unknown[];

    if (before) {
      query = `
        SELECT m.id, m.content, m.type, m.image_url, m.order_id, m.created_at,
               json_build_object('id', u.id, 'name', u.name, 'role', u.role) AS user
        FROM messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.channel_id = $1
          AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
        ORDER BY m.created_at DESC
        LIMIT 50`;
      params = [id, before];
    } else {
      query = `
        SELECT m.id, m.content, m.type, m.image_url, m.order_id, m.created_at,
               json_build_object('id', u.id, 'name', u.name, 'role', u.role) AS user
        FROM messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.channel_id = $1
        ORDER BY m.created_at DESC
        LIMIT 50`;
      params = [id];
    }

    const { rows } = await pool.query(query, params);

    // Transform to match mobile Message interface
    const messages = rows.map((row) => ({
      id: row.id,
      channelId: id,
      senderId: String(row.user.id),
      senderName: row.user.name,
      type: row.type,
      content: row.content,
      image_url: row.image_url,
      order_id: row.order_id,
      created_at: row.created_at,
    }));

    res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/messages", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { type, content, image_url, order_id } = req.body;

  const validTypes = ["text", "image", "order_ref"];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({ error: "type must be one of: text, image, order_ref" });
    return;
  }

  try {
    if (!(await userHasChannelAccess(req.user!.role, id))) {
      res.status(403).json({ error: "No access to this channel" });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (channel_id, user_id, type, content, image_url, order_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, channel_id, user_id, type, content, image_url, order_id, created_at`,
      [id, req.user!.id, type, content || null, image_url || null, order_id || null]
    );

    // Transform to match mobile Message interface
    const message = {
      id: rows[0].id,
      channelId: id,
      senderId: String(req.user!.id),
      senderName: req.user!.name,
      type: rows[0].type,
      content: rows[0].content,
      image_url: rows[0].image_url,
      order_id: rows[0].order_id,
      created_at: rows[0].created_at,
    };

    const io = req.app.get("io");
    if (io) {
      io.to(id).emit("new_message", message);
    }

    // Push notification for chat messages (text only, not system messages)
    if (type === "text" && content) {
      const { rows: channelRows } = await pool.query(
        "SELECT label FROM channels WHERE id = $1",
        [id]
      );
      const channelLabel = channelRows[0]?.label ?? "Chat";
      const { rows: roleRows } = await pool.query(
        "SELECT role FROM channel_roles WHERE channel_id = $1",
        [id]
      );
      const channelRoles = roleRows.map((r) => r.role as string);
      notifyByRole(
        channelRoles,
        `${req.user!.name} in ${channelLabel}`,
        content.length > 100 ? content.slice(0, 100) + "…" : content,
        { type: "chat", channel_id: id },
        req.user!.id
      ).catch(() => {});
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("Post message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
