
import { Router } from "express";
import { pool } from "../db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { classifyTicket, draftResponse } from "../services/ticketAi.js";

const router = Router();

router.post("/", authenticate, requireRole("author"), async (req, res, next) => {
  try {
    const subject = String(req.body.subject || "").trim();
    const description = String(req.body.description || "").trim();
    const bookId = req.body.bookId || null;

    if (subject.length < 3 || subject.length > 160) {
      return res.status(400).json({
        error: "Subject must be between 3 and 160 characters"
      });
    }

    if (description.length < 10 || description.length > 10000) {
      return res.status(400).json({
        error: "Description must be between 10 and 10,000 characters"
      });
    }

    if (bookId) {
      const [ownedBooks] = await pool.query(
        "SELECT 1 FROM books WHERE book_id = ? AND author_user_id = ?",
        [bookId, req.user.id]
      );

      if (!ownedBooks.length) {
        return res.status(403).json({
          error: "Selected book does not belong to your account"
        });
      }
    }

    const { category, priority } = await classifyTicket(subject, description);

    const [created] = await pool.query(
      `INSERT INTO tickets
        (author_user_id, book_id, subject, description, category, priority)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, bookId, subject, description, category, priority]
    );

    const [rows] = await pool.query(
      `SELECT id, subject, description, category, priority, status, created_at
       FROM tickets WHERE id = ?`,
      [created.insertId]
    );

    return res.status(201).json({ ticket: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get("/", authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";

    const query = isAdmin
      ? `SELECT t.*, u.name AS author_name, b.title AS book_title
         FROM tickets t
         JOIN users u ON u.id = t.author_user_id
         LEFT JOIN books b ON b.book_id = t.book_id
         ORDER BY t.created_at DESC`
      : `SELECT t.*, b.title AS book_title
         FROM tickets t
         LEFT JOIN books b ON b.book_id = t.book_id
         WHERE t.author_user_id = ?
         ORDER BY t.created_at DESC`;

    const [rows] = await pool.query(
      query,
      isAdmin ? [] : [req.user.id]
    );

    return res.json({ tickets: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const [tickets] = await pool.query(
      `SELECT t.*, u.name AS author_name, b.title AS book_title
       FROM tickets t
       JOIN users u ON u.id = t.author_user_id
       LEFT JOIN books b ON b.book_id = t.book_id
       WHERE t.id = ?`,
      [req.params.id]
    );

    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (
      req.user.role === "author" &&
      String(ticket.author_user_id) !== String(req.user.id)
    ) {
      return res.status(403).json({
        error: "You cannot access this ticket"
      });
    }

    const [messages] = await pool.query(
      `SELECT id, sender_role, body, created_at
       FROM ticket_messages
       WHERE ticket_id = ?
         AND (is_internal = FALSE OR ? = TRUE)
       ORDER BY created_at ASC`,
      [req.params.id, req.user.role === "admin"]
    );

    return res.json({ ticket, messages });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/draft", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.subject, t.description, b.title AS book_title
       FROM tickets t
       LEFT JOIN books b ON b.book_id = t.book_id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const draft = await draftResponse(rows[0]);
    return res.json({ draft });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/messages", authenticate, async (req, res, next) => {
  try {
    const body = String(req.body.body || "").trim();
    const isInternal =
      req.user.role === "admin" && req.body.isInternal === true;

    if (!body || body.length > 10000) {
      return res.status(400).json({
        error: "Message must be between 1 and 10,000 characters"
      });
    }

    const [tickets] = await pool.query(
      "SELECT id, author_user_id FROM tickets WHERE id = ?",
      [req.params.id]
    );

    const ticket = tickets[0];

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (
      req.user.role === "author" &&
      String(ticket.author_user_id) !== String(req.user.id)
    ) {
      return res.status(403).json({
        error: "You cannot reply to this ticket"
      });
    }

    if (req.user.role === "author") {
      return res.status(403).json({
        error: "Authors should add details through a new ticket in this starter version"
      });
    }

    await pool.query(
      `INSERT INTO ticket_messages
        (ticket_id, sender_user_id, sender_role, body, is_internal)
       VALUES (?, ?, 'admin', ?, ?)`,
      [ticket.id, req.user.id, body, isInternal]
    );

    if (!isInternal) {
      await pool.query(
        "UPDATE tickets SET status = 'In Progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [ticket.id]
      );
    }

    return res.status(201).json({ message: "Message saved" });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/status", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const allowed = ["Open", "In Progress", "Resolved", "Closed"];

    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [result] = await pool.query(
      "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [req.body.status, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const [rows] = await pool.query(
      "SELECT id, status FROM tickets WHERE id = ?",
      [req.params.id]
    );

    return res.json({ ticket: rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
