import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth";
import { withTransaction } from "../../../../lib/db";
import { findActiveSubscriptionForUser } from "../../../../lib/subscriptions";
import { broadcastGymEvent } from "../../../../lib/socket";

export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  const activeSubscription = await findActiveSubscriptionForUser(user.id);
  if (!activeSubscription) {
    return NextResponse.json(
      { error: "An active subscription is required before check-in." },
      { status: 409 },
    );
  }

  try {
    const checkin = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id
         FROM checkins
         WHERE user_id = $1
           AND status = 'in_progress'
         LIMIT 1`,
        [user.id],
      );

      if (existing.rowCount) {
        throw new Error("You already have an active check-in.");
      }

      const created = await client.query(
        `INSERT INTO checkins (user_id, subscription_id, checkin_at, status)
         VALUES ($1, $2, NOW(), 'in_progress')
         RETURNING id, user_id, subscription_id, checkin_at, checkout_at, status`,
        [user.id, activeSubscription.id],
      );

      return created.rows[0];
    });

    await broadcastGymEvent("checkin", {
      userId: user.id,
      name: user.name,
      checkin_at: checkin.checkin_at,
      subscription_status: "active",
    });

    return NextResponse.json({ checkin }, { status: 201 });
  } catch (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 409 });
  }
}
