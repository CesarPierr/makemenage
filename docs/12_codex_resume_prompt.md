# Prompt de reprise Codex

Utiliser le prompt ci-dessous dans une nouvelle conversation Codex disposant du bon accès CLI.

```text
Lis d'abord `/home/pierre/makemenage/AGENT.md` puis `/home/pierre/makemenage/AGENTS.md`, ainsi que ces documents de cadrage avant toute modification :

- `/home/pierre/makemenage/docs/06_prd_task_first_workspace.md`
- `/home/pierre/makemenage/docs/07_endpoint_contracts_task_workspace.md`
- `/home/pierre/makemenage/docs/08_prisma_migration_draft_task_execution_session.md`
- `/home/pierre/makemenage/docs/09_component_map_task_workspace.md`
- `/home/pierre/makemenage/docs/10_copy_rewrite_task_first.md`
- `/home/pierre/makemenage/docs/11_refonte_task_first_handoff.md`

Contexte utilisateur initial à garder en tête :

Le besoin de départ était de rendre MakeMenage beaucoup plus simple, plus naturel et beaucoup plus centré sur les tâches à faire. L'app était jugée trop chargée en stats et en informations secondaires, pas assez intuitive au quotidien, pas assez centrée sur l'action. Il fallait :

- une vraie page d'arrivée unique orientée tâches ;
- une meilleure hiérarchie entre quotidien, planning et réglages ;
- un panneau `En cours` pour exécuter des tâches par pièce avec chrono ;
- des tâches cliquables, éditables, supprimables et replanifiables ;
- une remise à plat du journal / activité ;
- une UX capable de tenir jusqu'à 100 tâches actives.

Ce qui a déjà été fait dans le repo :

- cadrage produit, API, Prisma, composants et copy dans les docs `06` à `10` ;
- implémentation d'une première refonte task-first autour de :
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
- validation déjà obtenue pour :
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- dans certaines sessions Codex, `node` et `npm` ne sont pas sur le `PATH`, mais un runtime local existe ici :
  - `/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin`
- `npm run test:e2e` était bloqué dans la session précédente car `docker` n'était pas visible.

Skills MakeMenage à utiliser si disponibles :

- `mm-task-first-workspace`
- `mm-repo-runtime`
- `mm-running-session`

Ces skills ont été créés pendant cette refonte. S'ils ne sont pas visibles automatiquement dans la nouvelle session, regarde d'abord :

- `/home/pierre/.codex/skills/`
- puis en fallback dans le repo :
  - `/home/pierre/makemenage/codex-skills/mm-task-first-workspace/SKILL.md`
  - `/home/pierre/makemenage/codex-skills/mm-repo-runtime/SKILL.md`
  - `/home/pierre/makemenage/codex-skills/mm-running-session/SKILL.md`
- puis en fallback historique :
  - `/home/pierre/snap/codex/34/skills/mm-task-first-workspace/SKILL.md`
  - `/home/pierre/snap/codex/34/skills/mm-repo-runtime/SKILL.md`
  - `/home/pierre/snap/codex/34/skills/mm-running-session/SKILL.md`

Ce que je veux que tu fasses :

1. Audite l'état réel du repo avant toute nouvelle hypothèse.
2. Vérifie le vrai environnement CLI de cette machine et utilise les binaires réellement disponibles.
3. Exécute la validation complète :
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - `npm run test:e2e`
4. Corrige tous les problèmes trouvés.
5. Continue la refonte jusqu'à un niveau réellement prêt à livrer :
   - durcir l'UX task-first ;
   - homogénéiser le texte ;
   - solidifier `En cours` ;
   - implémenter les morceaux backend manquants si nécessaire ;
   - améliorer l'activité / journal si encore incohérent.
6. Déploie l'app depuis cette machine en utilisant la vraie procédure de déploiement du repo.
7. Vérifie l'app déployée.
8. Mets à jour la documentation si les workflows, chemins ou commandes changent.

Contraintes :

- ne pas annuler des changements utilisateur non liés ;
- ne pas s'arrêter à l'analyse ;
- implémenter, valider et déployer ;
- si `docker`, `node`, `npm`, `rsync` ou `ssh` sont sur un chemin non standard, les trouver et les utiliser ;
- si E2E ou déploiement cassent, diagnostiquer la vraie cause puis corriger ;
- garder l'utilisateur informé pendant l'exécution.

Dans la réponse finale, indique clairement :

- ce qui a été modifié ;
- quels tests ont tourné ;
- la commande et le chemin de déploiement utilisés ;
- l'URL ou l'IP finale ;
- les risques restants.
```
