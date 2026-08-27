import test from "node:test";
import assert from "node:assert/strict";

const original = { apiKey: process.env.RESEND_API_KEY, internal: process.env.INTERNAL_EMAIL, legacy: process.env.EMAIL_INTERNAL };
process.env.RESEND_API_KEY = "test-key";
process.env.INTERNAL_EMAIL = "operations@example.test";

const base = { activity: "peche" as const, reservationId: "reservation-1", firstName: "Rose", lastName: "Boulay", phone: "87 00 00 00", email: "rose@example.test", offer: "Privatisation demi-journée", date: "2026-09-10", slot: "morning", participants: 3, invoiceNumber: "SALON-123", total: 100000, paid: 30000, balance: 70000, paymentMethod: "tpe", formula: "morning", offerType: "privatisation" };

test.after(() => { process.env.RESEND_API_KEY=original.apiKey;process.env.INTERNAL_EMAIL=original.internal;process.env.EMAIL_INTERNAL=original.legacy; });

test("builds Pêche notification with invoice amounts and autonomous origin", async () => {
  // @ts-expect-error Node's type-stripping runner requires the source extension.
  const { buildSalonRedemptionNotification } = await import("./salonRedemptionNotification.ts");
  const email=buildSalonRedemptionNotification(base);
  assert.match(email.subject,/Nouvelle réservation Salon – Pêche – Rose Boulay/);
  assert.match(email.html,/100 000 F CFP/);assert.match(email.html,/30 000 F CFP/);assert.match(email.html,/70 000 F CFP/);
  assert.match(email.html,/Solde à régler le jour/);assert.match(email.html,/\/reprendre-offre/);
});

test("builds Baleines operational composition and Charter return date", async () => {
  // @ts-expect-error Node's type-stripping runner requires the source extension.
  const { buildSalonRedemptionNotification } = await import("./salonRedemptionNotification.ts");
  const baleines=buildSalonRedemptionNotification({...base,activity:"baleines",offer:"Offre 5+1",slot:"07:00",participants:6,composition:{mise_eau:6,observateur:0,enfant_moins_12:0,enfant_moins_5:0}});
  assert.match(baleines.html,/Mises à l’eau : 6/);assert.match(baleines.html,/Observateurs : 0/);assert.doesNotMatch(baleines.html,/materielPerso/);
  const charter=buildSalonRedemptionNotification({...base,activity:"charter",offer:"Tetiaroa 2J\/1N",endDate:"2026-09-11",balance:0});
  assert.match(charter.html,/Date de retour : 2026-09-11/);assert.match(charter.html,/Solde restant :<\/strong> 0 F CFP/);assert.doesNotMatch(charter.html,/Solde à régler au plus tard/);
});

test("uses internal recipient and stable Resend idempotency key", async () => {
  // @ts-expect-error Node's type-stripping runner requires the source extension.
  const { sendSalonRedemptionNotification } = await import("./salonRedemptionNotification.ts");
  let request: RequestInit|undefined;
  const result=await sendSalonRedemptionNotification(base,async (_input,init)=>{request=init;return new Response("{}",{status:200})});
  assert.deepEqual(result,{ok:true});
  assert.equal((request?.headers as Record<string,string>)["Idempotency-Key"],"salon-public-redemption-reservation-1");
  assert.deepEqual(JSON.parse(String(request?.body)).to,["operations@example.test"]);
});

test("reports Resend failure without throwing", async () => {
  // @ts-expect-error Node's type-stripping runner requires the source extension.
  const { sendSalonRedemptionNotification } = await import("./salonRedemptionNotification.ts");
  const result=await sendSalonRedemptionNotification(base,async()=>new Response("provider failure",{status:500}));
  assert.deepEqual(result,{error:"provider failure"});
});
