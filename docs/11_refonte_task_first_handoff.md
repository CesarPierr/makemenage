# Handoff Refonte Task-First

## Contexte de départ

La demande initiale portait sur un problème de fond du produit : l'application donnait beaucoup trop de place aux informations périphériques au détriment de ce que l'utilisateur vient vraiment faire, à savoir voir les tâches et agir dessus.

Le constat utilisateur exprimé était le suivant :

- trop d'informations, stats et indicateurs dès l'entrée ;
- pas assez de focalisation sur les tâches elles-mêmes ;
- navigation et organisation perçues comme peu intuitives ;
- trop de clics ou de dispersion pour les actions utiles ;
- `Journal` peu utile dans sa forme actuelle ;
- besoin d'une expérience plus claire et plus simple pour un public large ;
- besoin de tenir la montée en charge jusqu'à environ 100 tâches actives et 10 tâches par jour.

Le besoin produit formulé par le user était :

- arriver sur une seule page claire ;
- avoir une vue d'ensemble agréable des tâches courantes ;
- garder stats, historique et configuration accessibles mais secondaires ;
- rendre toutes les tâches cliquables, modifiables et supprimables ;
- gérer les reports et replanifications ;
- ajouter un panneau `En cours` pour lancer des tâches par pièce, suivre un chrono et enregistrer le temps réel ;
- repenser ou remplacer le `Journal` par quelque chose de plus léger et plus utile.

## Audit de la situation initiale

Avant implémentation, l'audit du repo montrait :

- une intention mobile-first déjà présente ;
- mais une home encore chargée en métriques, stats et raccourcis ;
- une séparation trop forte entre :
  - faire les tâches ;
  - administrer les routines ;
  - consulter l'historique ;
- des cartes de tâches actionnables mais pas encore structurées comme point d'entrée principal ;
- une logique métier de scheduling déjà riche, donc une refonte qui devait respecter les règles d'occurrence, de report, de skip, de réassignation et d'overrides ;
- des surfaces `My Tasks`, `Calendar`, `History`, `Settings` encore trop éclatées pour un usage quotidien simple.

Conclusion de l'audit : le produit fonctionnait, mais son architecture de navigation et sa hiérarchie d'information ne mettaient pas assez en avant le quotidien de l'utilisateur.

## Changement de cap décidé

La direction retenue a été :

- transformer `/app` en vraie surface `Aujourd'hui` ;
- faire des tâches la priorité visuelle et interactionnelle ;
- faire de `Planifier` la maison du calendrier, des routines et des absences ;
- garder `Réglages` pour l'administration ;
- reléguer `Activité` en surface secondaire ;
- simplifier le texte produit pour parler usage plutôt que fonctionnalités ;
- préparer une montée en puissance backend du flux `En cours`.

## Documents de cadrage produits

Les documents suivants ont été rédigés pour transformer la demande en feuille de route exploitable :

- `docs/06_prd_task_first_workspace.md`
- `docs/07_endpoint_contracts_task_workspace.md`
- `docs/08_prisma_migration_draft_task_execution_session.md`
- `docs/09_component_map_task_workspace.md`
- `docs/10_copy_rewrite_task_first.md`

Ils couvrent :

- la vision produit de la nouvelle home ;
- les contrats d'API pour la nouvelle couche de données ;
- le draft de persistance des sessions `En cours` ;
- le découpage composants et fichiers ;
- la réécriture du texte et des labels.

## Ce qui a déjà été implémenté

Une première tranche concrète de refonte a été codée dans le repo :

- `/app` a été recentré sur une vue task-first ;
- un composant `TaskWorkspaceClient` a été ajouté pour piloter l'expérience quotidienne ;
- `OccurrenceCard` ouvre un détail unifié plutôt que de rester une simple carte d'actions dispersées ;
- la navigation principale a été revue vers :
  - `Aujourd'hui`
  - `Planifier`
  - `Réglages`
  - `Activité` en secondaire ;
- une route `/app/planifier` a été ajoutée ;
- plusieurs textes ont été simplifiés ;
- `use-form-action` a été ajusté pour mieux gérer les redirections côté client ;
- un premier flux `En cours` existe côté client avec persistance locale et écriture de `actualMinutes`.

Fichiers principaux concernés :

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

## Validation réellement effectuée

Dans cette session, la validation a été faite avec le Node local du repo :

```bash
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm run lint
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm run typecheck
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm test
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm run build
```

Statut :

- `lint` : OK
- `typecheck` : OK
- `test` : OK
- `build` : OK

Limitation rencontrée :

- `npm run test:e2e` n'a pas abouti ici car le script appelle Docker via `sg docker -c "docker compose up -d db"` et le binaire `docker` n'était pas visible dans cette session.

## Ce qu'il reste à faire

Le socle de refonte est posé, mais la transformation n'est pas terminée.

À poursuivre :

- exécuter la vraie suite E2E dans une session qui voit Docker ;
- déployer la nouvelle version ;
- migrer le flux `En cours` vers un vrai modèle backend `TaskExecutionSession` si confirmé ;
- poursuivre le durcissement UX pour les gros volumes de tâches ;
- terminer les raffinements copy et les éventuels ajustements d'accessibilité.

## Skills de continuité

Trois skills dédiés ont été créés pour guider les prochains agents :

- `mm-task-first-workspace`
- `mm-repo-runtime`
- `mm-running-session`

Leur première source a été écrite dans :

- `/home/pierre/snap/codex/34/skills/mm-task-first-workspace/SKILL.md`
- `/home/pierre/snap/codex/34/skills/mm-repo-runtime/SKILL.md`
- `/home/pierre/snap/codex/34/skills/mm-running-session/SKILL.md`

Des copies repo ont aussi été ajoutées ici pour servir de fallback portable :

- `codex-skills/mm-task-first-workspace/SKILL.md`
- `codex-skills/mm-repo-runtime/SKILL.md`
- `codex-skills/mm-running-session/SKILL.md`

Dans cette session, la tentative de copie vers `~/.codex/skills` a été bloquée par l'environnement hôte malgré des droits apparents sur `~/.codex`. Il faut donc vérifier ce point depuis la prochaine session si l'objectif est la découverte automatique des skills.

## Document de reprise

Le prompt recommandé pour relancer un Codex avec accès CLI complet est stocké dans :

- `docs/12_codex_resume_prompt.md`
