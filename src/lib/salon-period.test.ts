import assert from "node:assert/strict";
import test from "node:test";
import { isSalonActive, SALON_TIME_ZONE } from "./salon-period";

test("période Salon Tahiti, début inclusif et fin exclusive", () => {
  assert.equal(SALON_TIME_ZONE, "Pacific/Tahiti");
  assert.equal(isSalonActive(new Date("2026-09-03T09:59:59Z")), false);
  assert.equal(isSalonActive(new Date("2026-09-03T10:00:00Z")), true);
  assert.equal(isSalonActive(new Date("2026-09-07T03:59:59Z")), true);
  assert.equal(isSalonActive(new Date("2026-09-07T04:00:00Z")), false);
});
