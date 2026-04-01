import { Router, Request, Response } from "express";
import pool from "../db";
import { verifyToken } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();
router.use(verifyToken);

// ─── Categories (must be before /:id to avoid route collision) ───────────────

// GET /categories — all categories
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, created_by, created_at FROM recipe_categories ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Get recipe categories error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /categories — create category (owner or kitchen_staff)
router.post(
  "/categories",
  requireRole("owner", "kitchen_staff"),
  async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }
    try {
      const { rows } = await pool.query(
        "INSERT INTO recipe_categories (name, created_by) VALUES ($1, $2) RETURNING *",
        [name.trim(), req.user!.id]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error("Create category error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Recipes ─────────────────────────────────────────────────────────────────

// GET / — list recipes with optional filters
router.get("/", async (req: Request, res: Response) => {
  const kitchen = req.query.kitchen as string | undefined;
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;

  try {
    let query = `
      SELECT r.*, rc.name as category_name, u.name as creator_name
      FROM recipes r
      LEFT JOIN recipe_categories rc ON r.category_id = rc.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (kitchen && kitchen !== "all") {
      params.push(kitchen);
      query += ` AND (r.kitchen = $${params.length} OR r.kitchen = 'both')`;
    }

    if (category) {
      params.push(category);
      query += ` AND r.category_id = $${params.length}`;
    }

    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND r.name ILIKE $${params.length}`;
    }

    query += " ORDER BY r.name ASC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Get recipes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST / — create recipe (owner or kitchen_staff)
router.post(
  "/",
  requireRole("owner", "kitchen_staff"),
  async (req: Request, res: Response) => {
    const { name, kitchen, category_id, ingredients, instructions } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Recipe name is required" });
      return;
    }
    if (!kitchen || !["lumiere", "tova", "both"].includes(kitchen)) {
      res.status(400).json({ error: "kitchen must be lumiere, tova, or both" });
      return;
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO recipes (name, kitchen, category_id, ingredients, instructions, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          name.trim(),
          kitchen,
          category_id || null,
          ingredients || null,
          instructions || null,
          req.user!.id,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error("Create recipe error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /:id — single recipe detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, rc.name as category_name,
              u.name as creator_name, e.name as editor_name
       FROM recipes r
       LEFT JOIN recipe_categories rc ON r.category_id = rc.id
       LEFT JOIN users u ON r.created_by = u.id
       LEFT JOIN users e ON r.last_edited_by = e.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Get recipe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /:id — update recipe (owner or creator)
router.patch("/:id", async (req: Request, res: Response) => {
  const user = req.user!;

  try {
    const { rows: existing } = await pool.query(
      "SELECT created_by FROM recipes WHERE id = $1",
      [req.params.id]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }

    if (user.role !== "owner" && String(existing[0].created_by) !== String(user.id)) {
      res.status(403).json({ error: "Only the creator or owner can edit this recipe" });
      return;
    }

    const allowedFields = ["name", "kitchen", "category_id", "ingredients", "instructions"];
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        values.push(req.body[field]);
        idx++;
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    updates.push(`last_edited_by = $${idx}`);
    values.push(user.id);
    idx++;
    updates.push("last_edited_at = NOW()");
    updates.push("updated_at = NOW()");

    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE recipes SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("Update recipe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:id — delete recipe (owner or creator, double confirm on client)
router.delete("/:id", async (req: Request, res: Response) => {
  const user = req.user!;

  try {
    const { rows: existing } = await pool.query(
      "SELECT created_by FROM recipes WHERE id = $1",
      [req.params.id]
    );

    if (existing.length === 0) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }

    if (user.role !== "owner" && String(existing[0].created_by) !== String(user.id)) {
      res.status(403).json({ error: "Only the creator or owner can delete this recipe" });
      return;
    }

    await pool.query("DELETE FROM recipes WHERE id = $1", [req.params.id]);
    res.json({ message: "Recipe deleted" });
  } catch (err) {
    console.error("Delete recipe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
