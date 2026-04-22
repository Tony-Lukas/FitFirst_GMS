import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { query } from "./db";

const JWT_EXPIRES_IN = "7d";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

export function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.verify(token, process.env.JWT_SECRET);
}

export function getBearerToken(request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
}

export async function getAuthUser(request) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    const result = await query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [payload.id],
    );

    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export async function requireAuth(request) {
  const user = await getAuthUser(request);

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, error: null };
}

export async function requireOwner(request) {
  const { user, error } = await requireAuth(request);

  if (error) {
    return { user: null, error };
  }

  if (user.role !== "owner") {
    return {
      user: null,
      error: NextResponse.json({ error: "Owner access required" }, { status: 403 }),
    };
  }

  return { user, error: null };
}
