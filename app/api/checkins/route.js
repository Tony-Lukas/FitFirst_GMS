import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/auth";
import { query } from "../../../lib/db";

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const userIdParam = searchParams.get("user_id");

  const values = [];
  const conditions = [];

  if (user.role !== "owner") {
    values.push(user.id);
    conditions.push(`checkins.user_id = $${values.length}`);
  } else if (userIdParam) {
    const userId = Number(userIdParam);
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Invalid user_id filter." }, { status: 400 });
    }
    values.push(userId);
    conditions.push(`checkins.user_id = $${values.length}`);
  }

  if (date) {
    values.push(date);
    conditions.push(`DATE(checkins.checkin_at) = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT checkins.id, checkins.user_id, checkins.subscription_id, checkins.checkin_at,
            checkins.checkout_at, checkins.status, users.name
     FROM checkins
     JOIN users ON users.id = checkins.user_id
     ${whereClause}
     ORDER BY checkins.checkin_at DESC`,
    values,
  );

  return NextResponse.json({ checkins: result.rows });
}
