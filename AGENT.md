# AGENT.md

## Mission

Développer une application web responsive de gestion et de répartition de tâches ménagères, auto-hébergeable, pensée pour navigateur mobile et desktop, avec déploiement Docker, reverse proxy, DNS et HTTPS.

L'application doit répondre à un besoin concret : gérer des tâches récurrentes de foyer avec rotation et équité, notamment des cas comme :

- tâche tous les 14 jours ;
- alternance stricte entre deux personnes une semaine sur deux ;
- round-robin entre plusieurs personnes ;
- auto-répartition selon charge, temps estimé ou disponibilité ;
- visualisation claire par personne, par semaine et par calendrier.

## Principes à respecter

1. **Priorité au métier**
   La logique de récurrence, de génération d'occurrences et d'attribution est le cœur du produit. Elle doit être fiable, testée et explicable.

2. **Web responsive d'abord**
   Pas d'app native dans un premier temps. L'expérience mobile via navigateur doit être excellente.

3. **Self-hosted simple**
   Le projet doit être déployable par un particulier avec :
   - Docker ;
   - Docker Compose ;
   - reverse proxy ;
   - domaine personnalisé ;
   - HTTPS automatique si possible.

4. **Progressivité**
   Livrer une base propre et fonctionnelle avant les raffinements. Ne pas bloquer la V1 sur la PWA, les push notifications, CalDAV ou des intégrations complexes.

5. **Lisibilité du code**
   Le code doit être compréhensible par un développeur humain, modulaire, documenté, et adapté à une poursuite du développement.

6. **Tests obligatoires**
   Toute logique de récurrence, rotation, équilibrage ou exception doit être couverte par des tests ciblés.

## Livrables attendus

Le dépôt doit au minimum contenir :

- un frontend responsive ;
- un backend API ;
- une base PostgreSQL ;
- un système d'auth simple ;
- la gestion des foyers, membres, tâches et occurrences ;
- un moteur d'attribution ;
- des vues liste et calendrier ;
- un historique ;
- des indicateurs de charge ;
- un `docker-compose.yml` pour développement ;
- un `docker-compose.prod.yml` ou variante claire pour production ;
- un exemple de configuration reverse proxy ;
- une documentation d'installation ;
- une suite de tests automatisés.

## Lecture recommandée des specs

Lire dans cet ordre :

1. `docs/01_vision_produit.md`
2. `docs/03_modele_de_donnees_et_regles_metier.md`
3. `docs/02_architecture_technique.md`
4. `docs/04_plan_de_sprints.md`
5. `docs/05_plan_de_tests.md`

## Décisions techniques recommandées

Ces choix peuvent être adaptés, mais doivent rester cohérents avec les contraintes self-hosted :

### Option recommandée

- **Frontend** : Next.js avec TypeScript, App Router, composants UI accessibles.
- **Backend** : API dans le même projet Next.js ou service séparé Node.js/TypeScript.
- **ORM** : Prisma.
- **Base de données** : PostgreSQL.
- **Auth** : session sécurisée avec email/mot de passe et invitation par foyer.
- **Jobs planifiés** : worker dédié ou cron applicatif.
- **Calendrier** : FullCalendar côté frontend, génération d'exports iCal côté backend.
- **Reverse proxy** : Caddy recommandé.
- **Conteneurisation** : Docker multi-stage.
- **CI** : lint + typecheck + tests unitaires + tests d'intégration + E2E.

### Alternative acceptable

- Frontend Next.js + backend FastAPI/Python si l'équipe préfère Python.
- L'essentiel est de préserver :
  - modularité ;
  - typage ou validation stricte ;
  - bonne couverture de tests ;
  - déploiement simple.

## Contraintes fonctionnelles majeures

Le système doit prendre en charge :

- foyers avec plusieurs membres ;
- rôles (owner, admin, member) ;
- tâches avec fréquence personnalisable ;
- règles de récurrence :
  - quotidienne ;
  - hebdomadaire ;
  - tous les X jours ;
  - tous les X semaines ;
  - mensuelle simple ;
- règles d'attribution :
  - fixe ;
  - manuelle ;
  - alternance stricte ;
  - round-robin ;
  - équilibrage par nombre de tâches ;
  - équilibrage par temps estimé ;
- exceptions :
  - saut d'une occurrence ;
  - report ;
  - remplacement ponctuel de l'assigné ;
  - absence temporaire d'un membre ;
- journalisation des accomplissements ;
- indicateurs d'équité et de charge.

## Contraintes UX

- Interface très lisible sur mobile.
- Navigation rapide vers :
  - aujourd'hui ;
  - cette semaine ;
  - mes tâches ;
  - calendrier ;
  - historique ;
  - réglages du foyer.
- Les actions fréquentes doivent nécessiter peu de clics :
  - marquer une tâche comme faite ;
  - reporter ;
  - réassigner ;
  - voir qui doit faire quoi.
- Les règles doivent être compréhensibles par un non-technique.

## Contraintes de déploiement

Le projet doit pouvoir tourner derrière un reverse proxy avec un domaine, par exemple :

- `https://taches.example.com`

L'application doit supporter :

- variables d'environnement documentées ;
- exécution via Docker Compose ;
- persistance PostgreSQL ;
- sauvegardes simples ;
- logs exploitables ;
- healthchecks ;
- redémarrage propre des services.

## Reverse proxy et DNS

Prévoir la documentation pour :

- création d'un enregistrement DNS A/AAAA ;
- exposition des ports 80/443 ;
- reverse proxy Caddy avec TLS automatique ;
- alternative Nginx ;
- headers proxy et trusted host ;
- configuration des cookies sécurisés en production.

## Sécurité minimale attendue

- hash mot de passe robuste ;
- cookies sécurisés ;
- CSRF si nécessaire selon l'architecture retenue ;
- validation stricte des entrées ;
- rate limiting sur auth ;
- gestion des permissions par foyer ;
- isolation stricte des données inter-foyers ;
- audit minimal des actions critiques.

## Approche d'implémentation

Construire par tranches :

1. base technique ;
2. auth + foyers ;
3. tâches et récurrence ;
4. attribution et occurrences ;
5. UI quotidienne ;
6. calendrier et analytics ;
7. packaging production ;
8. raffinements futurs.

## Important sur le moteur métier

Le moteur métier doit séparer clairement :

- le **template** de tâche ;
- la **règle de récurrence** ;
- la **règle d'attribution** ;
- l'**occurrence générée** ;
- l'**exécution réelle**.

Il faut éviter de recalculer de façon destructive l'historique. Toute génération doit être déterministe, traçable et compatible avec les exceptions.

## Attente sur les tests

Les tests doivent être construits du simple vers le complexe :

- calcul de prochaine occurrence ;
- alternance stricte ;
- round-robin ;
- équilibrage par charge ;
- gestion des membres absents ;
- report ;
- saut ;
- édition de règle après génération ;
- cohérence des vues calendrier.

Voir `docs/05_plan_de_tests.md`.

## Définition de terminé

Une fonctionnalité n'est terminée que si :

- le code compile ;
- les tests associés existent et passent ;
- les permissions sont respectées ;
- le responsive est vérifié ;
- la documentation utilisateur / dev est mise à jour ;
- le cas nominal et au moins 2 cas limites sont couverts.

