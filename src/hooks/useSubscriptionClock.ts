import { useEffect, useState } from "react";
import { subscriptionDate } from "@/lib/subscription-time";

/** Recheck on focus, each second, and at the nearest saved expiry boundary. */
export function useSubscriptionClock(expiries: unknown[] = []) {
  const [now, setNow] = useState(() => Date.now());
  const nextExpiry = expiries
    .map((expiry) => subscriptionDate(expiry)?.getTime())
    .filter((expiry): expiry is number => expiry !== undefined && expiry > now)
    .reduce((nearest, expiry) => Math.min(nearest, expiry), Infinity);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    const timeout = Number.isFinite(nextExpiry)
      ? window.setTimeout(tick, Math.min(Math.max(nextExpiry - Date.now(), 0), 2_147_483_647))
      : undefined;
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [nextExpiry]);
  return now;
}