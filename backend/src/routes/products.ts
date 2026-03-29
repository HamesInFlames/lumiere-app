import { Router, Request, Response } from "express";
import pool from "../db";
import { verifyToken } from "../middleware/auth";

const router = Router();

router.use(verifyToken);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name FROM products WHERE active = true ORDER BY name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
