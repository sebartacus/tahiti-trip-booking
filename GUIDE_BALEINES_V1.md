# Guide Baleines — V1

Espace indépendant : /planning-guide-baleines.
Consultation uniquement des sorties Baleines opérationnelles à partir
d'aujourd'hui, selon le fuseau Pacific/Tahiti.

## Configuration Vercel

Ajouter uniquement ces deux variables serveur, avec des valeurs propres au Guide :

- GUIDE_BALEINES_PASSWORD : mot de passe Guide.
- GUIDE_BALEINES_SESSION_SECRET : secret aléatoire d'au moins 32 caractères.

Ne pas utiliser de préfixe NEXT_PUBLIC_ ni réutiliser les identifiants admin/salarié.
Le client Supabase serveur utilise les variables déjà présentes
NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY. Aucune nouvelle policy,
table ou migration. L'accès reste indisponible si sa configuration est absente.

Cookie tahiti_trip_guide_baleines, HttpOnly, Secure en production, SameSite=Lax,
Path=/, huit heures. Signature HMAC et portée guide-baleines, distinctes des autres
accès. Le changement du mot de passe ou du secret invalide les sessions Guide.
Le cookie de portée / est nécessaire aux deux chemins page et API ; son nom,
sa signature et son vérificateur sont spécifiques au Guide.
Limitation de connexion : 10 tentatives par adresse sur 15 minutes, par instance
serveur (mémoire locale), comme principe de protection minimal de cette V1.

## Routes

- /planning-guide-baleines : page protégée, calendrier et détails.
- /planning-guide-baleines/connexion : formulaire Guide.
- GET /api/planning-guide-baleines?month=AAAA-MM : réservations opérationnelles.
- GET/POST/DELETE /api/planning-guide-baleines/session : état/connexion/déconnexion.

POST et DELETE ne concernent que le cookie de session, jamais une réservation.
Aucune méthode métier POST/PATCH/DELETE. Réponses privées sans cache.

## Données et filtrage

Une seule table accessible par le lecteur : reservations_baleines. Son transport
refuse tout autre chemin, toute méthode autre que GET et tout SELECT non conforme
à sa liste exacte de champs.

Sélection explicite : date_sortie, depart, nombre_mise_eau, nombre_observateurs,
responsable_prenom, responsable_nom, responsable_telephone, participants.

Critères serveur uniquement :
- source paiement_externe_a_facturer, ou paye=true, ou statut paid/paye/deposit_paid ;
- statuts cancelled/canceled/failed/refused/abandoned/unpaid toujours exclus ;
- simples pending publics exclus, y compris avec un hold de capacité actif ;
- mois demandé, à partir d'aujourd'hui (les sorties du jour restent consultables).

Les critères financiers ne font pas partie du SELECT. Aucun email, identifiant,
facture, montant, statut/source de paiement, carnet ou commentaire n'est renvoyé.

Chaque participant est reconstruit avec ces seuls champs :
prenom, nom, role, age, type, tailleCombinaison, pointurePalmes, materielPerso.
Le JSON participant brut n'est jamais envoyé au navigateur.
Âge normalisé en entier 0–120 ou null ; rôle et catégorie limités aux valeurs
connues ; booléen matériel strict, absent/null reste null (jamais false).

Les réservations manuelles peuvent contenir des noms génériques et ne pas avoir
d'âge ni de tailles. Aucune donnée n'est inventée. Affichage « Non renseigné ».
Pour les observateurs, les informations de combinaison/palmes ne sont pas affichées.

Les réservations d'une même date/heure sont regroupées dans une fiche de départ,
avec les comptes cumulés et un responsable/contact distinct par groupe de clients.
Les contacts sont cliquables en tel: lorsque le numéro est exploitable.
Aucun lien vers admin, Planning équipe ou une autre activité.

## Tests ciblés

- npx --yes tsx src/lib/guideBaleines.test.ts
- node scripts/test-guide-baleines-mobile.cjs

Premier script : 18 vérifications indépendantes sur données synthétiques :
authentification, séparation réciproque des sessions (même cookies renommés et
secrets identiques), filtres opérationnels, projections, pagination, refus des
écritures, erreurs, rendu matériel, âge/matériel absent, déconnexion et expiration.
Transport réseau intégralement simulé.

Second script : Next en développement sur loopback et faux backend HTTP local
avec variables Supabase remplacées ; aucun accès à Supabase Production.
Utilise Playwright déjà installé ou son cache npm, et Chrome installé.
Démarre puis arrête uniquement ses propres processus temporaires.
Vérifie le parcours réel à 320 et 390 px, l'absence de débordement horizontal,
les réponses 401/405, le téléphone, les groupes, les mois et la déconnexion.
Captures dans node_modules/.cache/guide-baleines-tests (non suivies par Git).

Aucun build général, déploiement ou écriture en base n'est nécessaire à ces tests.
