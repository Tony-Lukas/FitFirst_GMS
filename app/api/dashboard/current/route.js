import { NextResponse } from "next/server";
import { requireOwner } from "../../../../lib/auth";
import { query } from "../../../../lib/db";

export async function GET(request) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const result = await query(
    `SELECT checkins.id AS checkin_id, checkins.checkin_at, users.id AS user_id, users.name, users.email
     FROM checkins
     JOIN users ON users.id = checkins.user_id
     WHERE checkins.status = 'in_progress'
     ORDER BY checkins.checkin_at ASC`,
  );

  return NextResponse.json({
    count: result.rows.length,
    members: result.rows,
  });
}
