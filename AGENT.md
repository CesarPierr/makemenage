# AGENT.md

## Mise à jour — 2026-04-23

### Ce que le user a demandé sur cette séquence

Le besoin initial exprimé était une refonte globale de l'app pour la rendre beaucoup plus simple, plus intuitive et plus centrée sur les tâches réelles à faire :

- page d'arrivée unique avec vue claire des tâches actuelles ;
- stats, historique, planning et réglages toujours disponibles mais secondaires ;
- toutes les tâches cliquables, modifiables, supprimables ;
- meilleure prise en charge du volume :
  - jusqu'à 100 tâches actives ;
  - environ 10 tâches par jour ;
- ajout d'un panneau `En cours` permettant de démarrer des tâches par pièce, suivre un chrono, puis enregistrer le temps réel ;
- remise à plat du `Journal`, jugé peu utile dans sa forme actuelle ;
- conservation du même niveau de configuration, mais mieux organisé et moins saturé.

Le user a ensuite demandé :

- un plan global exploitable par des ingénieurs ;
- une déclinaison plus précise en PRD, contrats d'API, draft Prisma et mapping composants ;
- une adaptation du texte produit vers quelque chose de plus naturel, plus simple et plus accrocheur ;
- puis une implémentation concrète de la première étape de refonte ;
- enfin un handoff solide pour relancer un nouveau Codex avec plus d'accès CLI.

### Ce qui a été cadré et documenté

Les documents suivants ont été ajoutés pour cadrer la refonte :

- `docs/06_prd_task_first_workspace.md`
- `docs/07_endpoint_contracts_task_workspace.md`
- `docs/08_prisma_migration_draft_task_execution_session.md`
- `docs/09_component_map_task_workspace.md`
- `docs/10_copy_rewrite_task_first.md`
- `docs/11_refonte_task_first_handoff.md`
- `docs/12_codex_resume_prompt.md`

Ils décrivent :

- le repositionnement de l'app autour d'une page `Aujourd'hui` ;
- la nouvelle IA `Aujourd'hui / Planifier / Réglages / Activité` ;
- les contrats d'API cibles ;
- le draft Prisma pour de vraies sessions `En cours` persistantes ;
- le mapping composants/fichiers ;
- la réécriture du ton produit vers un langage plus simple et plus naturel.
- le besoin de départ, l'audit de la situation initiale, et la logique de changement ;
- le prompt exact à réutiliser dans un nouveau Codex avec accès CLI complet.

### Ce qui a été implémenté

Une première version fonctionnelle de la refonte UI a été codée :

- `/app` a été recentré sur un workspace quotidien task-first ;
- une nouvelle route `/app/planifier` a été ajoutée ;
- la navigation principale a été simplifiée autour de :
  - `Aujourd'hui`
  - `Planifier`
  - `Réglages`
  - `Activité` en entrée secondaire ;
- les cartes de tâches ouvrent maintenant un détail unifié en bottom sheet ;
- un premier flux `En cours` existe côté client :
  - lancement par pièce ;
  - timer local ;
  - pause / reprise ;
  - fin de tâche avec écriture de `actualMinutes` via l'API existante ;
  - persistance locale via `localStorage`.

### Fichiers principaux touchés pour cette refonte

- `src/app/app/page.tsx`
- `src/components/task-workspace-client.tsx`
- `src/components/occurrence-card.tsx`
- `src/components/app-shell.tsx`
- `src/app/app/planifier/page.tsx`
- `src/components/planifier-hub-card.tsx`
- `src/app/app/history/page.tsx`
- `src/app/app/calendar/page.tsx`
- `src/app/app/my-tasks/page.tsx`
- `src/lib/use-form-action.ts`
- `src/lib/constants.ts`

### Résultat réel à ce stade

Ce qui existe vraiment dans le repo après cette séquence :

- une home `/app` recentrée sur l'action ;
- une navigation cohérente avec la nouvelle IA ;
- un hub `Planifier` pour sortir l'administration et la projection du flux quotidien ;
- une première couche de copy plus naturelle ;
- une base de documentation suffisamment structurée pour poursuivre par sous-tâches ;
- un handoff documenté pour un nouveau Codex.

Ce qui n'est pas encore terminé :

