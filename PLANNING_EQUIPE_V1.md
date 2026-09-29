# Planning équipe V1

Page : /planning-equipe ; connexion : /planning-equipe/connexion.
API de session séparée : /api/planning-equipe/session (GET/POST/DELETE, cookies uniquement).
Lectures : /api/planning-equipe/{permis,baleines,peche,peche-nuit,charter}?month=AAAA-MM.

## Configuration Vercel
- EMPLOYEE_PLANNING_PASSWORD : mot de passe équipe dédié, long et aléatoire, variable serveur.
- EMPLOYEE_PLANNING_SESSION_SECRET : secret aléatoire dédié de 32 caractères minimum, variable serveur.
- NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY : configuration serveur existante réutilisée.

Ne jamais préfixer les deux secrets équipe par NEXT_PUBLIC_. Aucun secret n'est fourni dans le dépôt.
Sans configuration complète, connexion et API refusent l'accès.
Session signée de huit heures ; changer le mot de passe ou le secret invalide les sessions.
Limitation des tentatives en mémoire par instance (10 / 15 minutes), non distribuée.

## Données et isolation
Sélections explicites et projection finale par liste autorisée ; aucun objet participant brut.
Le Permis retourne exactement date_cours, creneau, prenom, nom, prenom2, nom2, telephone, examen.
Le Charter retourne exactement date_debut, date_fin, formule, nombre_personnes, responsable_prenom, responsable_nom, responsable_tel.
Baleines : date_sortie, depart, nombre_mise_eau, nombre_observateurs, responsable_prenom, responsable_nom, responsable_telephone.
Pêche : date_sortie, formule, nombre_personnes, responsable_prenom, responsable_nom, responsable_telephone.
Pêche nuit : date_sortie, creneau, issus uniquement de date et slot des boat_calendar_slots réservés.
La vérification Supabase limitée à zéro ligne a renvoyé PGRST205 pour reservations_peche_nuit : cette table n'est pas disponible dans le schéma configuré.
Les créneaux nuit existants restent visibles, mais aucun nom, téléphone ou effectif n'est inventé ; l'interface signale ces détails manquants.
La disponibilité de la table et son schéma devront être précisés pour enrichir cette activité.
Aucun SELECT *, aucune mutation/RPC ; transport Supabase dédié refusant les méthodes autres que GET.
Le client serveur utilise la clé existante : ses permissions en base ne deviennent pas un rôle SQL lecture seule.
Les informations financières servent uniquement aux filtres internes de confirmation, jamais à la projection.
Les réservations annulées/échouées et les tentatives publiques non confirmées sont exclues ; les réservations manuelles sont incluses.
Permis : dossiers non archivés, cours datés valides, formats historiques normalisés avant filtrage mensuel.
Charter : chevauchement de dates, y compris les séjours commencés au mois précédent.
Les erreurs par activité sont visibles ; elles ne deviennent pas une fausse liste vide.

Le cookie équipe ne permet pas d'authentifier l'admin, même renommé.
L'authentification admin et les policies existantes restent inchangées.
Cette séparation ne corrige pas les accès préexistants signalés dans l'audit.

## Vérification
npx --yes tsx src/lib/employeePlanning.test.ts
npx tsc --noEmit --incremental false
Tests API avec transport simulé, sans accès aux réservations réelles.

## Résultats de vérification V1
- Tests ciblés API/session : refus sans session et mauvais mot de passe, connexion, expiration/altération, séparation admin, limites de tentatives, origine, projections exactes, pagination, erreurs et garde de lecture seule.
- TypeScript sans émission et ESLint ciblé : vérifiés.
- Chrome sans fenêtre, données simulées, mobile 320/390 px et bureau : connexion, cinq activités, filtres, navigation mensuelle, journée, liens téléphone, erreur/reprise, déconnexion.
- HTTP réel local : API admin refusée avec session salarié (401), écritures planning refusées (405), cinq lectures refusées sans session (401).
- Aucun build complet, commit, push ou déploiement. Aucun fichier existant modifié.
