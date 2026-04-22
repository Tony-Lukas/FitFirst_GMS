import { NextResponse } from "next/server";
import { requireOwner } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { isBooleanLike, parseBoolean } from "../../../../lib/validators";

export async function PUT(request, { params }) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const paymentId = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const notes = String(body.notes || "").trim();

  if (!Number.isInteger(paymentId) || !isBooleanLike(body.paid)) {
    return NextResponse.json(
      { error: "Valid payment id and paid flag are required." },
      { status: 400 },
    );
  }

  const paid = parseBoolean(body.paid);
  const result = await query(
    `UPDATE payments
     SET paid = $1,
         paid_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
         notes = $2
     WHERE id = $3
     RETURNING id, subscription_id, amount_cents, paid, paid_at, method, notes, created_at`,
    [paid, notes, paymentId],
  );

  if (!result.rowCount) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({ payment: result.rows[0] });
}
