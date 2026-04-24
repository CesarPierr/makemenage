# Cartographie composants et fichiers — Refonte task-first

## 1. Objectif

Cette cartographie sert à découper le travail fichier par fichier sans faire grossir les composants existants au mauvais endroit.

Principe :

- ne pas faire grossir [task-creation-wizard.tsx](/home/pierre/makemenage/src/components/task-creation-wizard.tsx) ;
- ne pas continuer à tout concentrer dans [src/app/app/page.tsx](/home/pierre/makemenage/src/app/app/page.tsx) ;
- isoler clairement workspace quotidien, détail tâche, bibliothèque et sessions en cours.

## 2. Routes App Router

## 2.1 À mettre à jour

- [src/app/app/page.tsx](/home/pierre/makemenage/src/app/app/page.tsx)
  - devient la page `Aujourd'hui`
  - ne doit plus rendre l'ancien dashboard métriques-first

- [src/app/app/calendar/page.tsx](/home/pierre/makemenage/src/app/app/calendar/page.tsx)
  - à déplacer conceptuellement sous `Planifier`
  - peut rester route existante au début, avec libellés refondus

- [src/app/app/history/page.tsx](/home/pierre/makemenage/src/app/app/history/page.tsx)
  - à réduire ou remplacer par `Activité`
  - peut devenir un wrapper de feed léger

- [src/app/app/my-tasks/page.tsx](/home/pierre/makemenage/src/app/app/my-tasks/page.tsx)
  - à décomposer
  - `daily/templates/wizard` ne doit plus être la structure cible

## 2.2 Nouvelles routes recommandées

- `src/app/app/planifier/page.tsx`
  - landing légère du pôle planification

- `src/app/app/planifier/calendar/page.tsx`
  - option si l'équipe veut clarifier vite les routes

- `src/app/app/planifier/tasks/page.tsx`
  - bibliothèque de tâches / routines

- `src/app/app/planifier/activity/page.tsx`
  - si activité reste une page

## 3. Composants UI à créer

## 3.1 Workspace quotidien

- `src/components/task-workspace.tsx`
  - composant principal de la page `Aujourd'hui`
  - orchestre sections et états de chargement

- `src/components/task-workspace-header.tsx`
  - titre, sous-titre, filtres rapides, compteur compact

- `src/components/task-section.tsx`
  - section réutilisable `À faire maintenant`, `En cours`, `Ensuite`

- `src/components/task-list-toolbar.tsx`
  - recherche, filtres, tris, chips

- `src/components/task-group.tsx`
  - regroupement par pièce ou statut

- `src/components/all-tasks-panel.tsx`
  - liste complète paginée ou virtualisée

## 3.2 Carte et détail tâche

- `src/components/occurrence-card.tsx`
  - à garder, mais à simplifier
  - la carte entière doit devenir cliquable
  - les actions inline doivent être limitées aux plus critiques

- `src/components/task-detail-sheet.tsx`
  - bottom sheet mobile

- `src/components/task-detail-panel.tsx`
  - side panel desktop

- `src/components/task-detail-content.tsx`
  - contenu partagé mobile/desktop

- `src/components/task-action-bar.tsx`
  - actions principales : terminer, passer, plus tard

- `src/components/task-edit-scope-selector.tsx`
  - `cette fois` / `prochaines fois`

- `src/components/task-activity-list.tsx`
  - commentaires + activité liée

## 3.3 Sessions en cours

- `src/components/running-session-dock.tsx`
  - mini panneau persistant

- `src/components/running-session-panel.tsx`
  - vue détaillée de la session active

- `src/components/room-sequence-list.tsx`
  - file de tâches par pièce

- `src/components/task-timer.tsx`
  - chronomètre, pause, reprise

## 3.4 Planification

- `src/components/task-library-list.tsx`
  - listing des routines

- `src/components/task-library-toolbar.tsx`
  - recherche et filtres

- `src/components/task-rule-editor.tsx`
  - édition des routines

- `src/components/task-archive-dialog.tsx`
  - archivage avec conséquences explicites

- `src/components/activity-feed.tsx`
  - feed global réutilisable

## 4. Lib server/client à créer

## 4.1 Server loaders

