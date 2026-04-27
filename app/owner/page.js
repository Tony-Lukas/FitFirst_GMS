"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ProtectedPage } from "../../components/ProtectedPage";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";

const initialPlanForm = {
  name: "",
  description: "",
  duration_days: "",
  price_cents: "",
};

function OwnerPageContent() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState({ count: 0, members: [] });
  const [plans, setPlans] = useState([]);
  const [members, setMembers] = useState([]);
  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastKey, setToastKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [dashboardPayload, plansPayload, membersPayload] = await Promise.all([
        apiRequest("/api/dashboard/current", { token }),
        apiRequest("/api/plans"),
        apiRequest("/api/users", { token }),
      ]);

      setDashboard(dashboardPayload);
      setPlans(plansPayload.plans);
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

  function startEdit(plan) {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      duration_days: String(plan.duration_days),
      price_cents: String(plan.price_cents),
    });
  }

  async function submitPlan(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingPlanId) {
        await apiRequest(`/api/plans/${editingPlanId}`, {
          method: "PUT",
          token,
          body: planForm,
        });
        setMessage("Plan updated.");
      } else {
        await apiRequest("/api/plans", {
          method: "POST",
          token,
          body: planForm,
        });
        setMessage("Plan created.");
      }

      setPlanForm(initialPlanForm);
      setEditingPlanId(null);
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  async function deletePlan(id) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/api/plans/${id}`, {
        method: "DELETE",
        token,
      });
      setMessage("Plan deleted.");
      await loadAll();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function createPayment(subscriptionId, amountCents) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/api/subscriptions/${subscriptionId}/payments`, {
        method: "POST",
        token,
        body: {
          amount_cents: amountCents,
          method: "manual",
          notes: "Created by owner",
        },
      });
      setMessage("Payment record added.");
      await loadAll();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  async function updatePayment(paymentId, paid, notes) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/api/payments/${paymentId}`, {
        method: "PUT",
        token,
        body: { paid, notes },
      });
      setToastMessage("Updated payment!");
      setToastKey((prev) => prev + 1);
      await loadAll();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, toastKey]);

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

      <section className="gridTwo">
        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">{editingPlanId ? "Edit Plan" : "Create Plan"}</h2>
            <form className="formGrid" onSubmit={submitPlan}>
              <input
                className="input"
                placeholder="Plan name"
                value={planForm.name}
                onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })}
              />
              <textarea
                className="textarea"
                placeholder="Description"
                value={planForm.description}
                onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })}
              />
              <div className="formRow">
                <input
                  className="input"
                  placeholder="Duration days"
                  value={planForm.duration_days}
                  onChange={(event) => setPlanForm({ ...planForm, duration_days: event.target.value })}
                />
                <input
                  className="input"
                  placeholder="Price cents"
                  value={planForm.price_cents}
                  onChange={(event) => setPlanForm({ ...planForm, price_cents: event.target.value })}
                />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="button" type="submit">
                  {editingPlanId ? "Save Plan" : "Create Plan"}
                </button>
                {editingPlanId ? (
                  <button
                    className="buttonGhost"
                    type="button"
                    onClick={() => {
                      setEditingPlanId(null);
                      setPlanForm(initialPlanForm);
                    }}
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Existing Plans</h2>
            <div className="cardList">
              {plans.map((plan) => (
                <div className="empty" key={plan.id}>
                  <strong>{plan.name}</strong>
                  <p className="muted">
                    {plan.duration_days} days • ${(plan.price_cents / 100).toFixed(2)}
                  </p>
                  <p className="muted">{plan.description}</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    <button className="buttonGhost" onClick={() => startEdit(plan)}>
                      Edit
                    </button>
                    <button className="buttonDanger" onClick={() => deletePlan(plan.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 22 }}>
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
                <article className="empty" key={member.id}>
                  <strong>{member.name}</strong>
                  <p className="muted">{member.email}</p>
                  <div className="cardList" style={{ marginTop: 12 }}>
                    {(member.subscriptions || []).map((subscription) => (
                      <div className="panel" key={subscription.id}>
                        <div className="panelInner">
                          <strong>{subscription.plan_name}</strong>
                          <p className="muted">
                            {subscription.start_date} to {subscription.end_date}
                          </p>
                          <p className={getStatusClass(subscription.computed_status)}>
                            {subscription.computed_status}
                          </p>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
                            <button
                              className="buttonGhost"
                              onClick={() => createPayment(subscription.id, subscription.price_cents)}
                            >
                              Add Payment
                            </button>
                            {subscription.computed_status === "active" && (
                              <button
                                className="buttonDanger"
                                onClick={() => handleCancelSubscription(subscription.id)}
                              >
                                Cancel Subscription
                              </button>
                            )}
                          </div>
                          <div className="cardList">
                            {(subscription.payments || []).length ? (
                              subscription.payments.map((payment) => (
                                <PaymentEditor
                                  key={payment.id}
                                  payment={payment}
                                  onSave={updatePayment}
                                />
                              ))
                            ) : (
                              <div className="muted">No payments yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
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
      </section>
      {toastMessage && <div key={toastKey} className="toast">{toastMessage}</div>}
    </main>
  );
}

function PaymentEditor({ payment, onSave }) {
  const [notes, setNotes] = useState(payment.notes || "");
  const [paid, setPaid] = useState(payment.paid);

  return (
    <div className="empty">
      <strong>${(payment.amount_cents / 100).toFixed(2)}</strong>
      <p className="muted">{payment.method || "manual"}</p>
      <div className="formGrid" style={{ marginTop: 10 }}>
        <select
          className="select"
          value={paid ? "true" : "false"}
          onChange={(event) => setPaid(event.target.value === "true")}
        >
          <option value="true">Paid</option>
          <option value="false">Unpaid</option>
        </select>
        <textarea
          className="textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <button className="buttonGhost" onClick={() => onSave(payment.id, paid, notes)}>
          Save Payment Update
        </button>
      </div>
    </div>
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

export default function OwnerPage() {
  return (
    <ProtectedPage roles={["owner"]}>
      <OwnerPageContent />
    </ProtectedPage>
  );
}