- la migration complète vers un vrai backend `TaskExecutionSession` ;
- l'exécution E2E dans cette session ;
- le déploiement prod depuis cette session ;
- les finitions UX et backend décrites dans les docs de cadrage.

### État de validation réel

En utilisant le runtime Node local du repo :

- `npm run lint` : OK
- `npm run typecheck` : OK
- `npm test` : OK
- `npm run build` : OK

Le runtime utilisé dans cette session n'avait pas `node`/`npm` sur le `PATH` global, mais un Node local existe dans :

- `.codex-node/node-v22.22.2-linux-x64/bin`

Pour exécuter les commandes dans cette session Codex, préfixer :

```bash
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH
```

### Blocages encore présents

- `npm run test:e2e` échoue ici car le script tente de lancer Docker via `sg docker -c "docker compose up -d db"` ;
- le binaire `docker` n'était pas visible dans cette session ;
- la fonctionnalité `En cours` est pour l'instant client-side, pas encore appuyée sur le modèle Prisma cible `TaskExecutionSession`.
- la copie des skills vers `~/.codex/skills` doit être vérifiée dans l'environnement de la prochaine session si la plateforme continue de filtrer l'écriture sur ce dossier.

### Skills et handoff pour les prochains agents

Skills MakeMenage créés pour accompagner cette refonte :

- `mm-task-first-workspace`
- `mm-repo-runtime`
- `mm-running-session`

Source des skills créée dans cette séquence :

- `/home/pierre/snap/codex/34/skills/mm-task-first-workspace/SKILL.md`
- `/home/pierre/snap/codex/34/skills/mm-repo-runtime/SKILL.md`
- `/home/pierre/snap/codex/34/skills/mm-running-session/SKILL.md`

Copies repo pour handoff et réinstallation manuelle :

- `codex-skills/mm-task-first-workspace/SKILL.md`
- `codex-skills/mm-repo-runtime/SKILL.md`
- `codex-skills/mm-running-session/SKILL.md`

Le prompt de reprise est stocké dans :

- `docs/12_codex_resume_prompt.md`

Le document qui explique pourquoi la refonte a été engagée et ce qui a déjà été fait est stocké dans :

- `docs/11_refonte_task_first_handoff.md`

### Direction produit actuelle

Le produit ne doit plus se présenter comme un dashboard chargé en stats. La trajectoire cible est :

- page d'entrée = `Aujourd'hui` ;
- priorité visuelle = tâches et actions ;
- planning et réglages sortis du chemin principal ;
- langage plus simple, moins "fonctionnalités", plus orienté usage.

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
  - en cours ;
  - ensuite ;
  - planifier ;
  - activité ;
  - réglages du foyer.
- Les actions fréquentes doivent nécessiter peu de clics :
  - marquer une tâche comme faite ;
  - reporter ;
  - réassigner ;
  - voir qui doit faire quoi.
- Les règles doivent être compréhensibles par un non-technique.

### IA cible actuelle

- `Aujourd'hui` = surface quotidienne principale ;
- `Planifier` = calendrier, routines, absences, répartition ;
- `Réglages` = administration foyer ;
- `Activité` = surface secondaire.

### Règle de priorisation UX

Si un arbitrage est nécessaire :

1. rendre la tâche visible ;
2. rendre l'action sur la tâche immédiate ;
3. rendre les conséquences compréhensibles ;
4. seulement ensuite exposer stats, analytics ou vues annexes.

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

## Notes de session pour futurs agents

### Runtime local

Dans cette session Codex, utiliser de préférence :

```bash
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH
```

avant :

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Déploiement

Le déploiement de prod n'a pas été rejoué dans cette session. Avant tout déploiement réel :

1. vérifier la disponibilité de Docker sur la machine cible ;
2. rerun lint, typecheck, unit tests, build ;
3. clarifier le statut des E2E si `docker` ou `sg docker` n'est pas disponible ;
4. seulement ensuite lancer la procédure serveur.

### Prudence sur `En cours`

Le flux de timer actuel est utile mais transitoire :

- persisté en local ;
- non encore synchronisé serveur ;
- non encore basé sur `TaskExecutionSession`.

Si un agent pousse plus loin cette fonctionnalité, il doit d'abord lire :

1. `docs/08_prisma_migration_draft_task_execution_session.md`
2. `docs/07_endpoint_contracts_task_workspace.md`
3. `docs/09_component_map_task_workspace.md`
