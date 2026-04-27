import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET() {
  const result = await query(
    `SELECT 
      plans.id, 
      plans.name, 
      plans.description, 
      plans.duration_days, 
      plans.price_cents,
      COUNT(CASE WHEN subscriptions.status = 'active' THEN 1 END) AS subscriber_count
     FROM plans
     LEFT JOIN subscriptions ON plans.id = subscriptions.plan_id
     GROUP BY plans.id, plans.name, plans.description, plans.duration_days, plans.price_cents
     ORDER BY subscriber_count DESC
     LIMIT 3`,
  );

  return NextResponse.json({ plans: result.rows });
}
