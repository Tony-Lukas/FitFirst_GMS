"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { apiRequest } from "../../components/api";
import styles from "../../components/forms.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: form,
      });

      setSession({ token: payload.token, user: payload.user });
      router.push(payload.user.role === "owner" ? "/owner" : "/profile");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className={`panel ${styles.authWrap}`}>
        <div className="panelInner">
          <h1 className="sectionTitle">Login</h1>
          <form className="formGrid" onSubmit={handleSubmit}>
            <input
              className="input"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <input
              className="input"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            {error ? <div className="statusCancelled">{error}</div> : null}
            <button className="button" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
          <p className={styles.helper}>
            No account yet? <Link href="/register">Register here</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
