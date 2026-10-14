
import { pool } from "../src/db.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(
  scriptDir,
  "../../bookleaf_sample_data.json"
);

async function seed() {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    // 1. Seed admin
    const adminEmail = (
      process.env.ADMIN_EMAIL || "admin@bookleaf.com"
    ).trim().toLowerCase();

    const adminName = process.env.ADMIN_NAME || "BookLeaf Admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
    const adminHash = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO users
        (id, email, name, role, password_hash, phone, city, joined_date)
       VALUES (?, ?, ?, 'admin', ?, NULL, NULL, NULL)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password_hash = VALUES(password_hash)`,
      [crypto.randomUUID(), adminEmail, adminName, adminHash]
    );

    // All demo author accounts use this password unless changed here.
    const authorPassword = process.env.DEMO_AUTHOR_PASSWORD || "Author@123";
    const authorHash = await bcrypt.hash(authorPassword, 10);

    let authorCount = 0;
    let bookCount = 0;

    for (const author of data.authors) {
      // 2. Seed author as a login user
      await pool.query(
        `INSERT INTO users
          (id, email, name, role, password_hash, phone, city, joined_date)
         VALUES (?, ?, ?, 'author', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           phone = VALUES(phone),
           city = VALUES(city),
           joined_date = VALUES(joined_date)`,
        [
          author.author_id,
          author.email.toLowerCase(),
          author.name,
          authorHash,
          author.phone,
          author.city,
          author.joined_date
        ]
      );

      authorCount++;

      // 3. Seed this author's books
      for (const book of author.books) {
        await pool.query(
          `INSERT INTO books (
            book_id, author_user_id, title, isbn, genre,
            publication_date, status, mrp, total_copies_sold,
            total_royalty_earned, royalty_paid, royalty_pending,
            available_on, print_partner
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            author_user_id = VALUES(author_user_id),
            title = VALUES(title),
            isbn = VALUES(isbn),
            genre = VALUES(genre),
            publication_date = VALUES(publication_date),
            status = VALUES(status),
            mrp = VALUES(mrp),
            total_copies_sold = VALUES(total_copies_sold),
            total_royalty_earned = VALUES(total_royalty_earned),
            royalty_paid = VALUES(royalty_paid),
            royalty_pending = VALUES(royalty_pending),
            available_on = VALUES(available_on),
            print_partner = VALUES(print_partner)`,
          [
            book.book_id,
            author.author_id,
            book.title,
            book.isbn,
            book.genre,
            book.publication_date,
            book.status,
            book.mrp,
            book.total_copies_sold,
            book.total_royalty_earned,
            book.royalty_paid,
            book.royalty_pending,
            JSON.stringify(book.available_on || []),
            book.print_partner
          ]
        );

        bookCount++;
      }
    }

    console.log("Database seeding completed.");
    console.log(`Admin account: ${adminEmail}`);
    console.log(`Authors processed: ${authorCount}`);
    console.log(`Books processed: ${bookCount}`);
    console.log(
      "Demo author password: set DEMO_AUTHOR_PASSWORD in .env or use the default Author@123."
    );
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
