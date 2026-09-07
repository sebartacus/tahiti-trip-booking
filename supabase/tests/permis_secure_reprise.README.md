# Socle additif Reprise Permis — étape 2B

## État
Aucun parcours existant n'importe ces nouveaux helpers.
La route POST /api/permis/reprise/access renvoie 503 par défaut.
Aucune migration distante n'a été appliquée ; aucun email réel n'a été envoyé.

## Configuration future (aucune variable configurée par ce changement)
- PERMIS_REPRISE_ACCESS_ENABLED=true : activation explicite, uniquement après migration et validation.
- PERMIS_ACCESS_SECRET : secret aléatoire dédié d'au moins 32 caractères ; aucun fallback.
- PERMIS_REPRISE_ORIGIN : origine exacte autorisée, sans slash final, HTTPS en production.
- RESEND_API_KEY et EMAIL_FROM : transport existant.
- PERMIS_TRUST_PROXY=true seulement si le proxy de déploiement écrase x-forwarded-for.
  Sinon une clé réseau partagée limite globalement les demandes (comportement conservateur).

## Contrat
Request : { action: "request", email: "..." } OU { action: "request", telephone: "..." }.
Un seul champ de recherche par demande, aucun reservation_id.
Même statut et même structure de réponse pour contact absent, ambigu, sans email ou limité.
Un UUID aléatoire est renvoyé même lorsqu'aucun challenge n'a été créé.
Délai minimal de réponse 6,5 secondes pour amortir la différence d'envoi ; ce n'est pas
une garantie de temps constant face aux variations du réseau ou à une base lente.
Une ambiguïté (deux dossiers actifs ou plus) n'envoie rien : assistance admin requise.

Verify : { action: "verify", challengeId: "...", code: "123456" }.
Code aléatoire à six chiffres, HMAC-SHA256 lié au challenge, expiration dix minutes,
cinq essais maximum. Une nouvelle émission invalide les précédents challenges du dossier.
Limites persistantes : 20 demandes/réseau, 3/contact et 3/dossier sur dix minutes.
Vérifications plafonnées à 30 par réseau sur dix minutes, indépendamment des demandes.
Cookie signé trente minutes, HttpOnly, SameSite=Lax, Secure en production,
path=/api/permis/reprise, identifiant technique du dossier et aucune coordonnée.

## Planning : pas encore activable
La RPC serveur prépare la sauvegarde partielle, normalisée et transactionnelle.
Elle bloque les écritures concurrentes pendant sa transaction et détecte les conflits
présents, mais ne protège PAS d'une insertion legacy sans contrôle après son commit.
Il faut encore la contrainte commune anti-chevauchement et la validation du calendrier
complet des sessions / des créneaux autorisés avant de brancher une route de sauvegarde.
Aucune contrainte globale ajoutée : ce serait un changement de comportement des
parcours actuels, dont la gestion des erreurs reste inchangée dans cette étape.
Les policies publiques existantes restent dangereuses ; ce socle ne les ferme pas.

## Précontrôle réel — 6 septembre 2026, 11 h 10 Tahiti
Lecture seule de 26 dossiers, archivés inclus :
- 23 couples date_cours/creneau nulls ;
- 3 dates JJ/MM/AAAA, aucun autre format non vide ;
- 07/08/2026 : 07h00 - 09h00 ;
- 11/08/2026 : 09h00 - 11h00 puis 11h00 - 13h00 ;
- aucun chevauchement, aucune valeur non convertible, aucun couple incomplet.
Recontrôler les données avant toute application future.

## Tests
npx --yes tsx src/lib/permisSecureReprise.test.ts
npm exec --yes --package=@electric-sql/pglite -- node supabase/tests/permis_secure_reprise.local.cjs

Le deuxième test utilise uniquement une base en mémoire avec un schéma minimal,
les rôles et les cinq policies reproduits. Il exécute la migration, compare les
policies/grants avant/après et exécute les assertions SQL.
Il ne valide pas la concurrence multi-connexion ni toute la configuration Supabase.
Le fichier permis_secure_reprise.sql peut aussi être exécuté avec psql sur une base
locale jetable ayant le schéma du projet et la migration. Jamais en production.

Les REVOKE du fichier SQL concernent exclusivement les nouveaux objets :
aucun droit existant de reservations ou storage n'est révoqué.
