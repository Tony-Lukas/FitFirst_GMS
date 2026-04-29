"use client";

/**
 * Owner Dashboard Page
 * 
 * This is the main dashboard for gym owners to:
 * - View live check-in data (members currently in the gym)
 * - See which members are checked in and when they arrived
 * - Browse all members and navigate to individual member details
 * - Search/filter members by name or email
 * - Cancel subscriptions
 * 
 * The page uses WebSocket connections to receive real-time updates
 * when members check in or out of the gym.
 */

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { ProtectedPage } from "../../components/ProtectedPage";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";

/**
 * OwnerPageContent - Main component for the owner dashboard
 * 
 * This component manages:
 * - Loading dashboard data (checked-in members) and all users
 * - Real-time updates via WebSocket when members check in/out
 * - Search/filter functionality for members
 * - Subscription cancellation
 */
function OwnerPageContent() {
  // Authentication token from AuthProvider context
  const { token } = useAuth();
  
  // Dashboard state - tracks currently checked-in members
  const [dashboard, setDashboard] = useState({ count: 0, members: [] });
  
  // All registered members/users
  const [members, setMembers] = useState([]);
  
  // Success message to display to user
  const [message, setMessage] = useState("");
  
  // Error message to display to user
  const [error, setError] = useState("");
  
  // Search query for filtering members
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * loadAll - Fetches all necessary data from the API
   * 
   * This function loads two pieces of data in parallel:
   * 1. Dashboard data - current check-in count and list of checked-in members
   * 2. Members - all registered users
   * 
   * Called on initial page load and after any data modifications
   */
  const loadAll = useCallback(async () => {
    try {
      // Fetch both data sources in parallel for better performance
      const [dashboardPayload, membersPayload] = await Promise.all([
        apiRequest("/api/dashboard/current", { token }),
        apiRequest("/api/users", { token }),
      ]);

      // Update state with fetched data
      setDashboard(dashboardPayload);
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
      await loadAll();
    } catch (cancelError) {
      setError(cancelError.message);
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

      {/* Members Section: List all members with search */}
      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel">
          <div className="panelInner">
            <h2 className="sectionTitle">Members, subscriptions, and payments</h2>
          
            {/* Search Input - filters members by name or email */}
            <input
              className="input"
              placeholder="Search customers by name or email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ marginBottom: 16 }}
            />
          
            {/* Member List - clickable to view individual member details */}
            <div className="cardList">
              {filteredMembers.length ? (
                filteredMembers.map((member) => (
                  // Link to individual member detail page
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