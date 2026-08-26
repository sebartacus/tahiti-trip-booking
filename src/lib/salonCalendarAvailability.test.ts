import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node's type-stripping runner requires the source extension.
import { baleinesDayStatus, charterDayStatus, pecheDayStatus } from "./salonCalendarAvailability.ts";

test("Baleines distinguishes free, limited and insufficient 5+1 capacity", () => {
  assert.equal(baleinesDayStatus([{ miseEau: 0, observateurs: 0, boatAvailable: true }], 5, 6), "available");
  assert.equal(baleinesDayStatus([{ miseEau: 1, observateurs: 0, boatAvailable: true }], 5, 6), "limited");
  assert.equal(baleinesDayStatus([{ miseEau: 2, observateurs: 0, boatAvailable: true }], 5, 6), "unavailable");
});

test("Pêche respects shared capacity, private boat and full-day conflicts", () => {
  assert.equal(pecheDayStatus([{ used: 0, boatAvailable: true }, { used: 0, boatAvailable: true }], 3, false, false), "available");
  assert.equal(pecheDayStatus([{ used: 1, boatAvailable: true }, { used: 4, boatAvailable: true }], 3, false, false), "limited");
  assert.equal(pecheDayStatus([{ used: 1, boatAvailable: true }, { used: 0, boatAvailable: false }], 4, true, false), "unavailable");
  assert.equal(pecheDayStatus([{ used: 0, boatAvailable: true }, { used: 0, boatAvailable: false }], 2, false, true), "unavailable");
});

test("Charter checks both days, expired holds and validity", () => {
  const future = "2099-01-01T00:00:00.000Z";
  const past = "2020-01-01T00:00:00.000Z";
  assert.equal(charterDayStatus("2026-09-10", [], "2026-09-30", Date.now()), "available");
  assert.equal(charterDayStatus("2026-09-10", [{ date: "2026-09-11", slot: "morning", status: "reserved" }], "2026-09-30", Date.now()), "unavailable");
  assert.equal(charterDayStatus("2026-09-10", [{ date: "2026-09-11", slot: "morning", status: "hold", expires_at: past }], "2026-09-30", Date.now()), "available");
  assert.equal(charterDayStatus("2026-09-10", [{ date: "2026-09-11", slot: "morning", status: "hold", expires_at: future }], "2026-09-30", Date.now()), "unavailable");
  assert.equal(charterDayStatus("2026-09-30", [], "2026-09-30", Date.now()), "outside");
});
