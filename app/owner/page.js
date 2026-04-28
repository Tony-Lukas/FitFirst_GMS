"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { ProtectedPage } from "../../components/ProtectedPage";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";

function OwnerPageContent() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState({ count: 0, members: [] });
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [dashboardPayload, membersPayload] = await Promise.all([
        apiRequest("/api/dashboard/current", { token }),
        apiRequest("/api/users", { token }),
      ]);

      setDashboard(dashboardPayload);
      setMembers(membersPayload.users);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
      return undefined;
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("checkin", loadAll);
    socket.on("checkout", loadAll);

    return () => {
      socket.disconnect();
    };
  }, [loadAll]);

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  async function handleCancelSubscription(subscriptionId) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: "PUT",
        token,
      });
      setMessage("Subscription cancelled.");
      await loadAll();
    } catch (cancelError) {
      setError(cancelError.message);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="panel">
          <div className="panelInner">
            <span className="pill">Owner dashboard</span>
            <h1 className="sectionTitle" style={{ marginTop: 14 }}>
              Live gym floor overview
            </h1>
            <div className="statValue">{dashboard.count}</div>
            <p className="muted">members currently checked in</p>
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
        </div>

        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Checked-in members</h2>
            <div className="cardList">
              {dashboard.members.length ? (
                dashboard.members.map((member) => (
                  <div className="empty" key={member.checkin_id}>
                    <strong>{member.name}</strong>
                    <p className="muted">{member.email}</p>
                    <p className="statusActive">
                      Since {new Date(member.checkin_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="empty">Nobody is checked in right now.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Members, subscriptions, and payments</h2>
          <input
            className="input"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{ marginBottom: 16 }}
          />
          <div className="cardList">
            {filteredMembers.length ? (
              filteredMembers.map((member) => (
                <Link href={`/owner/members/${member.id}`} key={member.id}>
                  <article className="empty">
                    <strong>{member.name}</strong>
                    <p className="muted">{member.email}</p>
                  </article>
                </Link>
              ))
            ) : (
              <div className="empty">
                {members.length === 0
                  ? "No customers found yet."
                  : `No customers matching "${searchQuery}".`}
              </div>
            )}
          </div>
        </div>
        </div>
      </section>
    </main>
  );
}

export default function OwnerPage() {
  return (
    <ProtectedPage roles={["owner"]}>
      <OwnerPageContent />
    </ProtectedPage>
  );
}