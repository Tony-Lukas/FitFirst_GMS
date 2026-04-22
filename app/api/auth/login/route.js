import { NextResponse } from "next/server";
import { comparePassword, signToken } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { isEmail } from "../../../../lib/validators";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!isEmail(email) || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await query(
    `SELECT id, name, email, role, password_hash
     FROM users
     WHERE email = $1`,
    [email],
  );

  const user = result.rows[0];
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const matches = await comparePassword(password, user.password_hash);
  if (!matches) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return NextResponse.json({ token: signToken(safeUser), user: safeUser });
}
