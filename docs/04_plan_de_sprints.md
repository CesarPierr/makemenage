# Plan de sprints

## Hypothèses

- Sprint de 1 à 2 semaines.
- Chaque sprint doit livrer un incrément démontrable.
- Priorité : fiabilité métier > polish visuel.

## Sprint 0 — Cadrage, repo et fondations

### Objectifs
- initialiser le dépôt ;
- installer la stack ;
- définir la structure des modules ;
- poser Docker dev/prod ;
- configurer lint, format, typecheck et CI minimale.

### Livrables
- structure du repo ;
- Dockerfile ;
- docker-compose de dev ;
- base PostgreSQL connectée ;
- migrations initiales ;
- `.env.example` ;
- README d'installation.

### User stories
- En tant que développeur, je peux lancer l'application localement avec une seule commande.
- En tant qu'opérateur self-hosted, je comprends comment paramétrer le domaine et les variables d'environnement.

### Critères d'acceptation
- `docker compose up` démarre l'app et PostgreSQL ;
- page d'accueil de santé disponible ;
- pipeline CI exécute lint + typecheck ;
- première migration appliquée.

## Sprint 1 — Authentification et foyers

### Objectifs
- créer les comptes ;
- se connecter ;
- créer un foyer ;
- gérer les rôles de base.

### Livrables
- pages register/login ;
- modèle User, Household, HouseholdMember ;
- middleware d'auth ;
- création d'un foyer ;
- liste des foyers de l'utilisateur.

### User stories
- En tant qu'utilisateur, je peux créer un compte.
- En tant qu'utilisateur, je peux créer un foyer.
- En tant qu'utilisateur, je ne vois que mes propres foyers.

### Critères d'acceptation
- auth fonctionnelle ;
- isolation des données testée ;
- owner du foyer créé automatiquement.

## Sprint 2 — Membres et invitations

### Objectifs
- ajouter des membres ;
- inviter par email ou lien ;
- gérer les rôles ;
- activer/désactiver des membres.

### Livrables
- écrans de gestion des membres ;
- modèle Invitation ;
- acceptation d'invitation ;
- rôles owner/admin/member.

### User stories
- En tant qu'owner, je peux inviter quelqu'un dans mon foyer.
- En tant qu'admin, je peux modifier un membre.
- En tant que member, je ne peux pas modifier la configuration sensible.

### Critères d'acceptation
- permissions robustes ;
- invitation expirante ;
- UI mobile utilisable.

## Sprint 3 — Modèles de tâches et récurrence simple

### Objectifs
- créer les tâches templates ;
- définir la fréquence ;
- stocker la règle de récurrence ;
- lister les tâches du foyer.

### Livrables
- CRUD TaskTemplate ;
- CRUD RecurrenceRule ;
- formulaires de création/édition ;
- fréquences V1 :
  - quotidienne ;
  - tous les X jours ;
  - hebdomadaire ;
  - toutes les X semaines ;
  - mensuel simple.

### User stories
- En tant qu'admin, je peux créer une tâche "salle de bain" toutes les 2 semaines.
- En tant qu'utilisateur, je peux voir les tâches configurées du foyer.

### Critères d'acceptation
- validation des règles ;
- affichage lisible des récurrences ;
- tests unitaires sur calcul de dates.

## Sprint 4 — Génération d'occurrences

### Objectifs
- générer les occurrences à partir des templates ;
- mettre en place la fenêtre glissante ;
- garantir l'idempotence.

### Livrables
- modèle TaskOccurrence ;
- service de génération ;
- clé d'idempotence ;
- job manuel et job planifié.

### User stories
- En tant qu'utilisateur, je vois les occurrences futures de mes tâches.
- En tant qu'administrateur, je peux régénérer sans dupliquer.

### Critères d'acceptation
- pas de doublons ;
- passé récent + futur générés ;
- changements futurs régénérés sans détruire l'historique.

## Sprint 5 — Assignation V1

### Objectifs
- implémenter les modes d'assignation de base ;
- afficher l'assigné sur les occurrences.

### Modes inclus
- fixe ;
- manuel ;
- alternance stricte ;
- round-robin.

### Livrables
- modèle AssignmentRule ;
- moteur d'assignation ;
- interface de choix du mode ;
- liste des membres éligibles.

### User stories
- En tant qu'admin, je peux définir l'alternance Alice/Bob.
- En tant qu'utilisateur, je peux voir immédiatement à qui revient chaque occurrence.

### Critères d'acceptation
- alternance stable ;
- round-robin sur N membres ;
- tests unitaires et d'intégration sur règles d'attribution.

## Sprint 6 — Actions quotidiennes sur occurrence

### Objectifs
- permettre les opérations d'usage réel ;
- historique minimum.

### Livrables
- marquer comme fait ;
- sauter ;
- reporter ;
- réassigner ;
- journal d'actions ;
- commentaires simples.

