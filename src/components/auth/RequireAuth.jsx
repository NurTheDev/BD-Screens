/**
 * @file RequireAuth.jsx
 * @description Route guard for screens that need a *verified* account.
 *
 * Three states matter, and conflating them is how apps end up leaking pages:
 *
 *   loading     → render the page loader, never the protected children
 *   signed-out  → go to /signin, remembering where the user was headed
 *   unverified  → go to /verify, because the account exists but is not proven
 *   signed-in   → render
 *
 * The guard is a UX boundary, not a security boundary. Anything genuinely
 * sensitive is enforced by Firebase (verified addresses) or by the API. This
 * exists so an unverified user never sees a page that will fail underneath them.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";
import { PageLoader } from "../layout/PageLoader.jsx";

/**
 * @param {{ children: React.ReactNode, allowUnverified?: boolean }} props
 */
export function RequireAuth({ children, allowUnverified = false }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageLoader />;

  if (status === "signed-out") {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (status === "unverified" && !allowUnverified) {
    return <Navigate to="/verify" replace />;
  }

  return children;
}
