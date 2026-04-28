"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";
import { ProtectedPage } from "../../components/ProtectedPage";

const initialPlanForm = {
  name: "",
  description: "",
  duration_days: "",
  price_cents: "",
};

function PlansContent() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [editingPlanId, setEditingPlanId] = useState(null);

  const loadPlans = async () => {
    try {
      const payload = await apiRequest("/api/plans");
      setPlans(payload.plans);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      setMessage(`Subscribed to ${payload.subscription.plan_name}.`);
    } catch (subscribeError) {
      setError(subscribeError.message);
    }
  }

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
      await loadPlans();
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
      await loadPlans();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <main className="page">
      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panelInner">
          <span className="pill">Plans</span>
          <h1 className="sectionTitle" style={{ marginTop: 14 }}>
            Available Memberships
          </h1>
          <p className="muted">
            Choose a plan to start a subscription. Owners can also manage plans from this page.
          </p>
           {user?.role === "owner" && (
            <div>
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
                placeholder="Price THB"
                value={planForm.price_cents}
                onChange={(event) => setPlanForm({ ...planForm, price_cents: event.target.value })}
              />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn button" type="submit">
                {editingPlanId ? "Save Plan" : "Create Plan"}
              </button>
              {editingPlanId ? (
                <button
                  className="btn buttonGhost"
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
          )}

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
                <div>
                {user?.role == "customer" &&
                  <button className="btn button" onClick={() => subscribe(plan.id)}>
                    Subscribe
                  </button>
                }
                { user?.role === "owner" &&
                  <div>
                    <button className="btn buttonGhost" onClick={() => startEdit(plan)}>
                          Edit
                    </button>
                    <button className="btn buttonDanger" onClick={() => deletePlan(plan.id)}>
                      Delete
                    </button>
                  </div>
                  }
                </div>
              </div>
            </article>
          ))
          }
        </section>
      )}
    </main>
  );
}

export default function PlansPage() {
  return (
    <ProtectedPage>
      <PlansContent />
    </ProtectedPage>
  );
}