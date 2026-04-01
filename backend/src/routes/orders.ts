import { Router, Request, Response } from "express";
import pool from "../db";
import { verifyToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { upload } from "../middleware/upload";
import { uploadImage } from "../services/cloudinary";
import { notifyByRole } from "../services/notifications";

const router = Router();

router.use(verifyToken);

// ---------------------------------------------------------------------------
// POST /preorder
// ---------------------------------------------------------------------------
router.post(
  "/preorder",
  requireRole("owner", "bar_staff"),
  async (req: Request, res: Response) => {
    const {
      payment_status,
      pickup_date,
      pickup_time,
      customer_name,
      phone_number,
      notes,
      items,
    } = req.body;

    if (!payment_status || !pickup_date || !customer_name) {
      res
        .status(400)
        .json({ error: "payment_status, pickup_date, and customer_name are required" });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "At least one item is required" });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders
           (type, status, created_by, payment_status, pickup_date, pickup_time,
            customer_name, phone_number, notes)
         VALUES ('preorder', 'new', $1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.user!.id,
          payment_status,
          pickup_date,
          pickup_time || null,
          customer_name,
          phone_number || null,
          notes || null,
        ]
      );

      const order = orderRows[0];

      const orderItems = [];
      for (const item of items) {
        const { rows: itemRows } = await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            order.id,
            item.product_id || null,
            item.product_name,
            item.quantity,
            item.notes || null,
          ]
        );
        orderItems.push(itemRows[0]);
      }

      // Post order_ref message to lumiere_official channel
      const { rows: channelRows } = await client.query(
        "SELECT id FROM channels WHERE name = 'lumiere_official' LIMIT 1"
      );

      if (channelRows.length > 0) {
        const channelId = channelRows[0].id;
        const { rows: msgRows } = await client.query(
          `INSERT INTO messages (channel_id, user_id, type, order_id)
           VALUES ($1, $2, 'order_ref', $3)
           RETURNING id, channel_id, user_id, type, content, image_url, order_id, created_at`,
          [channelId, req.user!.id, order.id]
        );

        const message = {
          ...msgRows[0],
          user: { id: req.user!.id, name: req.user!.name, role: req.user!.role },
        };

        const io = req.app.get("io");
        if (io) {
          io.to(channelId).emit("new_message", message);
        }
      }

      await client.query("COMMIT");

      // Push notification for new preorder
      notifyByRole(
        ["owner", "bar_staff", "kitchen_staff"],
        "New Pre-order",
        `${customer_name} — pickup ${pickup_date}`,
        { type: "order", order_id: order.id },
        req.user!.id
      ).catch(() => {});

      res.status(201).json({ ...order, items: orderItems });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Create preorder error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

