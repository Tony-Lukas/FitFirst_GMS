import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/auth";
import { query } from "../../../../../lib/db";

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid subscription id." }, { status: 400 });
  }

  const target = await query("SELECT id, user_id FROM subscriptions WHERE id = $1", [id]);
  const subscription = target.rows[0];

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  if (user.role !== "owner" && subscription.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const result = await query(
    `UPDATE subscriptions
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1
     RETURNING id, status`,
    [id],
  );

  return NextResponse.json({ subscription: result.rows[0] });
}
