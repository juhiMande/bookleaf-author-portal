import { Router } from "express";
import { pool } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    let sql = `
      SELECT
        b.book_id,
        b.author_user_id,
        b.title,
        b.isbn,
        b.genre,
        b.publication_date,
        b.status,
        b.mrp,
        b.total_copies_sold,
        b.total_royalty_earned,
        b.royalty_paid,
        b.royalty_pending,
        b.available_on,
        b.print_partner
      FROM books b
    `;

    const params = [];

    // Authors can see only their own books.
    if (req.user.role === "author") {
      sql += " WHERE b.author_user_id = ?";
      params.push(req.user.id);
    } else if (req.query.authorId) {
      // Admins can optionally filter by author.
      sql += " WHERE b.author_user_id = ?";
      params.push(req.query.authorId);
    }

    sql += " ORDER BY b.title";

    const [rows] = await pool.query(sql, params);

    return res.json({ books: rows });
  } catch (err) {
    next(err);
  }
});

export default router;