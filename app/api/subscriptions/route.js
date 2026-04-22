import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/auth";
import { query, withTransaction } from "../../../lib/db";
import { subscriptionStatusCase } from "../../../lib/subscriptions";

export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  if (user.role !== "customer") {
    return NextResponse.json({ error: "Only customers can subscribe." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const planId = Number(body.planId);
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: "Valid planId is required." }, { status: 400 });
  }

  const planResult = await query(
    "SELECT id, name, duration_days FROM plans WHERE id = $1",
    [planId],
  );
  const plan = planResult.rows[0];

  if (!plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  try {
    const subscription = await withTransaction(async (client) => {
      const overlap = await client.query(
        `SELECT id
         FROM subscriptions
         WHERE user_id = $1
           AND plan_id = $2
           AND status = 'active'
           AND end_date >= CURRENT_DATE
         LIMIT 1`,
        [user.id, planId],
      );

      if (overlap.rowCount) {
        throw new Error("You already have an overlapping active subscription for this plan.");
      }

      const created = await client.query(
        `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, auto_renew)
         VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + ($3::int - 1), 'active', false)
         RETURNING id, user_id, plan_id, start_date, end_date, status, auto_renew`,
        [user.id, planId, plan.duration_days],
      );

      return created.rows[0];
    });

    return NextResponse.json(
      {
        subscription: {
          ...subscription,
          plan_name: plan.name,
        },
      },
      { status: 201 },
    );
  } catch (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 409 });
  }
}

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) {
    return error;
  }

  const values = [];
  let whereClause = "";

  if (user.role === "customer") {
    values.push(user.id);
    whereClause = "WHERE subscriptions.user_id = $1";
  }

  const result = await query(
    `SELECT subscriptions.id, subscriptions.user_id, subscriptions.plan_id, subscriptions.start_date,
            subscriptions.end_date, subscriptions.status, subscriptions.auto_renew,
            ${subscriptionStatusCase("subscriptions")} AS computed_status,
            plans.name AS plan_name, plans.price_cents
     FROM subscriptions
     JOIN plans ON plans.id = subscriptions.plan_id
     ${whereClause}
     ORDER BY subscriptions.created_at DESC`,
    values,
  );

  const subscriptions = await Promise.all(
    result.rows.map(async (subscription) => {
      const payments = await query(
        `SELECT id, subscription_id, amount_cents, paid, paid_at, method, notes, created_at
         FROM payments
         WHERE subscription_id = $1
         ORDER BY created_at DESC`,
        [subscription.id],
      );

      return {
        ...subscription,
        payments: payments.rows,
      };
    }),
  );

  return NextResponse.json({ subscriptions });
}
