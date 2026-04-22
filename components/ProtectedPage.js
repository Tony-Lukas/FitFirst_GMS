"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function ProtectedPage({ roles, children }) {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (roles?.length && !roles.includes(user.role)) {
      router.replace(user.role === "owner" ? "/owner" : "/profile");
    }
  }, [ready, roles, router, user]);

  if (!ready || !user || (roles?.length && !roles.includes(user.role))) {
    return (
      <main className="page">
        <section className="panel">
          <div className="panelInner">Checking your session...</div>
        </section>
      </main>
    );
  }

  return children;
}