// ---------------------------------------------------------------------------
// POST /wholesale
// ---------------------------------------------------------------------------
router.post(
  "/wholesale",
  requireRole("owner"),
  async (req: Request, res: Response) => {
    const { wholesale_code, due_date, due_time_context, notes, kitchens } = req.body;

    if (!wholesale_code || !due_date) {
      res.status(400).json({ error: "wholesale_code and due_date are required" });
      return;
    }

    if (!Array.isArray(kitchens) || kitchens.length === 0) {
      res.status(400).json({ error: "At least one kitchen is required" });
      return;
    }

    for (const k of kitchens) {
      if (!Array.isArray(k.items) || k.items.length === 0) {
        res
          .status(400)
          .json({ error: `Kitchen '${k.kitchen}' must have at least one item` });
        return;
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders
           (type, status, created_by, wholesale_code, due_date, due_time_context, notes)
         VALUES ('wholesale', 'new', $1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user!.id, wholesale_code, due_date, due_time_context || null, notes || null]
      );

      const order = orderRows[0];

      const orderItems = [];
      for (const k of kitchens) {
        for (const item of k.items) {
          const { rows: itemRows } = await client.query(
            `INSERT INTO order_items (order_id, product_id, product_name, quantity, kitchen)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [order.id, item.product_id || null, item.product_name, item.quantity, k.kitchen]
          );
          orderItems.push(itemRows[0]);
        }
      }

      const { rows: channelRows } = await client.query(
        "SELECT id FROM channels WHERE name = 'lumiere_official' LIMIT 1"
      );

      if (channelRows.length > 0) {
        const channelId = channelRows[0].id;
        const { rows: msgRows } = await client.query(
          `INSERT INTO messages (channel_id, user_id, type, order_id)
           VALUES ($1, $2, 'order_ref', $3)
           RETURNING id, channel_id, user_id, type, content, image_url, order_id, created_at`,
          [channelId, req.user!.id, order.id]
        );

        const message = {
          ...msgRows[0],
          user: { id: req.user!.id, name: req.user!.name, role: req.user!.role },
        };

        const io = req.app.get("io");
        if (io) {
          io.to(channelId).emit("new_message", message);
        }
      }

      await client.query("COMMIT");

      // Push notification for new wholesale order
      notifyByRole(
        ["owner", "kitchen_staff"],
        "New Wholesale Order",
        `${wholesale_code} — due ${due_date}`,
        { type: "order", order_id: order.id },
        req.user!.id
      ).catch(() => {});

      res.status(201).json({ ...order, items: orderItems });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Create wholesale order error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

// ---------------------------------------------------------------------------
// GET /calendar
// ---------------------------------------------------------------------------
router.get("/calendar", async (req: Request, res: Response) => {
  const view = req.query.view as string | undefined;
  const date = req.query.date as string | undefined;
  const type = (req.query.type as string) || "all";

  if (!view || !["day", "week", "month"].includes(view)) {
    res.status(400).json({ error: "view must be one of: day, week, month" });
    return;
  }

  if (!date) {
    res.status(400).json({ error: "date is required (ISO format)" });
    return;
  }

  const anchor = new Date(date);
  let startDate: string;
  let endDate: string;

  if (view === "day") {
    startDate = date;
    endDate = date;
  } else if (view === "week") {
    const day = anchor.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setUTCDate(anchor.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    startDate = monday.toISOString().split("T")[0];
    endDate = sunday.toISOString().split("T")[0];
  } else {
    const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const last = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    startDate = first.toISOString().split("T")[0];
    endDate = last.toISOString().split("T")[0];
  }

  try {
    const conditions: string[] = [];
    const params: unknown[] = [startDate, endDate];

    if (type === "preorder") {
      conditions.push("o.type = 'preorder' AND o.pickup_date BETWEEN $1 AND $2");
    } else if (type === "wholesale") {
      conditions.push("o.type = 'wholesale' AND o.due_date BETWEEN $1 AND $2");
    } else {
      conditions.push(
        "(o.type = 'preorder' AND o.pickup_date BETWEEN $1 AND $2) OR (o.type = 'wholesale' AND o.due_date BETWEEN $1 AND $2)"
      );
    }

    const { rows } = await pool.query(
      `SELECT o.id, o.type, o.status, o.pickup_date, o.pickup_time,
              o.due_date, o.due_time_context, o.customer_name, o.wholesale_code,
              (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
              json_build_object('id', u.id, 'name', u.name) AS created_by
       FROM orders o
       JOIN users u ON u.id = o.created_by
       WHERE ${conditions[0]}
       ORDER BY COALESCE(o.pickup_date, o.due_date) ASC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error("Get calendar error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /upcoming-noshows
// ---------------------------------------------------------------------------
router.get(
  "/upcoming-noshows",
  requireRole("owner", "bar_staff"),
  async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, customer_name, phone_number, pickup_date, pickup_time, status
         FROM orders
         WHERE type = 'preorder'
           AND pickup_date <= CURRENT_DATE
           AND status NOT IN ('picked_up', 'cancelled', 'no_show')
           AND no_show_notified = false
         ORDER BY pickup_date ASC`
      );
      res.json(rows);
    } catch (err) {
      console.error("Get upcoming noshows error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /:id
// ---------------------------------------------------------------------------
router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const { rows: orderRows } = await pool.query(
      `SELECT o.*,
              json_build_object('id', cb.id, 'name', cb.name, 'role', cb.role) AS created_by_user
       FROM orders o
       JOIN users cb ON cb.id = o.created_by
       WHERE o.id = $1`,
      [id]
    );

    if (orderRows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = orderRows[0];

    // Fetch last_edited_by user if edited
    let lastEditedByUser = null;
    if (order.edited && order.last_edited_by) {
      const { rows } = await pool.query(
        "SELECT id, name, role FROM users WHERE id = $1",
        [order.last_edited_by]
      );
      if (rows.length > 0) lastEditedByUser = rows[0];
    }

    const { rows: items } = await pool.query(
      "SELECT * FROM order_items WHERE order_id = $1",
      [id]
    );

    const { rows: attachments } = await pool.query(
      "SELECT * FROM order_attachments WHERE order_id = $1",
      [id]
    );

    res.json({
      ...order,
      created_by_user: order.created_by_user,
      last_edited_by_user: lastEditedByUser,
      items,
      attachments,
    });
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/attachments
// ---------------------------------------------------------------------------
router.post(
  "/:id/attachments",
  requireRole("owner", "kitchen_staff"),
  upload.single("image"),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;

    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }

    try {
      const { rows: orderCheck } = await pool.query(
        "SELECT id FROM orders WHERE id = $1",
        [id]
      );

      if (orderCheck.length === 0) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const imageUrl = await uploadImage(req.file.buffer, "lumiere/order-attachments");
      const note = req.body.note || null;

      const { rows } = await pool.query(
        `INSERT INTO order_attachments (order_id, uploaded_by, image_url, note)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, req.user!.id, imageUrl, note]
      );

      const attachment = rows[0];

      const { rows: channelRows } = await pool.query(
        "SELECT id FROM channels WHERE name = 'lumiere_official' LIMIT 1"
      );

      if (channelRows.length > 0) {
        const io = req.app.get("io");
        if (io) {
          io.to(channelRows[0].id).emit("order_attachment_added", {
            orderId: id,
            imageUrl,
            note,
            uploadedBy: { id: req.user!.id, name: req.user!.name },
          });
        }
      }

      res.status(201).json(attachment);
    } catch (err) {
      console.error("Upload attachment error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /:id
// ---------------------------------------------------------------------------
router.patch("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;

  if (user.role === "kitchen_staff") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT created_by FROM orders WHERE id = $1",
      [id]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (user.role === "bar_staff" && existing[0].created_by !== user.id) {
      res.status(403).json({ error: "You can only edit your own orders" });
      return;
    }

    const allowedFields = [
      "payment_status",
      "pickup_date",
      "pickup_time",
      "customer_name",
      "phone_number",
      "notes",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    updates.push(`edited = true`);
    updates.push(`last_edited_by = $${paramIndex}`);
    values.push(user.id);
    paramIndex++;
    updates.push(`last_edited_at = NOW()`);
    updates.push(`updated_at = NOW()`);

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id
// ---------------------------------------------------------------------------
router.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const user = req.user!;

  if (user.role === "kitchen_staff") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  try {
    const { rows: existing } = await pool.query(
      "SELECT created_by FROM orders WHERE id = $1",
      [id]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (user.role === "bar_staff" && existing[0].created_by !== user.id) {
      res.status(403).json({ error: "You can only delete your own orders" });
      return;
    }

    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
    res.json({ message: "Order deleted" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id/status
// ---------------------------------------------------------------------------
const BAR_STATUSES = ["confirmed", "picked_up", "no_show", "cancelled"];
const KITCHEN_STATUSES = ["in_preparation", "prepared"];

router.patch("/:id/status", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  const user = req.user!;

  if (!status) {
    res.status(400).json({ error: "status is required" });
    return;
  }

  const isBarStatus = BAR_STATUSES.includes(status);
  const isKitchenStatus = KITCHEN_STATUSES.includes(status);

  if (!isBarStatus && !isKitchenStatus) {
    res.status(400).json({
      error: `Invalid status. Allowed: ${[...BAR_STATUSES, ...KITCHEN_STATUSES].join(", ")}`,
    });
    return;
  }

  if (isBarStatus && user.role !== "owner" && user.role !== "bar_staff") {
    res.status(403).json({ error: "Only owner or bar_staff can set this status" });
    return;
  }

  if (isKitchenStatus && user.role !== "owner" && user.role !== "kitchen_staff") {
    res.status(403).json({ error: "Only owner or kitchen_staff can set this status" });
    return;
  }

  try {
    const { rows } = await pool.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const order = rows[0];
    const STATUS_LABELS: Record<string, string> = {
      confirmed: "Confirmed",
      in_preparation: "In Preparation",
      prepared: "Ready",
      picked_up: "Picked Up",
      no_show: "No Show",
      cancelled: "Cancelled",
    };

    const label = order.customer_name || order.wholesale_code || `Order #${id}`;
    const statusLabel = STATUS_LABELS[status] ?? status;

    // Notify relevant roles about status change
    const notifyRoles =
      isKitchenStatus
        ? ["owner", "bar_staff"]
        : ["owner", "kitchen_staff"];
    notifyByRole(
      notifyRoles,
      `Order ${statusLabel}`,
      `${label} is now ${statusLabel.toLowerCase()}`,
      { type: "order", order_id: order.id },
      user.id
    ).catch(() => {});

    res.json(order);
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
