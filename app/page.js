"use client";

import Link from "next/link";
import { useAuth } from "../components/AuthProvider";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="page">
      <section className="hero">
        <div className="panel">
          <div className="panelInner">
            <span className="pill">Student-friendly, full-stack, minimal</span>
            <h1 style={{ fontSize: "clamp(2.4rem, 5vw, 4.6rem)", margin: "16px 0 14px" }}>
              FitFirst keeps plans, payments, and live check-ins in one place.
            </h1>
            <p className="muted" style={{ fontSize: "1.1rem", maxWidth: 680 }}>
              Customers can register, subscribe, and manage check-ins. Owners can create plans,
              track members, update manual payments, and watch the dashboard update in real time.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              <Link className="button" href={user ? (user.role === "owner" ? "/owner" : "/profile") : "/register"}>
                {user ? "Open Dashboard" : "Create Account"}
              </Link>
              <Link className="buttonGhost" href="/plans">
                Browse Plans
              </Link>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">
            <div className="gridTwo">
              <div>
                <div className="muted">Auth</div>
                <div className="statValue">JWT</div>
              </div>
              <div>
                <div className="muted">Database</div>
                <div className="statValue">Postgres</div>
              </div>
              <div>
                <div className="muted">Realtime</div>
                <div className="statValue">Sockets</div>
              </div>
              <div>
                <div className="muted">Roles</div>
                <div className="statValue">2</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gridThree">
        {[
          {
            title: "Owner tools",
            text: "Create plans, inspect members, update payment status, and watch the current gym floor count.",
          },
          {
            title: "Customer flow",
            text: "Register, view available plans, subscribe, check in, check out, and review payment history.",
          },
          {
            title: "Database-first",
            text: "Includes SQL migration and seed scripts for a known owner account and sample plans.",
          },
        ].map((item) => (
          <article key={item.title} className="panel">
            <div className="panelInner">
              <h2 className="sectionTitle">{item.title}</h2>
              <p className="muted">{item.text}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
