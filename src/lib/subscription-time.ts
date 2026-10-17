/** Normalize Firestore timestamps, serialized timestamps, Dates and ISO strings. */
export function subscriptionDate(value: unknown): Date | undefined {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (value && typeof value === "object") {
    if ("toDate" in value && typeof value.toDate === "function") {
      return subscriptionDate(value.toDate());
    }
    const seconds = "seconds" in value ? value.seconds : "_seconds" in value ? value._seconds : undefined;
    const nanos = "nanoseconds" in value ? value.nanoseconds : "_nanoseconds" in value ? value._nanoseconds : 0;
    if (typeof seconds !== "number") return undefined;
    date = new Date(seconds * 1000 + (typeof nanos === "number" ? nanos / 1e6 : 0));
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else {
    return undefined;
  }
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function isSubscriptionCurrent(
  subscription: { isActive?: boolean; expiresAt?: unknown } | null | undefined,
  now = Date.now(),
): boolean {
  const expiry = subscriptionDate(subscription?.expiresAt);
  return subscription?.isActive === true && expiry !== undefined && expiry.getTime() > now;
}

/** Reading or listing accounts never deduplicates or deletes Firebase user IDs. */
export function preserveSubscriberAccounts<T extends { id: string }>(accounts: T[]): T[] {
  return accounts;
}

/** A gift recipient who later purchases a plan must keep the paid expiry intact. */
export function isRevocableGift(subscription: { plan?: string; activatedBy?: string } | null | undefined): boolean {
  return subscription?.plan === "Gift Day (Luo Ancient Movies)" && subscription.activatedBy === "admin-gift-day";
}