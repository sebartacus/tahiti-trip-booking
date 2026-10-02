# Changement de date Pêche — RPC Supabase

Migration locale : `202610010001_peche_date_change_invoices.sql`. Ne pas appliquer automatiquement en production.

## Configuration
La route admin utilise `getSalonAdminClient()` et les variables Supabase déjà présentes (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Aucune nouvelle variable, connexion SQL applicative ou configuration Vercel.

## Flux et garanties
1. GET admin : `check_peche_date_change`, prévisualisation sans écriture.
2. POST admin : `prepare_peche_date_change` vérifie la demande, prend un instantané des données de facture et alloue un numéro si nécessaire. Aucun changement de réservation/calendrier/historique à ce stade.
3. Vérification de l'ancien PDF, génération du remplacement avec la nouvelle date, stockage sous un nouveau chemin (`upsert: false`). Aucun email.
4. `move_peche_reservation` revalide sous verrou la disponibilité ET l'instantané utilisé pour le PDF. Dans sa seule transaction RPC : archivage de l'ancienne facture, réservation de destination, changement de date, libération/réattribution des anciens slots, insertion de la nouvelle facture et mise à jour des références courantes.
5. Tout conflit ou échec SQL annule l'ensemble des écritures de cette RPC. La route supprime uniquement son nouveau PDF non référencé. Un échec de génération/upload ne déplace rien.

Les données préparées ne proviennent jamais du navigateur : elles sont renvoyées par une RPC service-role puis utilisées côté serveur. Les trois fonctions sont interdites à PUBLIC, anon et authenticated.
Les verrous sont entièrement acquis et libérés dans la RPC, jamais conservés pendant l'upload. Les conventions de verrouillage Salon et les anciens writers calendrier sont couverts. Formule, slots, paiement, montants, client et PayZen inchangés.

Si la réponse à la RPC est perdue, le résultat est signalé comme indéterminé et le nouveau PDF est conservé (il peut être référencé par une transaction validée). L'admin recharge la réservation avant de réessayer. Si le nettoyage d'un PDF échoue, seul un nouveau fichier orphelin peut rester, jamais l'ancien PDF.

## Numérotation
PEC-R-AAAA-N : année d'émission à Tahiti, N = nextval(peche_replacement_invoice_seq), compteur global sans remise à zéro. Les numéros préparés puis abandonnés ne sont jamais réutilisés. L'unicité ne s'applique qu'à PEC-R-%, les doublons historiques restent importables.
L'ancienne date d'émission reste NULL si inconnue.

## Tests locaux
`npx --yes tsx --test src/lib/pecheDateChange.test.ts src/lib/pecheInvoice.test.ts`
PostgreSQL embarqué en mémoire (PGlite), Storage simulé, aucune connexion production.

Concurrence réelle Windows : `npx --yes tsx supabase/tests/peche_date_change_concurrency.ts`.
Ce script utilise uniquement les exécutables initdb/pg_ctl/psql locaux (installation PostgreSQL standard ou binaire de test déjà présent), sans pilote SQL npm. Il lance sa propre base temporaire sur 127.0.0.1, confirme l'attente d'une seconde connexion sur verrou puis son refus après prise du dernier slot, et arrête le serveur. Aucune variable d'accès production n'est lue.
