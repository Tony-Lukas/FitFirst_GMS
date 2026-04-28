"use client";

/**
 * Owner Dashboard Page
 * 
 * This is the main dashboard for gym owners to manage:
 * - View live check-in data (members currently in the gym)
 * - Create, edit, and delete membership plans
 * - View all members and their subscriptions
 * - Add manual payments for subscriptions
 * - Cancel subscriptions
 * - Edit payment records (mark as paid/unpaid, add notes)
 * 
 * The page uses WebSocket connections to receive real-time updates
 * when members check in or out of the gym.
 */

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ProtectedPage } from "../../components/ProtectedPage";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";

/**
 * Initial state for the plan creation/edit form
 * Used when creating a new plan or resetting after edit
 */
const initialPlanForm = {
  name: "",
  description: "",
  duration_days: "",
  price_cents: "",
};

/**
 * OwnerPageContent - Main component for the owner dashboard
 * 
 * This component manages all the state and functionality for:
 * - Loading dashboard data (checked-in members, plans, all users)
 * - Real-time updates via WebSocket
 * - Plan CRUD operations (Create, Read, Update, Delete)
 * - Payment management (add payments, update payment status/notes)
 * - Subscription cancellation
 * - Search/filter functionality
 */
function OwnerPageContent() {
  // Authentication token from AuthProvider context
  const { token } = useAuth();
  
  // Dashboard state - tracks currently checked-in members
  const [dashboard, setDashboard] = useState({ count: 0, members: [] });
  
  // All available membership plans
  const [plans, setPlans] = useState([]);
  
  // All registered members/users
  const [members, setMembers] = useState([]);
  
  // Form state for creating/editing plans
  const [planForm, setPlanForm] = useState(initialPlanForm);
  
  // ID of plan currently being edited (null = creating new plan)
  const [editingPlanId, setEditingPlanId] = useState(null);
  
  // Success message to display to user
  const [message, setMessage] = useState("");
  
  // Error message to display to user
  const [error, setError] = useState("");
  
  // Toast notification message (temporary success feedback)
  const [toastMessage, setToastMessage] = useState("");
  
  // Key to force re-render of toast component
  const [toastKey, setToastKey] = useState(0);
  
  // Search query for filtering members
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for cancel subscription confirmation modal
  const [cancelModal, setCancelModal] = useState({ 
    show: false, 
    subscriptionId: null, 
    planName: "", 
    confirmed: false 
  });

  /**
   * loadAll - Fetches all necessary data from the API
   * 
   * This function loads three pieces of data in parallel:
   * 1. Dashboard data - current check-in count and list of checked-in members
   * 2. Plans - all available membership plans
   * 3. Members - all registered users with their subscriptions and payments
   * 
   * Called on initial page load and after any data modifications
   */
  const loadAll = useCallback(async () => {
    try {
      // Fetch all data in parallel for better performance
      const [dashboardPayload, plansPayload, membersPayload] = await Promise.all([
        apiRequest("/api/dashboard/current", { token }),
        apiRequest("/api/plans"),
        apiRequest("/api/users", { token }),
      ]);

      // Update state with fetched data
      setDashboard(dashboardPayload);
      setPlans(plansPayload.plans);
      setMembers(membersPayload.users);
    } catch (loadError) {
      // Handle and display any errors
      setError(loadError.message);
    }
  }, [token]);

  // Load all data when component mounts or token changes
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /**
   * WebSocket connection for real-time updates
   * 
   * Sets up a socket connection to receive live updates when:
   * - A member checks in ("checkin" event)
   * - A member checks out ("checkout" event)
   * 
   * When either event occurs, reload all data to show current state
   */
  useEffect(() => {
    // Skip if socket URL is not configured
    if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
      return undefined;
    }

    // Create WebSocket connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket"],
    });

    // Listen for check-in events and refresh data
    socket.on("checkin", loadAll);
    // Listen for check-out events and refresh data
    socket.on("checkout", loadAll);

    // Cleanup: disconnect socket when component unmounts
    return () => {
      socket.disconnect();
    };
  }, [loadAll]);

  /**
   * startEdit - Prepares the form for editing an existing plan
   * 
   * @param {Object} plan - The plan object to edit
   * 
   * Sets the editingPlanId and populates the form with the plan's
   * current values, allowing the user to modify them
   */
  function startEdit(plan) {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      duration_days: String(plan.duration_days),
      price_cents: String(plan.price_cents),
    });
  }

  /**
   * submitPlan - Handles form submission for creating or updating a plan
   * 
   * @param {Event} event - Form submit event
   * 
   * If editingPlanId is set, sends PUT request to update existing plan
   * Otherwise, sends POST request to create a new plan
   * After success, resets form and reloads data
   */
  async function submitPlan(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      if (editingPlanId) {
        // Update existing plan
        await apiRequest(`/api/plans/${editingPlanId}`, {
          method: "PUT",
          token,
          body: planForm,
        });
        setMessage("Plan updated.");
      } else {
        // Create new plan
        await apiRequest("/api/plans", {
          method: "POST",
          token,
          body: planForm,
        });
        setMessage("Plan created.");
      }

      // Reset form to initial state
      setPlanForm(initialPlanForm);
      setEditingPlanId(null);
      // Reload data to reflect changes
      await loadAll();
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  /**
   * deletePlan - Deletes a membership plan
   * 
   * @param {number} id - ID of the plan to delete
   * 
   * Sends DELETE request to remove the plan, then reloads data
   */
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

  /**
   * createPayment - Adds a manual payment record for a subscription
   * 
   * @param {number} subscriptionId - ID of the subscription to add payment to
   * @param {number} amountCents - Payment amount in cents
   * 
   * Creates a payment record with "manual" method and "Created by owner" notes
   * Used for recording payments made outside the app (cash, bank transfer, etc.)
   */
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

  /**
   * updatePayment - Updates an existing payment's status and/or notes
   * 
   * @param {number} paymentId - ID of the payment to update
   * @param {boolean} paid - Whether the payment has been paid
   * @param {string} notes - Optional notes about the payment
   * 
   * Used to mark payments as paid/unpaid and add notes
   * Shows a toast notification on success
   */
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
      // Increment key to force toast re-render (allows same message to show again)
      setToastKey((prev) => prev + 1);
      await loadAll();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  /**
   * Auto-dismiss toast notification
   * 
   * Shows a toast message for 3 seconds, then clears it
   * Uses toastKey to force re-render when showing same message
   */
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage("");
      }, 3000);
      // Cleanup timer on unmount or when toast changes
      return () => clearTimeout(timer);
    }
  }, [toastMessage, toastKey]);

  /**
   * filteredMembers - Filters members based on search query
   * 
   * Filters by member name or email (case-insensitive)
   * Used to display only matching members in the member list
   */
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  /**
   * handleCancelSubscription - Opens the cancel confirmation modal
   * 
   * @param {number} subscriptionId - ID of the subscription to cancel
   * 
   * Sets up the modal state to show the confirmation dialog
   */
  async function handleCancelSubscription(subscriptionId) {
    setCancelModal({ show: true, subscriptionId, planName: "" });
  }

  /**
   * confirmCancelSubscription - Confirms and executes subscription cancellation
   * 
   * Sends PUT request to cancel the subscription
   * Shows success state in modal, then closes after delay
   */
  async function confirmCancelSubscription() {
    const { subscriptionId } = cancelModal;
    // Show cancelled state first (with checkmark)
    setCancelModal({ show: true, subscriptionId, planName: "", confirmed: true });
    
    setMessage("");
    setError("");

    try {
      await apiRequest(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: "PUT",
        token,
      });
      setMessage("Subscription cancelled.");
      await loadAll();
      // Close modal after a short delay (1.5 seconds)
      setTimeout(() => {
        setCancelModal({ show: false, subscriptionId: null, planName: "", confirmed: false });
      }, 1500);
    } catch (cancelError) {
      setError(cancelError.message);
      setCancelModal({ show: false, subscriptionId: null, planName: "", confirmed: false });
    }
  }

  // ===== RENDER SECTION =====

  return (
    <main className="page">
      {/* Hero Section: Live gym floor overview */}
      <section className="hero">
        {/* Dashboard Panel: Shows current check-in count */}
        <div className="panel">
          <div className="panelInner">
            <span className="pill">Owner dashboard</span>
            <h1 className="sectionTitle" style={{ marginTop: 14 }}>
              Live gym floor overview
            </h1>
            {/* Number of members currently checked in */}
            <div className="statValue">{dashboard.count}</div>
            <p className="muted">members currently checked in</p>
            
            {/* Status messages */}
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

        {/* Checked-in Members List */}
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

      {/* Plans Management Section */}
      <section className="gridTwo">
        {/* Create/Edit Plan Form */}
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
                  placeholder="Price THB"
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

        {/* Existing Plans List */}
        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Existing Plans</h2>
            <div className="cardList">
              {plans.map((plan) => (
                <div className="empty" key={plan.id}>
                  <strong>{plan.name}</strong>
                  <p className="muted">
                    {plan.duration_days} days • {plan.price_cents } THB
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

      {/* Members, Subscriptions, and Payments Section */}
      <section className="panel" style={{ marginTop: 22 }}>
        <div className="panelInner">
          <h2 className="sectionTitle">Members, subscriptions, and payments</h2>
          
          {/* Search Input */}
          <input
            className="input"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{ marginBottom: 16 }}
          />
          
          {/* Member List with Subscriptions and Payments */}
          <div className="cardList">
            {filteredMembers.length ? (
              filteredMembers.map((member) => (
                <article className="empty" key={member.id}>
                  <strong>{member.name}</strong>
                  <p className="muted">{member.email}</p>
                  
                  {/* Member's Subscriptions */}
                  <div className="cardList" style={{ marginTop: 12 }}>
                    {(member.subscriptions || []).map((subscription) => (
                      <div className="panel" key={subscription.id}>
                        <div className="panelInner">
                          <strong>{subscription.plan_name}</strong>
                          <p className="muted">
                            {subscription.start_date} to {subscription.end_date}
                          </p>
                          {/* Status badge with dynamic class */}
                          <p className={getStatusClass(subscription.computed_status)}>
                            {subscription.computed_status}
                          </p>
                          
                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0", justifyContent: "center" }}>
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
                          
                          {/* Payment History for this Subscription */}
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
      
      {/* Toast Notification */}
      {toastMessage && <div key={toastKey} className="toast">{toastMessage}</div>}
      
      {/* Cancel Subscription Confirmation Modal */}
      {cancelModal.show && (
        <div className="modalOverlay" onClick={() => !cancelModal.confirmed && setCancelModal({ show: false, subscriptionId: null, planName: "", confirmed: false })}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            {cancelModal.confirmed ? (
              // Success state after cancellation
              <>
                <div className="cancelSuccessIcon">✓</div>
                <h3>Cancelled!</h3>
                <p>The subscription has been successfully cancelled.</p>
              </>
            ) : (
              // Confirmation dialog
              <>
                <h3>Cancel Subscription</h3>
                <p>Are you sure you want to cancel this subscription? This action cannot be undone.</p>
                <div className="modalActions">
                  <button className="buttonGhost" onClick={() => setCancelModal({ show: false, subscriptionId: null, planName: "", confirmed: false })}>
                    Keep Subscription
                  </button>
                  <button className="buttonDanger" onClick={confirmCancelSubscription}>
                    Yes, Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * PaymentEditor - Component for editing individual payment records
 * 
 * Allows owners to:
 * - Toggle payment status (paid/unpaid)
 * - Edit payment notes
 * - Save changes
 * 
 * @param {Object} props
 * @param {Object} props.payment - The payment record to edit
 * @param {Function} props.onSave - Callback to save changes (paymentId, paid, notes)
 */
function PaymentEditor({ payment, onSave }) {
  // Local state for form inputs
  const [notes, setNotes] = useState(payment.notes || "");
  const [paid, setPaid] = useState(payment.paid);

  return (
    <div className="empty">
      <strong>{payment.amount_cents} THB</strong>
      <p className="muted">{payment.method || "manual"}</p>
      <div className="formGrid" style={{ marginTop: 10 }}>
        {/* Paid/Unpaid dropdown */}
        <select
          className="select"
          value={paid ? "true" : "false"}
          onChange={(event) => setPaid(event.target.value === "true")}
        >
          <option value="true">Paid</option>
          <option value="false">Unpaid</option>
        </select>
        
        {/* Notes textarea */}
        <textarea
          className="textarea"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        
        {/* Save button */}
        <button className="buttonGhost" onClick={() => onSave(payment.id, paid, notes)}>
          Save Payment Update
        </button>
      </div>
    </div>
  );
}

/**
 * getStatusClass - Returns CSS class name based on subscription status
 * 
 * @param {string} status - The subscription status ("active", "cancelled", "expired")
 * @returns {string} - CSS class name for styling
 * 
 * Maps status strings to appropriate CSS classes for visual feedback
 */
function getStatusClass(status) {
  if (status === "active") {
    return "statusActive";
  }

  if (status === "cancelled") {
    return "statusCancelled";
  }

  return "statusExpired";
}

/**
 * OwnerPage - Main export, wraps content with protection
 * 
 * Uses ProtectedPage HOC to ensure only users with "owner" role
 * can access this dashboard. Redirects non-owners appropriately.
 */
export default function OwnerPage() {
  return (
    <ProtectedPage roles={["owner"]}>
      <OwnerPageContent />
    </ProtectedPage>
  );
}
