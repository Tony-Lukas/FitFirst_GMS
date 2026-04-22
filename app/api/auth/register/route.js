import { NextResponse } from "next/server";
import { hashPassword, signToken } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { isEmail } from "../../../../lib/validators";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || !isEmail(email) || password.length < 6) {
    return NextResponse.json(
      { error: "Name, valid email, and password with at least 6 characters are required." },
      { status: 400 },
    );
  }

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rowCount) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'customer')
     RETURNING id, name, email, role`,
    [name, email, passwordHash],
  );

  const user = result.rows[0];
  const token = signToken(user);

  return NextResponse.json({ token, user }, { status: 201 });
}
