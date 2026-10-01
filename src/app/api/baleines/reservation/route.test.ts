import assert from "node:assert/strict";

async function main() {
  // No .env, no network, no production client, no payment request.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "local-test-service-key";
  process.env.PAYMENT_INTENT_SECRET = "local-test-secret";
  let code = "PBC01";
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    assert.equal(url, "http://127.0.0.1:1/rest/v1/rpc/create_baleines_reservation");
    assert.equal(init?.method, "POST");
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.p_reservation.nombre_mise_eau, 1);
    assert.equal(payload.p_reservation.statut_paiement, "pending");
    calls++;
    return new Response(JSON.stringify(code
      ? { code, message: "Capacity conflict" }
      : { id: "local-reservation", montant_total: payload.p_reservation.montant_total, source_paiement: payload.p_reservation.source_paiement }),
      { status: code ? 400 : 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const { POST } = await import("./route");
    const body = {
      date_sortie: "2026-10-01", depart: "07:00",
      responsable_prenom: "Test", responsable_nom: "Local",
      responsable_email: "test@example.invalid", responsable_telephone: "0000",
      participants: [{ prenom: "Test", nom: "Local", age: "30", role: "mise_eau" }],
    };
    const request = () => new Request("http://localhost/api/baleines/reservation", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal((await POST(request())).status, 409);
    code = "40001";
    assert.equal((await POST(request())).status, 409);
    code = "";
    const success = await POST(request());
    assert.equal(success.status, 201);
    assert.ok((await success.json()).paymentToken);
    assert.equal(calls, 3);
    console.log("PASS reservation API: atomic RPC only, capacity/serialization conflicts => 409, success => 201.");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
