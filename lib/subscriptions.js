import { query } from "./db";

export function subscriptionStatusCase(alias = "subscriptions") {
  return `CASE
    WHEN ${alias}.status = 'cancelled' THEN 'cancelled'
    WHEN ${alias}.end_date < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END`;
}

export async function findActiveSubscriptionForUser(userId) {
  const result = await query(
    `SELECT subscriptions.id, subscriptions.user_id, subscriptions.plan_id, subscriptions.start_date,
            subscriptions.end_date, subscriptions.status, subscriptions.auto_renew,
            plans.name AS plan_name
     FROM subscriptions
     JOIN plans ON plans.id = subscriptions.plan_id
     WHERE subscriptions.user_id = $1
       AND subscriptions.status = 'active'
       AND subscriptions.end_date >= CURRENT_DATE
     ORDER BY subscriptions.end_date DESC
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
}
