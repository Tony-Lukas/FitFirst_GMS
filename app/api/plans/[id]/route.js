import { NextResponse } from "next/server";
import { requireOwner } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { isPositiveInteger } from "../../../../lib/validators";

export async function PUT(request, { params }) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const durationDays = Number(body.duration_days);
  const priceCents = Number(body.price_cents);
  const id = Number(params.id);

  if (!Number.isInteger(id) || !name || !isPositiveInteger(durationDays) || !isPositiveInteger(priceCents)) {
    return NextResponse.json({ error: "Invalid plan payload." }, { status: 400 });
  }

  const result = await query(
    `UPDATE plans
     SET name = $1, description = $2, duration_days = $3, price_cents = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING id, name, description, duration_days, price_cents, created_at, updated_at`,
    [name, description, durationDays, priceCents, id],
  );

  if (!result.rowCount) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ plan: result.rows[0] });
}

export async function DELETE(request, { params }) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
  }

  const activeSubscriptions = await query(
    `SELECT id
     FROM subscriptions
     WHERE plan_id = $1
       AND status = 'active'
       AND end_date >= CURRENT_DATE
     LIMIT 1`,
    [id],
  );

  if (activeSubscriptions.rowCount) {
    return NextResponse.json(
      { error: "Cannot delete a plan with active subscriptions." },
      { status: 409 },
    );
  }

  const result = await query("DELETE FROM plans WHERE id = $1 RETURNING id", [id]);
  if (!result.rowCount) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
