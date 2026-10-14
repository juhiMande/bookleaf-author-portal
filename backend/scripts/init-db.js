
import dotenv from "dotenv";
import { pool } from "../src/db.js";

dotenv.config();

const schema = [
  // 1. Users: authors and administrators
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role ENUM('author', 'admin') NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(40) NULL,
    city VARCHAR(120) NULL,
    joined_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  // 2. Books and royalty information
  `CREATE TABLE IF NOT EXISTS books (
    book_id VARCHAR(32) PRIMARY KEY,
    author_user_id VARCHAR(36) NOT NULL,
    title VARCHAR(500) NOT NULL,
    isbn VARCHAR(100) NULL,
    genre VARCHAR(255) NULL,
    publication_date DATE NULL,
    status VARCHAR(120) NOT NULL,
    mrp DECIMAL(12,2) NULL,
    author_royalty_per_copy DECIMAL(12,2) NULL,
    total_copies_sold INT NOT NULL DEFAULT 0,
    total_royalty_earned DECIMAL(12,2) NOT NULL DEFAULT 0,
    royalty_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    royalty_pending DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_royalty_payout_date DATE NULL,
    print_partner VARCHAR(255) NULL,
    available_on JSON NOT NULL,
    CONSTRAINT fk_books_author
      FOREIGN KEY (author_user_id)
      REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_books_author (author_user_id)
  ) ENGINE=InnoDB`,

  // 3. Support tickets
  `CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    author_user_id VARCHAR(36) NOT NULL,
    book_id VARCHAR(32) NULL,
    subject VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General Inquiry',
    priority ENUM('Critical', 'High', 'Medium', 'Low')
      NOT NULL DEFAULT 'Medium',
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed')
      NOT NULL DEFAULT 'Open',
    assigned_admin_id VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tickets_author
      FOREIGN KEY (author_user_id)
      REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tickets_book
      FOREIGN KEY (book_id)
      REFERENCES books(book_id) ON DELETE SET NULL,
    CONSTRAINT fk_tickets_admin
      FOREIGN KEY (assigned_admin_id)
      REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tickets_status_priority_created
      (status, priority, created_at),
    INDEX idx_tickets_author_created
      (author_user_id, created_at)
  ) ENGINE=InnoDB`,

  // 4. Public replies and internal admin notes
  `CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT UNSIGNED NOT NULL,
    sender_user_id VARCHAR(36) NOT NULL,
    sender_role ENUM('author', 'admin') NOT NULL,
    body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_ticket
      FOREIGN KEY (ticket_id)
      REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender
      FOREIGN KEY (sender_user_id)
      REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_messages_ticket_created (ticket_id, created_at)
  ) ENGINE=InnoDB`
];

async function initializeDatabase() {
  try {
    for (const statement of schema) {
      await pool.query(statement);
    }

    // Upgrade an existing database where this column was VARCHAR(32).
    // The sender ID must have the same length/type as users.id.
    const [senderColumns] = await pool.query(`
      SELECT CHARACTER_MAXIMUM_LENGTH AS column_length
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ticket_messages'
        AND COLUMN_NAME = 'sender_user_id'
    `);

    if (
      senderColumns.length &&
      Number(senderColumns[0].column_length) < 36
    ) {
      // Existing foreign keys may prevent changing this column.
      // Handle the migration separately if MySQL reports a constraint error.
      await pool.query(`
        ALTER TABLE ticket_messages
        MODIFY COLUMN sender_user_id VARCHAR(36) NOT NULL
      `);
    }

    console.log("MySQL database schema initialized successfully.");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initializeDatabase();