- `src/lib/tasks/workspace.ts`
  - assemble les données pour `Aujourd'hui`

- `src/lib/tasks/library.ts`
  - requêtes ciblées pour la bibliothèque

- `src/lib/activity/feed.ts`
  - données de feed légères

- `src/lib/execution-sessions.ts`
  - logique métier des sessions en cours

## 4.2 Types

- `src/lib/tasks/types.ts`
  - DTOs de carte, détail, groupes, filtres

- `src/lib/execution-session-types.ts`
  - types liés au timer et aux séquences

## 4.3 Validation

- [src/lib/validation.ts](/home/pierre/makemenage/src/lib/validation.ts)
  - ajouter schémas :
    - `occurrenceEditSchema`
    - `taskRuleUpdateSchema`
    - `executionSessionStartSchema`
    - `executionSessionFinishSchema`

## 5. APIs à créer

- `src/app/api/tasks/workspace/route.ts`
- `src/app/api/tasks/library/route.ts`
- `src/app/api/activity/route.ts`
- `src/app/api/occurrences/[id]/route.ts`
- `src/app/api/occurrences/[id]/edit/route.ts`
- `src/app/api/occurrences/[id]/delete-one/route.ts`
- `src/app/api/tasks/[taskId]/archive/route.ts`
- `src/app/api/tasks/[taskId]/edit-rule/route.ts`
- `src/app/api/tasks/[taskId]/delete-future/route.ts`
- `src/app/api/execution-sessions/current/route.ts`
- `src/app/api/execution-sessions/start/route.ts`
- `src/app/api/execution-sessions/[id]/pause/route.ts`
- `src/app/api/execution-sessions/[id]/resume/route.ts`
- `src/app/api/execution-sessions/[id]/finish/route.ts`

## 6. Fichiers existants à alléger

- [src/components/task-settings-list.tsx](/home/pierre/makemenage/src/components/task-settings-list.tsx)
  - garder temporairement
  - puis remplacer par la bibliothèque de tâches

- [src/components/completed-tasks-dialog.tsx](/home/pierre/makemenage/src/components/completed-tasks-dialog.tsx)
  - à remplacer par `Terminé récemment` ou activité liée

- [src/components/week-kanban.tsx](/home/pierre/makemenage/src/components/week-kanban.tsx)
  - probablement à sortir du flux principal
  - peut rester dans `Planifier` si la valeur se confirme

- [src/components/app-shell.tsx](/home/pierre/makemenage/src/components/app-shell.tsx)
  - à simplifier :
    - `Accueil` -> `Aujourd'hui`
    - `Tâches` peut fusionner avec `Aujourd'hui`
    - `Historique` sort de la nav principale

## 7. Proposition de découpage par PR

### PR 1 — Navigation et shell

- `app-shell`
- labels
- routes visibles
- `Aujourd'hui` comme entrée

### PR 2 — Workspace lecture seule

- nouveaux loaders
- sections `À faire maintenant`, `Ensuite`, `Toutes les tâches`
- sans encore remplacer tout le détail

### PR 3 — Détail tâche unifié

- carte cliquable
- détail occurrence/routine
- mutations homogènes

### PR 4 — Bibliothèque de tâches

- listing
- recherche
- édition de routine
- archive/suppression

### PR 5 — Sessions en cours

- schéma
- APIs
- dock + timer

### PR 6 — Activité et nettoyage

- retrait de l'ancien historique comme nav primaire
- remplacement des composants hérités

## 8. Ownership recommandé pour sous-agents

- Agent A : shell, routes, labels, navigation
- Agent B : workspace quotidien et loaders
- Agent C : détail tâche et mutations occurrence
- Agent D : bibliothèque de tâches et édition de routine
- Agent E : schéma + APIs de sessions en cours
- Agent F : copy rewrite et accessibilité

## 9. Notes d'implémentation

- toutes les nouvelles listes doivent être pensées mobile-first ;
- les actions secondaires mobile doivent rester en bottom sheet ;
- les modules DB/secrets restent `server-only` ;
- les changements sur scheduling doivent être couverts par tests avant mutation comportementale ;
- les composants de détail doivent rester sous 500 lignes en extrayant tôt les sous-blocs.

