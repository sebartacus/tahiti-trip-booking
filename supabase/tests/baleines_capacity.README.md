# Capacité cumulée Baleines

Correction préparée localement. Aucun déploiement, aucune migration distante,
aucune modification des données existantes.

## Règle commune

La RPC de lecture et le trigger utilisent la même fonction SQL :

- cancelled/canceled/failed/refused/abandoned/unpaid : exclues, même si paye=true ;
- paye=true ou statut paid/paye/deposit_paid : comptées ;
- source paiement_externe_a_facturer : comptée immédiatement, sans paiement en ligne ;
- pending public : compté uniquement pendant son hold de places actif ;
- les autres réservations ne consomment pas de capacité.

Les quantités utilisent le maximum entre les totaux stockés et le nombre de
participants de chaque rôle, pour éviter de sous-compter une ancienne ligne incohérente.

## Holds

Le code existant ne réservait que le bateau pendant 30 minutes, pas les places.
Les nouvelles réservations pending des sources payzen_baleines,
payzen_baleines_salon_tourisme_public et carnet_baleines reçoivent désormais
capacity_hold_expires_at = heure serveur + 30 minutes, dans le trigger.
Aucun ancien pending n'est modifié ni doté rétroactivement d'un hold.

Un échec/une annulation libère immédiatement les places ; l'expiration les libère
sans suppression ni tâche cron. Une simple mise à jour de facture/email ne renouvelle
jamais un hold. La réservation manuelle externe ne dépend pas d'un hold.

Le calendrier bateau conserve son fonctionnement. Une libération du hold bateau
seul ne supprime pas le hold de places ; celui-ci expire à son échéance.
Le code des carnets et le code PayZen restent inchangés.

## Atomicité

La RPC serveur insère dans reservations_baleines ; un trigger commun protège aussi
les insertions directes admin et les transitions de statut/quantité/créneau.
Verrou transactionnel par date/départ, compatible avec les RPC Salon existantes,
puis écriture d'une ligne de verrou : celle-ci force une erreur de sérialisation
si une transaction utilise une ancienne vue des données.
Le contrôle cumulé s'effectue après acquisition du verrou. Les déplacements
verrouillent ancien et nouveau créneau dans un ordre stable.
Limites indépendantes : 6 mises à l'eau et 2 observateurs.
L'API renvoie 409 en cas de capacité insuffisante ou conflit de sérialisation.

Une confirmation après expiration doit repasser le contrôle cumulé : si le créneau
est plein, la base refuse la confirmation. Cela empêche la surréservation, mais ne
garantit pas l'absence d'un encaissement externe tardif : PayZen n'a pas été modifié.
Le même principe s'applique aux flux existants de consommation de carnets.
Ce changement ne constitue pas une correction transactionnelle des paiements/crédits.

## Mise en service ultérieure

Appliquer la migration préparée avant de déployer les appels RPC.
Sans migration, les nouveaux appels échouent ; aucun fallback vers l'insertion
non protégée n'est prévu. Les grants/policies existants de reservations_baleines
ne sont pas modifiés. Les nouveaux objets internes sont fermés au public ;
la RPC publique expose uniquement les agrégats date/départ/quantités.

La réservation réelle d'un nageur pending du 01/10/2026 07:00,
52af8cf3-4f0b-4124-a1ea-c66bd3ccfbc2, reste à traiter séparément.
Avec les 6 nageurs manuels actifs, une tentative de confirmation sera refusée.
Aucune migration de données ou résolution automatique de cette réservation.

## Tests locaux ciblés

- node supabase/tests/baleines_capacity.local.cjs
- npx --yes tsx src/app/baleines/lib/capacity.test.ts
- npx --yes tsx src/app/api/baleines/reservation/route.test.ts

Le premier crée puis détruit SON PROPRE cluster PostgreSQL temporaire sur
127.0.0.1 avec un port libre. Il n'utilise jamais .env, DATABASE_URL ou un serveur
existant. PostgreSQL 18 est trouvé par défaut dans C:/Program Files/PostgreSQL/18/bin ;
BALEINES_TEST_PG_BIN peut désigner un autre répertoire de binaires.

Schéma minimal reproduit pour reservations_baleines et rôles Supabase.
Migration exécutée réellement, fixture 6 admin + 1 ancien pending préservée,
bornes nageurs/observateurs, statuts, expiration, confirmation tardive,
contournement par insert/update, droits RPC, quatre courses multi-connexion.
Les tests de concurrence constatent l'attente effective du verrou dans
pg_stat_activity avant de libérer la première transaction.

Les tests TypeScript vérifient la projection publique et la route serveur avec
transport Supabase simulé (aucun réseau, aucun paiement).
