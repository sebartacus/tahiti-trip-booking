import {
  MISSING, guideAgeLabel, guideDateLabel, guideEquipmentLabel, guideParticipantType,
  guidePersonName, guidePhoneHref, type GuideDeparture, type GuideParticipant,
} from "@/lib/guideBaleines";
import styles from "./guide.module.css";

export function GuideParticipantCard({ participant }: { participant: GuideParticipant }) {
  const swimmer = participant.role === "mise_eau";
  return <article className={swimmer ? styles.swimmerCard : styles.observerCard} data-participant-role={participant.role || "unknown"}>
    <div className={styles.participantHeading}>
      <h4>{guidePersonName(participant.nom, participant.prenom)}</h4>
      <span className={styles.roleBadge}>{swimmer ? "Nageur" : participant.role === "observateur" ? "Observateur" : "Rôle non renseigné"}</span>
    </div>
    <p className={styles.age}>Âge : {guideAgeLabel(participant.age)}</p>
    <p className={styles.age}>Catégorie : {guideParticipantType(participant.type)}</p>
    {swimmer && <dl className={styles.equipment}>
      <div><dt>Combinaison</dt><dd>{participant.tailleCombinaison || MISSING}</dd></div>
      <div><dt>Palmes</dt><dd>{participant.pointurePalmes || MISSING}</dd></div>
      <div><dt>Matériel personnel</dt><dd>{guideEquipmentLabel(participant.materielPerso)}</dd></div>
    </dl>}
  </article>;
}
export default function GuideDepartureDetail({ departure }: { departure: GuideDeparture }) {
  return <>
    <div className={styles.detailHeading}>
      <p className={styles.eyebrow}>Fiche de sortie</p>
      <h2 id="guide-detail-title">{departure.depart} <span>· {guideDateLabel(departure.date)}</span></h2>
      <div className={styles.totals}>
        <span><strong>{departure.nageurs ?? MISSING}</strong> {departure.nageurs === 1 ? "nageur" : "nageurs"}</span>
        <span><strong>{departure.observateurs ?? MISSING}</strong> {departure.observateurs === 1 ? "observateur" : "observateurs"}</span>
      </div>
    </div>
    <div className={styles.preparationTitle}>
      <span aria-hidden="true">≈</span>
      <div><h3>Préparation matériel</h3><p>Les tailles et le matériel de chaque nageur, groupe par groupe.</p></div>
    </div>
    {departure.reservations.map((reservation, index) => {
      const phone = guidePhoneHref(reservation.responsable_telephone);
      return <section key={index} className={styles.customerGroup} aria-label={"Groupe " + (index + 1)}>
        <div className={styles.contact}>
          <div><p className={styles.smallLabel}>Responsable · Groupe {index + 1}</p>
            <h3>{guidePersonName(reservation.responsable_nom, reservation.responsable_prenom)}</h3></div>
          {phone ? <a href={phone} className={styles.phone}>{reservation.responsable_telephone}</a> :
            <p className={styles.muted}>Téléphone : {reservation.responsable_telephone || MISSING}</p>}
        </div>
        <div className={styles.participantList}>
          {reservation.participants.length ? reservation.participants.map((participant, participantIndex) =>
            <GuideParticipantCard key={participantIndex} participant={participant} />) :
            <p className={styles.empty}>Participants : {MISSING}</p>}
        </div>
      </section>;
    })}
  </>;
}
