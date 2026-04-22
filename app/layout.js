import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "FitFirst",
  description: "Minimal gym management system built with Next.js and PostgreSQL",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
