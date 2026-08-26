import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Node --experimental-strip-types exige l’extension explicite.
import { createSalonPublicAccessToken, isSalonIdentificationComplete, normalizeSalonEmail, normalizeSalonPhone, normalizeSalonReference, salonContactMatches, verifySalonPublicAccessToken } from "./salonPublicAccess.ts";

test("normalise les identifiants Salon sans accepter une donnée isolée implicite", () => {
  assert.equal(normalizeSalonReference(" sal-2026-001 "), "SAL-2026-001");
  assert.equal(normalizeSalonPhone("+689 87 12 34 56"), "68987123456");
  assert.equal(normalizeSalonEmail(" CLIENT@EXAMPLE.COM "), "client@example.com");
});

test("exige référence et second facteur et compare téléphone ou e-mail normalisés", () => {
  assert.equal(isSalonIdentificationComplete("SAL-1", ""), false);
  assert.equal(isSalonIdentificationComplete("", "+689 87 12 34 56"), false);
  assert.equal(isSalonIdentificationComplete("SAL-1", "+689 87 12 34 56"), true);
  assert.equal(salonContactMatches("87 12 34 56", "client@example.com", "87123456"), true);
  assert.equal(salonContactMatches("87 12 34 56", "client@example.com", "CLIENT@EXAMPLE.COM"), true);
  assert.equal(salonContactMatches("87 12 34 56", "client@example.com", "mauvais@example.com"), false);
  assert.equal(salonContactMatches("87 12 34 56", "client@example.com", "87000000"), false);
});

test("le jeton lie activité, droit et vente et refuse altération ou expiration", () => {
  const now = Date.UTC(2026, 7, 26);
  const token = createSalonPublicAccessToken({ activity: "baleines", rightId: "right-a", saleId: "sale-a" }, now);
  assert.deepEqual(verifySalonPublicAccessToken(token, now + 1000), {
    ...verifySalonPublicAccessToken(token, now),
  });
  assert.equal(verifySalonPublicAccessToken(`${token}x`, now), null);
  assert.equal(verifySalonPublicAccessToken(token, now + 16 * 60 * 1000), null);
});
