import { NextResponse } from "next/server";
import { requireAuth, requireOwner } from "../../../../../lib/auth";
import { query } from "../../../../../lib/db";
import { isPositiveInteger } from "../../../../../lib/validators";

export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  const subscriptionId = Number(params.id);
  if (!Number.isInteger(subscriptionId)) {
    return NextResponse.json({ error: "Invalid subscription id." }, { status: 400 });
  }

  const subscriptionResult = await query(
    "SELECT id, user_id FROM subscriptions WHERE id = $1",
    [subscriptionId],
  );
  const subscription = subscriptionResult.rows[0];

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  if (user.role !== "owner" && subscription.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await query(
    `SELECT id, subscription_id, amount_cents, paid, paid_at, method, notes, created_at
     FROM payments
     WHERE subscription_id = $1
     ORDER BY created_at DESC`,
    [subscriptionId],
  );

  return NextResponse.json({ payments: result.rows });
}

export async function POST(request, { params }) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const subscriptionId = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const amountCents = Number(body.amount_cents);
  const method = String(body.method || "manual").trim();
  const notes = String(body.notes || "").trim();

  if (!Number.isInteger(subscriptionId) || !isPositiveInteger(amountCents)) {
    return NextResponse.json(
      { error: "Valid subscription id and amount_cents are required." },
      { status: 400 },
    );
  }

  const subscriptionResult = await query("SELECT id FROM subscriptions WHERE id = $1", [subscriptionId]);
  if (!subscriptionResult.rowCount) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  const result = await query(
    `INSERT INTO payments (subscription_id, amount_cents, paid, paid_at, method, notes)
     VALUES ($1, $2, false, NULL, $3, $4)
     RETURNING id, subscription_id, amount_cents, paid, paid_at, method, notes, created_at`,
    [subscriptionId, amountCents, method, notes],
  );

  return NextResponse.json({ payment: result.rows[0] }, { status: 201 });
}
