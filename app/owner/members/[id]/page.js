"use client";

/**
 * Member Detail Page
 * 
 * This page displays detailed information about a specific member:
 * - Member name and email
 * - All subscriptions (past and present)
 * - Payment history for each subscription
 * - Actions: add payments, cancel subscriptions, update payment status
 * 
 * Accessed by clicking on a member from the owner dashboard list.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProtectedPage } from "../../../../components/ProtectedPage";
import { useAuth } from "../../../../components/AuthProvider";
import { apiRequest } from "../../../../components/api";

/**
 * MemberDetailContent - Main component for member detail view
 * 
 * This component manages:
 * - Loading member data (including subscriptions and payments)
 * - Creating manual payment records
 * - Updating payment status and notes
 * - Cancelling subscriptions
 * - Toast notifications for user feedback
 */
function MemberDetailContent() {
  // Get member ID from URL route parameter
  const { id } = useParams();
  
  // Authentication token from AuthProvider context
  const { token } = useAuth();
  
  // Member data state
  const [member, setMember] = useState(null);
  
  // Success message to display to user
  const [message, setMessage] = useState("");
  
  // Error message to display to user
  const [error, setError] = useState("");
  
  // Toast notification message (temporary success feedback)
  const [toastMessage, setToastMessage] = useState("");
  
  // Key to force re-render of toast component
  const [toastKey, setToastKey] = useState(0);

  /**
   * loadMember - Fetches member data from the API
   * 
   * Gets all users and finds the specific member by ID
   * The member object includes subscriptions and payments
   * 
   * Called on initial page load
   */
  const loadMember = useCallback(async () => {
    try {
      // Fetch all users
      const usersPayload = await apiRequest("/api/users", { token });
      // Find the specific member by ID (using == for string/number comparison)
      const foundMember = usersPayload.users.find(u => u.id == id);
      if (!foundMember) throw new Error("Member not found");
      setMember(foundMember);
    } catch (err) {
      setError(err.message);
    }
  }, [token, id]);

  // Load member data when component mounts or ID/token changes
  useEffect(() => {
    loadMember();
  }, [loadMember]);

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
      await loadMember();
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

  /*paid, unpaid, notes */
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
      await loadMember();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  }

  /**
   * Auto-dismiss toast notification
   * 
   * Shows a toast message for 3 seconds (3000ms), then clears it
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
   * handleCancelSubscription - Cancels a member's subscription
   * 
   * @param {number} subscriptionId - ID of the subscription to cancel
   * 
   * Sends PUT request to cancel the subscription, then reloads data
   */
  async function handleCancelSubscription(subscriptionId) {
    setMessage("");
    setError("");

    try {
      await apiRequest(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: "PUT",
        token,
      });
      setMessage("Subscription cancelled.");
      await loadMember();
    } catch (cancelError) {
      setError(cancelError.message);
    }
  }

  // Show loading state while fetching member data
  if (!member) return <div>Loading...</div>;

  // ===== RENDER SECTION =====

  return (
    <main className="page">
      {/* Hero Section: Member基本信息 */}
      <section className="hero">
        <div className="panel">
          <div className="panelInner">
            <span className="pill">Member Details</span>
            <h1 className="sectionTitle" style={{ marginTop: 14 }}>
              {member.name}
            </h1>
            <p className="muted">{member.email}</p>
            
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
      </section>

      {/* Subscriptions Section: List all subscriptions with payments */}
      {/* <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panelInner">
          <h2 className="sectionTitle">Subscribed Plans</h2> */}
          <div className="cardList">
            {/* Check if member has any subscriptions */}
            {(member.subscriptions || []).length ? (
              (member.subscriptions || []).map((subscription) => (
                <div className="panel" key={subscription.id}>
                  <div className="panelInner">
                    {/* Subscription plan name */}
                    <strong>{subscription.plan_name}</strong>
                    {/* Subscription date range */}
                    <p className="muted">
                      {subscription.start_date} to {subscription.end_date}
                    </p>
                    {/* Status badge with dynamic class */}
                    <p className={getStatusClass(subscription.computed_status)}>
                      {subscription.computed_status}
                    </p>
                    
                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "12px 0" }}>
                      <button
                        className="btn buttonGhost"
                        onClick={() => createPayment(subscription.id, subscription.price_cents)}
                      >
                        Add Payment
                      </button>
                      {/* Show cancel button only for active subscriptions */}
                      {subscription.computed_status === "active" && (
                        <button
                          className="btn buttonDanger"
                          onClick={() => handleCancelSubscription(subscription.id)}
                        >
                          Cancel Subscription
                        </button>
                      )}
                    </div>
                    
                    {/* Payment History for this subscription */}
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
              ))
            ) : (
              <div className="empty">No subscriptions found.</div>
            )}
          </div>
        {/* </div>
      </section> */}
      
      {/* Toast Notification */}
      {toastMessage && <div key={toastKey} className="toast">{toastMessage}</div>}
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
      {/* Payment amount in THB */}
      <strong>{payment.amount_cents} THB</strong>
      {/* Payment method (defaults to "manual" if not specified) */}
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
        
        {/* Save button - calls parent callback with updated values */}
        <button className="btn buttonGhost" onClick={() => onSave(payment.id, paid, notes)}>
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
 * MemberDetailPage - Main export, wraps content with protection
 * 
 * Uses ProtectedPage HOC to ensure only users with "owner" role
 * can access this page. Redirects non-owners appropriately.
 */
export default function MemberDetailPage() {
  return (
    <ProtectedPage roles={["owner"]}>
      <MemberDetailContent />
    </ProtectedPage>
  );
}