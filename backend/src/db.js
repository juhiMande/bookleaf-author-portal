
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: "localhost",
  port: 3306,
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "bookleaf_portal",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});