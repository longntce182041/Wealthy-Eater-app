import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * useSessionGuard
 *
 * Listens to the global 'session:expired' DOM event dispatched by api.js
 * when the refresh token is invalid or missing.
 *
 * On expiry:
 *  1. Sets `isExpired = true` so the consuming component can show a modal.
 *  2. After the modal is dismissed (via `handleDismiss`), navigates to /login.
 *
 * Usage:
 *   const { isExpired, handleDismiss } = useSessionGuard();
 */
export function useSessionGuard() {
  const navigate = useNavigate();
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const onSessionExpired = () => {
      setIsExpired(true);
    };

    window.addEventListener("session:expired", onSessionExpired);
    return () => {
      window.removeEventListener("session:expired", onSessionExpired);
    };
  }, []);

  const handleDismiss = () => {
    setIsExpired(false);
    navigate("/login", { replace: true });
  };

  return { isExpired, handleDismiss };
}
