import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool, ensureDb } from "@/lib/pool";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  await ensureDb();

  const { rows: existing } = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email.toLowerCase().trim()]
  );

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)",
    [email.toLowerCase().trim(), name?.trim() ?? null, passwordHash]
  );

  return NextResponse.json({ success: true }, { status: 201 });
}
