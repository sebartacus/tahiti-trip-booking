// Isolated PostgreSQL tests: fixtures cover the columns used by this migration.
// The deployed schema (initial table DDL absent from this repo) is not modified.
// Run: node --test supabase/tests/manual_carnet_recredit.test.mjs
// Set PGLITE_MODULE to a local PGlite entry point if installed outside the project.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { PGlite } = await import(process.env.PGLITE_MODULE
  ? pathToFileURL(process.env.PGLITE_MODULE).href : "@electric-sql/pglite");
const migration = readFileSync(new URL("../migrations/202609280001_add_manual_carnet_recredit.sql", import.meta.url), "utf8");
const id = "00000000-0000-4000-8000-000000000001";

test("Manual credit SQL transaction (isolated schema)", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table carnets_baleines (
        id uuid primary key, credits_restants integer not null,
        statut text not null, credits_initiaux integer default 5
      );
      create table reservations_baleines (id uuid primary key, payload text);
      insert into reservations_baleines values ('${id}', 'unchanged');
      create table mouvements_carnets_baleines (
        id bigint generated always as identity primary key,
        carnet_id uuid references carnets_baleines(id),
        reservation_id uuid references reservations_baleines(id),
        mouvement integer not null, motif text, created_at timestamptz default now()
      );
      grant usage on schema public to service_role;
      grant all on carnets_baleines, mouvements_carnets_baleines to service_role;
      grant usage on all sequences in schema public to service_role;
      create function forbid_reservation_write() returns trigger language plpgsql as $$
      begin raise exception 'Reservation write forbidden'; end; $$;
      create trigger no_reservation_write before insert or update or delete
      on reservations_baleines for each statement execute function forbid_reservation_write();
    `);
    await db.exec(migration);
    const reset = async (balance = 3, status = "actif") => {
      await db.exec("delete from mouvements_carnets_baleines; delete from carnets_baleines;");
      await db.query("insert into carnets_baleines(id, credits_restants, statut) values ($1, $2, $3)", [id, balance, status]);
    };
    const credit = async (amount, motif = null, carnetId = id) =>
      (await db.query("select admin_recredit_carnet_baleines($1::uuid, $2::numeric, $3::text) as result", [carnetId, amount, motif])).rows[0].result;
    const state = async () => ({
      carnet: (await db.query("select * from carnets_baleines")).rows,
      mouvements: (await db.query("select * from mouvements_carnets_baleines order by id")).rows,
    });

    await t.test("1. actif 3 +1 = 4", async () => {
      await reset();
      assert.equal((await credit(1)).credits_restants, 4);
    });
    await t.test("2. actif 3 +2 = 5", async () => {
      await reset();
      assert.equal((await credit(2)).credits_restants, 5);
    });
    await t.test("3–4. exact positive movement, reason, no reservation link", async () => {
      const motif = "Sortie annulée du 28/09/2026";
      for (const amount of [1, 2]) {
        await reset();
        await credit(amount, motif);
        const current = await state();
        assert.equal(current.mouvements.length, 1);
        assert.equal(current.mouvements[0].mouvement, amount);
        assert.equal(current.mouvements[0].motif, motif);
        assert.equal(current.mouvements[0].reservation_id, null);
        assert.equal(current.carnet[0].credits_initiaux, 5);
      }
    });
    await t.test("5. epuise 0 +1 = 1, actif", async () => {
      await reset(0, "epuise");
      const result = await credit(1);
      assert.equal(result.credits_restants, 1);
      assert.equal(result.statut, "actif");
    });
    await t.test("6. cancelled refused without mutation", async () => {
      for (const status of ["cancelled", "annule", "annulé", "canceled"]) {
        await reset(3, status);
        const before = await state();
        await assert.rejects(credit(1), /annulé/);
        assert.deepEqual(await state(), before);
      }
    });
    await t.test("7. zero, negative, fractional and invalid amounts refused", async () => {
      await reset();
      const before = await state();
      for (const amount of [0, -1, 1.5, null, "NaN", "Infinity", 2147483648]) {
        await assert.rejects(credit(amount));
        assert.deepEqual(await state(), before);
      }
    });
    await t.test("8. reservations unchanged", async () => {
      assert.deepEqual((await db.query("select * from reservations_baleines")).rows, [{ id, payload: "unchanged" }]);
    });
    await t.test("movement failure rolls back balance and status", async () => {
      await reset(0, "epuise");
      await db.exec("alter table mouvements_carnets_baleines add constraint simulate_failure check (mouvement < 0)");
      const before = await state();
      await assert.rejects(credit(1));
      assert.deepEqual(await state(), before);
      await db.exec("alter table mouvements_carnets_baleines drop constraint simulate_failure");
    });
    await t.test("successive credits accumulate; optional reason; preserve other statuses", async () => {
      await reset(3, "expire");
      await credit(1, "");
      const result = await credit(2);
      assert.equal(result.credits_restants, 6);
      assert.equal(result.statut, "expire");
      assert.equal(result.motif, "Recrédit manuel");
    });
    await t.test("missing carnet and overflow refused", async () => {
      await reset(2147483647);
      const before = await state();
      await assert.rejects(credit(1), /Solde/);
      await assert.rejects(credit(1, null, "00000000-0000-4000-8000-000000000002"), /introuvable/);
      assert.deepEqual(await state(), before);
    });
    await t.test("RPC executable only by service_role", async () => {
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`set role ${role}`);
        await assert.rejects(credit(1), /permission denied/);
        await db.exec("reset role");
      }
      await reset();
      await db.exec("set role service_role");
      assert.equal((await credit(1)).credits_restants, 4);
      await db.exec("reset role");
    });
  } finally {
    await db.close();
  }
});

test("Admin route: session, validation and RPC-only writes", async () => {
  const ts = require("typescript");
  const compile = (relative, overrides = {}) => {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const compiledModule = { exports: {} };
    new Function("require", "module", "exports", outputText)(
      (name) => overrides[name] ?? require(name), compiledModule, compiledModule.exports
    );
    return compiledModule.exports;
  };
  const session = compile("../../src/lib/adminSession.ts");
  const calls = [];
  const { POST } = compile("../../src/app/api/admin/carnets-baleines/[id]/recrediter/route.ts", {
    "@/lib/adminSession": session,
    "@/lib/adminCarnetsBaleines": {
      getAdminSupabaseClient: () => ({
        rpc: async (...args) => {
          calls.push(args);
          return { data: { id, credits_restants: 4, mouvement: args[1].p_nombre_credits }, error: null };
        },
      }),
    },
  });
  const savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  try {
    const request = (body, authenticated = true) => new Request("http://localhost/api/admin/carnets-baleines/" + id + "/recrediter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authenticated ? { cookie: session.ADMIN_SESSION_COOKIE + "=" + session.createAdminSessionToken() } : {}),
      },
      body: JSON.stringify(body),
    });
    const context = { params: Promise.resolve({ id }) };
    assert.equal((await POST(request({ nombre_credits: 1 }, false), context)).status, 401);
    for (const value of [0, -1, 1.5, null, "1", true, 2147483648]) {
      assert.equal((await POST(request({ nombre_credits: value }), context)).status, 400);
    }
    assert.equal(calls.length, 0);
    const response = await POST(request({ nombre_credits: 2, motif: "Sortie annulée" }), context);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, [["admin_recredit_carnet_baleines", {
      p_carnet_id: id, p_nombre_credits: 2, p_motif: "Sortie annulée",
    }]]);
  } finally {
    if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
  }
});
