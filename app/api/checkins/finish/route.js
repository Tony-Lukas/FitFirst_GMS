import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { query } from "../../../../lib/db";
import { broadcastGymEvent } from "../../../../lib/socket";

export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  const result = await query(
    `UPDATE checkins
     SET checkout_at = NOW(), status = 'completed'
     WHERE id = (
       SELECT id
       FROM checkins
       WHERE user_id = $1
         AND status = 'in_progress'
       ORDER BY checkin_at DESC
       LIMIT 1
     )
     RETURNING id, user_id, subscription_id, checkin_at, checkout_at, status`,
    [user.id],
  );

  if (!result.rowCount) {
    return NextResponse.json({ error: "No active check-in found." }, { status: 409 });
  }

  const checkin = result.rows[0];

  await broadcastGymEvent("checkout", {
    userId: user.id,
    name: user.name,
    checkin_at: checkin.checkin_at,
    checkout_at: checkin.checkout_at,
    subscription_status: "active",
  });

  return NextResponse.json({ checkin });
}
