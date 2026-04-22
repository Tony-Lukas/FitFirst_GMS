import { NextResponse } from "next/server";
import { requireOwner } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { isPositiveInteger } from "../../../lib/validators";

export async function GET() {
  const result = await query(
    `SELECT id, name, description, duration_days, price_cents, created_at, updated_at
     FROM plans
     ORDER BY price_cents ASC, name ASC`,
  );

  return NextResponse.json({ plans: result.rows });
}

export async function POST(request) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const durationDays = Number(body.duration_days);
  const priceCents = Number(body.price_cents);

  if (!name || !isPositiveInteger(durationDays) || !isPositiveInteger(priceCents)) {
    return NextResponse.json(
      { error: "Plan name, positive duration_days, and positive price_cents are required." },
      { status: 400 },
    );
  }

  const result = await query(
    `INSERT INTO plans (name, description, duration_days, price_cents)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, description, duration_days, price_cents, created_at, updated_at`,
    [name, description, durationDays, priceCents],
  );

  return NextResponse.json({ plan: result.rows[0] }, { status: 201 });
}
