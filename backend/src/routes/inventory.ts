import { Router, Request, Response } from "express";
import pool from "../db";
import { verifyToken } from "../middleware/auth";

const router = Router();

router.use(verifyToken);

// ---------------------------------------------------------------------------
// GET / — list inventory items (filter by module)
// ---------------------------------------------------------------------------
router.get("/", async (req: Request, res: Response) => {
  const { module } = req.query;

  try {
    let query = `
      SELECT i.*, u.name AS updated_by_name
      FROM inventory_items i
      LEFT JOIN users u ON u.id = i.updated_by
    `;
    const params: string[] = [];

    if (module === "bar" || module === "kitchen") {
      query += " WHERE i.module = $1";
      params.push(module);
    }

    query += " ORDER BY i.name ASC";

    const { rows } = await pool.query(query, params);

    // Map updated_by_name into updated_by for the mobile client
    const items = rows.map((r) => ({
      ...r,
      updated_by: r.updated_by_name ?? r.updated_by,
    }));

    res.json(items);
  } catch (err) {
    console.error("Get inventory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST / — create inventory item
// ---------------------------------------------------------------------------
router.post("/", async (req: Request, res: Response) => {
  const { name, module, unit, quantity, low_threshold } = req.body;

  if (!name || !module || !unit) {
    res.status(400).json({ error: "name, module, and unit are required" });
    return;
  }

  if (module !== "bar" && module !== "kitchen") {
    res.status(400).json({ error: "module must be 'bar' or 'kitchen'" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO inventory_items (name, module, unit, quantity, low_threshold, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [
        name.trim(),
        module,
        unit.trim(),
        quantity ?? 0,
        low_threshold ?? 5,
        req.user!.id,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Create inventory item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /:id — update inventory item quantity
// ---------------------------------------------------------------------------
router.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity === null) {
    res.status(400).json({ error: "quantity is required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get current quantity for history
    const { rows: current } = await client.query(
      "SELECT quantity FROM inventory_items WHERE id = $1",
      [id]
    );

    if (current.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const previousQty = current[0].quantity;

    // Update the item
    const { rows } = await client.query(
      `UPDATE inventory_items
       SET quantity = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [quantity, req.user!.id, id]
    );

    // Record history
    await client.query(
      `INSERT INTO inventory_history (item_id, previous_qty, new_qty, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, previousQty, quantity, req.user!.id]
    );

    await client.query("COMMIT");

    res.json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update inventory item error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// GET /:id/history — get change history for an item
// ---------------------------------------------------------------------------
router.get("/:id/history", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT h.*, u.name AS changed_by
       FROM inventory_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.item_id = $1
       ORDER BY h.changed_at DESC
       LIMIT 50`,
      [id]
    );

    res.json(rows);
  } catch (err) {
    console.error("Get inventory history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