### User stories
- En tant qu'utilisateur, je peux marquer une tâche comme faite.
- En tant qu'utilisateur, je peux reporter une tâche à demain.
- En tant qu'utilisateur, je peux réassigner ponctuellement une tâche.

### Critères d'acceptation
- historique visible ;
- impacts sur statut corrects ;
- règles futures non cassées.

## Sprint 7 — Tableau de bord et vues responsive

### Objectifs
- rendre l'app confortable au quotidien ;
- livrer les vues principales.

### Livrables
- dashboard ;
- vue "mes tâches" ;
- vue "semaine" ;
- filtres par membre/catégorie/pièce ;
- shell responsive.

### Dashboard attendu
- tâches du jour ;
- tâches en retard ;
- prochaines tâches ;
- répartition simple par personne.

### Critères d'acceptation
- utilisable sur smartphone ;
- actions rapides accessibles ;
- navigation claire.

## Sprint 8 — Calendrier intégré + export iCal

### Objectifs
- visualiser les occurrences dans un calendrier ;
- fournir un export calendrier externe.

### Livrables
- vue calendrier FullCalendar ;
- filtre par membre ;
- export ICS foyer ;
- export ICS par membre.

### User stories
- En tant qu'utilisateur, je peux voir les tâches sur le calendrier.
- En tant qu'utilisateur, je peux m'abonner à un flux iCal.

### Critères d'acceptation
- le flux ICS est valide ;
- le calendrier affiche correctement la période ;
- le responsive reste correct.

## Sprint 9 — Indicateurs de charge et équité

### Objectifs
- fournir une vraie valeur ajoutée métier.

### Livrables
- nombre de tâches planifiées par membre ;
- minutes estimées par membre ;
- taux de complétion ;
- indicateur d'équité simple ;
- widget ou vue analytics.

### User stories
- En tant que couple, nous pouvons voir si la charge est équilibrée.
- En tant que colocation, nous pouvons identifier un surcroît de tâches chez une personne.

### Critères d'acceptation
- métriques cohérentes ;
- filtres par période ;
- tests sur calcul d'indicateurs.

## Sprint 10 — Auto-répartition avancée

### Objectifs
- implémenter les modes intelligents de répartition.

### Modes inclus
- least_assigned_count ;
- least_assigned_minutes.

### Livrables
- moteur d'équilibrage ;
- paramètres de fenêtre ;
- tie-break stable ;
- affichage de la logique utilisée.

### User stories
- En tant qu'utilisateur, je peux attribuer automatiquement au membre le moins chargé.
- En tant qu'administrateur, je peux choisir une fenêtre de 14 jours pour le calcul.

### Critères d'acceptation
- résultats déterministes ;
- prise en compte des tâches déjà planifiées ;
- tests complexes de répartition.

## Sprint 11 — Absences et contraintes de disponibilité

### Objectifs
- gérer les cas réels où quelqu'un n'est pas disponible.

### Livrables
- absence sur plage de dates ;
- comportement configurable en cas d'absence ;
- fallback vers autre membre éligible ;
- signalisation visuelle.

### User stories
- En tant qu'utilisateur, je peux déclarer que je suis absent la semaine prochaine.
- En tant qu'admin, je peux choisir si le système réattribue automatiquement.

### Critères d'acceptation
- aucune assignation impossible silencieuse ;
- fallback testé ;
- historique compréhensible.

## Sprint 12 — Déploiement production et sécurité

### Objectifs
- fournir une base propre pour l'auto-hébergement réel.

### Livrables
- Docker prod ;
- doc reverse proxy Caddy ;
- doc alternative Nginx ;
- healthchecks ;
- configuration cookies/proxy ;
- limitation de débit sur auth ;
- backups documentés.

### Critères d'acceptation
- déploiement documenté sur un serveur vierge ;
- HTTPS fonctionnel derrière proxy ;
- variables d'environnement explicitées.

## Sprint 13 — Polish V1.0

### Objectifs
- durcir et finaliser la V1.

### Livrables
- amélioration UX ;
- nettoyage de dette technique ;
- corrections responsive ;
- vérifications accessibilité ;
- suite E2E complète ;
- documentation finale.

### Critères d'acceptation
- parcours principaux testés en E2E ;
- stabilité générale ;
- livrable prêt à l'usage quotidien.

## Backlog futur après V1

### Futur 1
- PWA installable ;
- rappels email ;
- digest hebdomadaire.

### Futur 2
- temps réel mesuré ;
- score d'équité avancé ;
- suggestions de répartition.

### Futur 3
- templates de routines ;
- duplication de foyer ;
- import/export CSV.

### Futur 4
- web push ;
- préférences et affinités de tâches ;
- permissions plus fines.

### Futur 5
- intégrations calendrier plus riches ;
- API publique ;
- webhooks.

