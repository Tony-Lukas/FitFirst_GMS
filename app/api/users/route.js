import { NextResponse } from "next/server";
import { requireOwner } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { subscriptionStatusCase } from "../../../lib/subscriptions";

export async function GET(request) {
  const { error } = await requireOwner(request);
  if (error) {
    return error;
  }

  const usersResult = await query(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE role = 'customer'
     ORDER BY created_at DESC`,
  );

  const users = await Promise.all(
    usersResult.rows.map(async (user) => {
      const subscriptionsResult = await query(
        `SELECT subscriptions.id, subscriptions.user_id, subscriptions.plan_id, subscriptions.start_date,
                subscriptions.end_date, subscriptions.status, subscriptions.auto_renew,
                ${subscriptionStatusCase("subscriptions")} AS computed_status,
                plans.name AS plan_name, plans.price_cents
         FROM subscriptions
         JOIN plans ON plans.id = subscriptions.plan_id
         WHERE subscriptions.user_id = $1
         ORDER BY subscriptions.created_at DESC`,
        [user.id],
      );

      const subscriptions = await Promise.all(
        subscriptionsResult.rows.map(async (subscription) => {
          const paymentsResult = await query(
            `SELECT id, subscription_id, amount_cents, paid, paid_at, method, notes, created_at
             FROM payments
             WHERE subscription_id = $1
             ORDER BY created_at DESC`,
            [subscription.id],
          );

          return {
            ...subscription,
            payments: paymentsResult.rows,
          };
        }),
      );

      return {
        ...user,
        subscriptions,
      };
    }),
  );

  return NextResponse.json({ users });
}
