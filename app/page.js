"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";

export default function HomePage() {
  const { user } = useAuth();
  const [topPlans, setTopPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPlans = async () => {
      try {
        const response = await fetch("/api/plans/top");
        const data = await response.json();
        setTopPlans(data.plans || []);
      } catch (error) {
        console.error("Failed to fetch top plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPlans();
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div className="panel">
          <div className="panelInner">
            <span className="pill">full-stack, minimal</span>
            <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4.6rem)", margin: "16px 0 14px" }}>
              FitFirst keeps plans, payments, and live check-ins in one place.
            </h1>
            <p className="muted" style={{ fontSize: "1.1rem", maxWidth: 680 }}>
              Customers can register, subscribe, and manage check-ins. Owners can create plans,
              track members, update manual payments, and watch the dashboard update in real time.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              <Link className="btn btn-primary" href={user ? (user.role === "owner" ? "/owner" : "/profile") : "/register"}>
                {user ? "Open Dashboard" : "Create Account"}
              </Link>
              <Link className="btn btn-primary" href="/plans">
                Browse Plans
              </Link>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">
            <div className="system-core-header">
              <span className="live-indicator"></span>
              <span className="formLabel">Top Plans</span>
            </div>
            <div className="stat-grid">
              {loading ? (
                <div className="stat-card">
                  <div className="stat-label">Loading...</div>
                </div>
              ) : topPlans.length > 0 ? (
                topPlans.map((plan) => (
                  <div key={plan.id} className="stat-card">
                    <div className="stat-label">{plan.name}</div>
                    <div className="stat-value">{plan.subscriber_count} subscribers</div>
                  </div>
                ))
              ) : (
                <div className="stat-card">
                  <div className="stat-label">No plans yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="gridThree">
        {[
          {
            title: "Owner tools",
            text: "Create plans, inspect members, update payment status, and watch the current gym floor count.",
            icon: "⚡"
          },
          {
            title: "Customer flow",
            text: "Register, view available plans, subscribe, check in, check out, and review payment history.",
            icon: "👤"
          },
          {
            title: "Database-first",
            text: "Includes SQL migration and seed scripts for a known owner account and sample plans.",
            icon: "📂"
          },
        ].map((item) => (
          <article key={item.title} className="panel">
            <div className="panelInner">
              <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{item.icon}</div>
              <h2 className="sectionTitle">{item.title}</h2>
              <p className="muted">{item.text}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
