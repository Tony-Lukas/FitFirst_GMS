"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import styles from "./app-shell.module.css";

const guestLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
];

const customerLinks = [
  { href: "/", label: "Home" },
  { href: "/plans", label: "Plans" },
  { href: "/profile", label: "Profile" },
];

const ownerLinks = [
  { href: "/", label: "Home" },
  // { href: "/plans", label: "Plans" },
  { href: "/owner", label: "Owner Hub" },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();

  const links = !user ? guestLinks : user.role === "owner" ? ownerLinks : customerLinks;

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span>FitFirst</span>
            <small>Gym Management System</small>
          </Link>

          <nav className={styles.nav}>
            {/* nav bar */}
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={pathname === link.href ? styles.active : ""}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.session}>
            {ready && user ? (
              <>
                <div className={styles.userBox}>
                  <strong>{user.name}</strong>
                  <span>{user.role}</span>
                </div>
                <button className="buttonGhost" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <div className={styles.userBox}>
                <strong>Guest</strong>
                <span>Sign in to continue</span>
              </div>
            )}
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
