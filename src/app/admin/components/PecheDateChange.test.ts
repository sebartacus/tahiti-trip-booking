import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PecheDateChange from "./PecheDateChange";

test("bouton Pêche : passé masqué, aujourd'hui et futur visibles selon minuit à Tahiti", (t) => {
  // UTC is already October 2; Tahiti is still October 1 until 10:00 UTC.
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-02T09:59:59Z") });
  const visible = (date: string) => renderToStaticMarkup(createElement(PecheDateChange, {
    reservation: {
      id: "test", date_sortie: date, formule: "morning",
      slots: ["morning"], facture_numero: null,
    },
    onChanged: async () => {},
  })).includes("Changer la date");

  assert.equal(visible("2026-09-30"), false, "date passée");
  assert.equal(visible("2026-10-01"), true, "aujourd'hui à Tahiti, malgré la date UTC");
  assert.equal(visible("2026-10-02"), true, "date future");
  t.mock.timers.tick(1000);
  assert.equal(visible("2026-10-01"), false, "devient passée à minuit Tahiti");
  assert.equal(visible("2026-10-02"), true, "nouveau jour actuel");
});