import { describe, it, expect } from "bun:test";
import { subscriptionDate, isSubscriptionCurrent, preserveSubscriberAccounts, isRevocableGift } from "./subscription-time";

describe("subscription expiry", () => {
  const expiry = Date.parse("2026-10-17T09:00:00Z");
  it("keeps the subscriber active until the saved expiry, down to the last millisecond", () => {
    expect(isSubscriptionCurrent({ isActive: true, expiresAt: new Date(expiry) }, expiry - 1)).toBe(true);
  });
  it("removes the subscriber from Active exactly at expiry", () => {
    expect(isSubscriptionCurrent({ isActive: true, expiresAt: new Date(expiry) }, expiry)).toBe(false);
    expect(isSubscriptionCurrent({ isActive: true, expiresAt: new Date(expiry) }, expiry + 1)).toBe(false);
  });
  it("reads Firebase and mobile serialized timestamps as the same exact expiry", () => {
    for (const value of [new Date(expiry), new Date(expiry).toISOString(), expiry,
      { toDate: () => new Date(expiry) }, { seconds: expiry / 1000, nanoseconds: 0 },
      { _seconds: expiry / 1000, _nanoseconds: 0 }]) {
      expect(subscriptionDate(value)?.getTime()).toBe(expiry);
      expect(isSubscriptionCurrent({ isActive: true, expiresAt: value }, expiry - 1)).toBe(true);
    }
  });
  it("rejects missing, invalid or manually deactivated subscriptions", () => {
    expect(isSubscriptionCurrent({ isActive: true, expiresAt: "invalid" }, expiry - 1)).toBe(false);
    expect(isSubscriptionCurrent({ isActive: true }, expiry - 1)).toBe(false);
    expect(isSubscriptionCurrent({ isActive: false, expiresAt: new Date(expiry) }, expiry - 1)).toBe(false);
  });
  it("preserves separate Firebase accounts even when emails match or are blank", () => {
    const users = [
      { id: "paid", email: "same@example.com" }, { id: "other", email: "same@example.com" },
      { id: "blank-1", email: "" }, { id: "blank-2", email: "" },
    ];
    expect(preserveSubscriberAccounts(users).map((user) => user.id)).toEqual(["paid", "other", "blank-1", "blank-2"]);
  });
  it("never revokes a paid replacement when switching off gift day", () => {
    expect(isRevocableGift({ plan: "1 Month", activatedBy: "admin-gift-day" })).toBe(false);
    expect(isRevocableGift({ plan: "Gift Day (Luo Ancient Movies)", activatedBy: "admin" })).toBe(false);
    expect(isRevocableGift({ plan: "Gift Day (Luo Ancient Movies)", activatedBy: "admin-gift-day" })).toBe(true);
  });
});