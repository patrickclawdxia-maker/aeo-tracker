import { Pool } from "pg";
import { initDb } from "./db";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

let initialized = false;

export async function ensureDb() {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
}
