import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { planDurations } from "./pesapal";

export interface SubscriptionPlan {
  id: string;
  name: string; // e.g. "1 Month" — also the plan name saved on the user's subscription
  price: number; // UGX
  days: number; // -1 = lifetime
  dailyDownloads: number;
  popular?: boolean;
  icon?: "zap" | "star" | "crown";
}

// Stored in Firestore at config/subscriptionPlans → { plans: SubscriptionPlan[] }
const plansRef = () => doc(db, "config", "subscriptionPlans");

export const DEFAULT_PLANS: SubscriptionPlan[] = [
  { id: "2d", name: "2 Days", price: 5000, days: 2, dailyDownloads: 50, icon: "zap" },
  { id: "1w", name: "1 Week", price: 10000, days: 7, dailyDownloads: 50, icon: "zap" },
  { id: "2w", name: "2 Weeks", price: 17000, days: 14, dailyDownloads: 50, icon: "star" },
  { id: "1m", name: "1 Month", price: 30000, days: 30, dailyDownloads: 50, icon: "star", popular: true },
  { id: "3m", name: "3 Months", price: 70000, days: 90, dailyDownloads: 50, icon: "crown" },
  { id: "1y", name: "1 Year", price: 200000, days: 365, dailyDownloads: 50, icon: "crown" },
];

// Keep plan durations in sync so payments/activation recognise admin-created plans.
function registerDurations(plans: SubscriptionPlan[]) {
  plans.forEach((p) => {
    planDurations[p.name] = p.days;
  });
}

function normalize(data: unknown): SubscriptionPlan[] | null {
  const plans = (data as { plans?: SubscriptionPlan[] } | undefined)?.plans;
  return Array.isArray(plans) ? plans : null;
}

export async function getPlans(): Promise<SubscriptionPlan[]> {
  try {
    const snap = await getDoc(plansRef());
    const plans = normalize(snap.data()) ?? DEFAULT_PLANS;
    registerDurations(plans);
    return plans;
  } catch (e) {
    console.error("Failed to load plans", e);
    registerDurations(DEFAULT_PLANS);
    return DEFAULT_PLANS;
  }
}

export function subscribePlans(cb: (plans: SubscriptionPlan[]) => void): () => void {
  return onSnapshot(
    plansRef(),
    (snap) => {
      const plans = normalize(snap.data()) ?? DEFAULT_PLANS;
      registerDurations(plans);
      cb(plans);
    },
    (err) => {
      console.error("Plans listener error", err);
      cb(DEFAULT_PLANS);
    },
  );
}

export async function savePlans(plans: SubscriptionPlan[]): Promise<void> {
  await setDoc(plansRef(), { plans, updatedAt: new Date().toISOString() });
  registerDurations(plans);
}
