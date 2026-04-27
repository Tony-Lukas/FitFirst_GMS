"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";

function PlansContent() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showSubscribePopup, setShowSubscribePopup] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const payload = await apiRequest("/api/plans");
        setPlans(payload.plans);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  async function subscribe(planId) {
    setMessage("");
    setError("");

    try {
      const payload = await apiRequest("/api/subscriptions", {
        method: "POST",
        token,
        body: { planId },
      });
      setShowSubscribePopup(true);
      setTimeout(() => setShowSubscribePopup(false), 2000);
      setMessage(`Subscribed to ${payload.subscription.plan_name}.`);
    } catch (subscribeError) {
      setError(subscribeError.message);
    }
  }

  return (
    <main className="page">
      {showSubscribePopup && <div className="subscribePopup">Subscribed!</div>}
      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panelInner">
          <span className="pill">Plans</span>
          <h1 className="sectionTitle" style={{ marginTop: 14 }}>
            Available memberships
          </h1>
          <p className="muted">
            Choose a plan to start a subscription. Owners can also inspect the public plan list
            here.
          </p>
          {message ? (
            <p className="statusActive" style={{ marginTop: 10 }}>
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="statusCancelled" style={{ marginTop: 10 }}>
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section className="panel">
          <div className="panelInner">Loading plans...</div>
        </section>
      ) : (
        <section className="gridThree">
          {plans.map((plan) => (
            <article key={plan.id} className="panel">
              <div className="panelInner">
                <div className="pill">{plan.duration_days} days</div>
                <h2 className="sectionTitle" style={{ marginTop: 14 }}>
                  {plan.name}
                </h2>
                <p className="muted">{plan.description}</p>
                <p style={{ fontSize: "2rem", fontWeight: 800, margin: "16px 0" }}>
                  {plan.price_cents} THB
                </p>
                {user?.role === "customer" ? (
                  <button className="button" onClick={() => subscribe(plan.id)}>
                    Subscribe
                  </button>
                ) : (
                  <div className="muted">Customer subscriptions happen from this page.</div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default function PlansPage() {
  return <PlansContent />;
}
