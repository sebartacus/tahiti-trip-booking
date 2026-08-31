import assert from "node:assert/strict";
import test from "node:test";
import { getBaleinesParticipantPrice, getCharterPublicPrice, getPechePublicPrice, getPermisPublicPrice } from "./public-pricing";

const before = new Date("2026-09-03T09:59:59Z");
const during = new Date("2026-09-03T10:00:00Z");
const after = new Date("2026-09-07T04:00:00Z");

test("tarifs Permis avant, pendant et après", () => {
  assert.deepEqual([getPermisPublicPrice("Classique", before).amount, getPermisPublicPrice("Classique", during).amount, getPermisPublicPrice("Classique", after).amount], [25000, 20900, 25000]);
  assert.deepEqual([getPermisPublicPrice("Sérénité", before).amount, getPermisPublicPrice("Sérénité", during).amount, getPermisPublicPrice("Sérénité", after).amount], [33000, 28900, 33000]);
});

test("tarifs Pêche privatisation avant, pendant et après", () => {
  assert.deepEqual([getPechePublicPrice("morning", before).amount, getPechePublicPrice("morning", during).amount, getPechePublicPrice("morning", after).amount], [95000, 79000, 95000]);
  assert.deepEqual([getPechePublicPrice("full_day", before).amount, getPechePublicPrice("full_day", during).amount, getPechePublicPrice("full_day", after).amount], [135000, 110000, 135000]);
});

test("tarifs Baleines avant, pendant et après, sans gratuité publique", () => {
  const water = { age: "30", role: "mise_eau" as const };
  const child = { age: "8", role: "observateur" as const };
  const young = { age: "4", role: "observateur" as const };
  assert.deepEqual([getBaleinesParticipantPrice(water, before).amount, getBaleinesParticipantPrice(water, during).amount, getBaleinesParticipantPrice(water, after).amount], [15000, 12500, 15000]);
  assert.equal(getBaleinesParticipantPrice(child, during).amount, 7000);
  assert.deepEqual([getBaleinesParticipantPrice(young, before).amount, getBaleinesParticipantPrice(young, during).amount, getBaleinesParticipantPrice(young, after).amount], [7000, 7000, 7000]);
  assert.ok([water, child, young].reduce((total, participant) => total + getBaleinesParticipantPrice(participant, during).amount, 0) > 0);
});

test("seul le Charter Tetiaroa 2J/1N est promotionné", () => {
  assert.deepEqual([getCharterPublicPrice("tetiaroa_2j_1n", 310000, before).amount, getCharterPublicPrice("tetiaroa_2j_1n", 310000, during).amount, getCharterPublicPrice("tetiaroa_2j_1n", 310000, after).amount], [310000, 290000, 310000]);
  assert.equal(getCharterPublicPrice("tetiaroa_3j_2n", 429000, during).amount, 429000);
});
