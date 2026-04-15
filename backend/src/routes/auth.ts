import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db";
import { verifyToken } from "../middleware/auth";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1 AND active = true",
      [email]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = rows[0];

    if (!bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "30d") as jwt.SignOptions["expiresIn"] }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [req.user!.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /change-password — change password for the authenticated user
router.put("/change-password", verifyToken, async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    res.status(400).json({ error: "Current password and new password are required" });
    return;
  }

  if (new_password.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  try {
    const { rows } = await pool.query(
      "SELECT password FROM users WHERE id = $1",
      [req.user!.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!bcrypt.compareSync(current_password, rows[0].password)) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      req.user!.id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /push-token — register Expo push token for the authenticated user
router.put("/push-token", verifyToken, async (req: Request, res: Response) => {
  const { push_token } = req.body;

  if (!push_token || typeof push_token !== "string") {
    res.status(400).json({ error: "push_token is required" });
    return;
  }

  try {
    await pool.query("UPDATE users SET push_token = $1 WHERE id = $2", [
      push_token,
      req.user!.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Push token update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /push-token — clear push token on logout
router.delete("/push-token", verifyToken, async (req: Request, res: Response) => {
  try {
    await pool.query("UPDATE users SET push_token = NULL WHERE id = $1", [
      req.user!.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Push token clear error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
