import assert from "node:assert/strict";
import { baleinesCapacitiesByDate, emptyBaleinesCapacities, unavailableBaleinesCapacities } from "./capacity";

const day = baleinesCapacitiesByDate([
  { date_sortie: "2026-10-01", depart: "07:00", mise_eau: "6", observateurs: "0" },
  { date_sortie: "2026-10-01", depart: "13:15", mise_eau: 5, observateurs: 2 },
]).get("2026-10-01")!;
assert.equal(Math.max(0, 6 - day["07:00"].miseEau), 0);
assert.equal(Math.max(0, 2 - day["07:00"].observateurs), 2);
assert.equal(Math.max(0, 6 - day["13:15"].miseEau), 1);
assert.equal(Math.max(0, 2 - day["13:15"].observateurs), 0);
assert.deepEqual(baleinesCapacitiesByDate([]).size, 0);
assert.notEqual(emptyBaleinesCapacities()["07:00"], emptyBaleinesCapacities()["07:00"]);
assert.equal(unavailableBaleinesCapacities["07:00"].miseEau, 6);
assert.equal(unavailableBaleinesCapacities["07:00"].observateurs, 2);
assert.throws(() => baleinesCapacitiesByDate([{ date_sortie: "2026-10-01", depart: "07:00", mise_eau: -1, observateurs: 0 }]));
console.log("PASS public capacity projection: real-case 0 swimmers left, observer limit, empty and unavailable states.");

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ParticipantsStep } from "../components/ParticipantsStep";
import { nouveauParticipant } from "./rules";

function renderRoles(role: "mise_eau" | "observateur", waterLeft: number, observersLeft: number) {
  const miseEau = role === "mise_eau" ? 1 : 0;
  const observateurs = role === "observateur" ? 1 : 0;
  const html = renderToStaticMarkup(createElement(ParticipantsStep, {
    participants: [nouveauParticipant(role)],
    demandes: { miseEau, observateurs },
    placesRestantesMiseEau: waterLeft, placesRestantesObservateur: observersLeft,
    peutAjouterParticipant: miseEau < waterLeft || observateurs < observersLeft,
    peutAjouterMiseEau: miseEau < waterLeft, peutAjouterObservateur: observateurs < observersLeft,
    responsableEmail: "", responsableTelephone: "",
    onAddParticipant() {}, onParticipantChange() {}, onParticipantAgeBlur() {},
    onEmailChange() {}, onTelephoneChange() {}, onRemoveParticipant() {},
  }));
  return html;
}
assert.match(renderRoles("mise_eau", 0, 2), /<option[^>]*value="mise_eau"[^>]*disabled=""/);
assert.match(renderRoles("observateur", 6, 0), /<option[^>]*value="observateur"[^>]*disabled=""/);
assert.doesNotMatch(renderRoles("mise_eau", 1, 2), /<option[^>]*value="mise_eau"[^>]*disabled=""/);
console.log("PASS rendered participant controls: seventh swimmer and third observer disabled, last free place selectable.");
