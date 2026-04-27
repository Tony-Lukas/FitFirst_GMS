"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ProtectedPage } from "../../components/ProtectedPage";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";

function ProfileContent() {
  const { token, user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [currentCheckin, setCurrentCheckin] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [showCancelPopup, setShowCancelPopup] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [subscriptionsPayload, checkinsPayload] = await Promise.all([
        apiRequest("/api/subscriptions", { token }),
        apiRequest("/api/checkins", { token }),
      ]);

      setSubscriptions(subscriptionsPayload.subscriptions);
      setCheckins(checkinsPayload.checkins);
      const openCheckin = checkinsPayload.checkins.find((item) => item.status === "in_progress");
      setCurrentCheckin(openCheckin || null);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
      return undefined;
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("checkin", (payload) => {
      if (payload.userId === user.id) {
        loadData();
      }
    });

    socket.on("checkout", (payload) => {
      if (payload.userId === user.id) {
        loadData();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loadData, user.id]);

  async function handleCheckin() {
    setFeedback("");
    setError("");

    try {
      const payload = await apiRequest("/api/checkins/start", {
        method: "POST",
        token,
      });
      setFeedback(`Checked in at ${new Date(payload.checkin.checkin_at).toLocaleString()}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCheckout() {
    setFeedback("");
    setError("");

    try {
      const payload = await apiRequest("/api/checkins/finish", {
        method: "POST",
        token,
      });
      setFeedback(`Checked out at ${new Date(payload.checkin.checkout_at).toLocaleString()}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCancelSubscription(subscriptionId) {
    setFeedback("");
    setError("");

    try {
      await apiRequest(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: "PUT",
        token,
      });
      setShowCancelPopup(true);
      setTimeout(() => setShowCancelPopup(false), 2000);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const payments = subscriptions.flatMap((subscription) => subscription.payments || []);

  return (
    <main className="page">
      {showCancelPopup && <div className="cancelPopup">Cancelled subscription!</div>}
      <section className="hero">
        <div className="panel">
          <div className="panelInner">
            <span className="pill">Customer Profile</span>
            <h1 className="sectionTitle" style={{ marginTop: 14 }}>
              Welcome back, {user.name}
            </h1>
            <p className="muted">
              Check in with an active subscription, then review your memberships and payment notes
              below.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
              <button className="button" disabled={Boolean(currentCheckin)} onClick={handleCheckin}>
                Start Check-in
              </button>
              <button className="buttonGhost" disabled={!currentCheckin} onClick={handleCheckout}>
                Finish Check-out
              </button>
            </div>
            {feedback ? (
              <p className="statusActive" style={{ marginTop: 12 }}>
                {feedback}
              </p>
            ) : null}
            {error ? (
              <p className="statusCancelled" style={{ marginTop: 12 }}>
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">
            <div className="muted">Current gym status</div>
            <div className="statValue">{currentCheckin ? "IN" : "OUT"}</div>
            <p className="muted">
              {currentCheckin
                ? `Checked in since ${new Date(currentCheckin.checkin_at).toLocaleString()}`
                : "No open check-in right now."}
            </p>
          </div>
        </div>
      </section>

      <section className="gridTwo">
        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Subscriptions</h2>
            <div className="cardList">
              {subscriptions.length ? (
                subscriptions.map((subscription) => (
                  <article key={subscription.id} className="empty">
                    <strong>{subscription.plan_name}</strong>
                    <p className="muted">
                      {subscription.start_date} to {subscription.end_date}
                    </p>
                    <p className={getStatusClass(subscription.computed_status)}>
                      {subscription.computed_status}
                    </p>
                    {subscription.computed_status === "active" && (
                      <button
                        className="buttonDanger"
                        onClick={() => handleCancelSubscription(subscription.id)}
                        style={{ marginTop: 10 }}
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <div className="empty">No subscriptions yet. Pick one from the Plans page.</div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Payment History</h2>
            <div className="cardList">
              {payments.length ? (
                payments.map((payment) => (
                  <article key={payment.id} className="empty">
                    <strong>${(payment.amount_cents / 100).toFixed(2)}</strong>
                    <p className="muted">
                      {payment.method || "manual"} {payment.paid_at ? `• ${payment.paid_at}` : ""}
                    </p>
                    <p className={payment.paid ? "statusPaid" : "statusUnpaid"}>
                      {payment.paid ? "Paid" : "Unpaid"}
                    </p>
                    {payment.notes ? <p className="muted">{payment.notes}</p> : null}
                  </article>
                ))
              ) : (
                <div className="empty">No payment records yet.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
        <div className="panelInner">
          <h2 className="sectionTitle">Recent Check-ins</h2>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {checkins.length ? (
                  checkins.map((checkin) => (
                    <tr key={checkin.id}>
                      <td>{new Date(checkin.checkin_at).toLocaleString()}</td>
                      <td>{checkin.checkout_at ? new Date(checkin.checkout_at).toLocaleString() : "-"}</td>
                      <td className={checkin.status === "completed" ? "statusCompleted" : "statusActive"}>
                        {checkin.status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="muted">
                      No check-in records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function getStatusClass(status) {
  if (status === "active") {
    return "statusActive";
  }

  if (status === "cancelled") {
    return "statusCancelled";
  }

  return "statusExpired";
}

export default function ProfilePage() {
  return (
    <ProtectedPage roles={["customer"]}>
      <ProfileContent />
    </ProtectedPage>
  );
}
