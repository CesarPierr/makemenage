---
name: mm-task-first-workspace
description: Use when working on MakeMenage daily UX, navigation, task cards, task-detail flows, planifier routing, or product copy tied to the new task-first architecture. Applies to changes around Aujourd'hui, Planifier, Activité, task-first lists, and keeping tasks primary while planning/settings stay secondary.
---

# MakeMenage Task-First Workspace

Use this skill when the task touches the refonte centered on `Aujourd'hui`.

## Goal

Keep MakeMenage focused on:

- seeing tasks first;
- acting on tasks quickly;
- keeping planning and settings out of the primary daily path.

## Current target IA

- `Aujourd'hui`: main authenticated landing page
- `Planifier`: calendar, routines, absences, future organization
- `Réglages`: household administration
- `Activité`: secondary surface, not primary nav

## Core rules

1. The first mobile viewport must show actionable tasks before stats.
2. Every task card should feel like an entry point, not just a status tile.
3. Daily execution lives in `Aujourd'hui`.
4. Routine management belongs in planning/admin surfaces, not in the main task flow.
5. Avoid feature-speak in copy. Prefer direct action-oriented text.

## Files to inspect first

- `/home/pierre/makemenage/src/app/app/page.tsx`
- `/home/pierre/makemenage/src/components/task-workspace-client.tsx`
- `/home/pierre/makemenage/src/components/occurrence-card.tsx`
- `/home/pierre/makemenage/src/components/app-shell.tsx`
- `/home/pierre/makemenage/src/app/app/planifier/page.tsx`
- `/home/pierre/makemenage/docs/06_prd_task_first_workspace.md`
- `/home/pierre/makemenage/docs/10_copy_rewrite_task_first.md`

## Preferred labels

- `Aujourd'hui`
- `Planifier`
- `Activité`
- `À faire maintenant`
- `En cours`
- `Ensuite`
- `Toutes les tâches`
- `Bibliothèque de tâches`

## Avoid

- bringing back `Accueil` as a dashboard concept
- leading with analytics on the home page
- mixing routine admin with the first-run daily task flow
- long explanatory copy about features

## When changing task interactions

Make sure these remain easy to reach:

- complete
- skip
- reschedule
- reassign
- comment
- reopen

If the change affects timer/running behavior, also read:

- `/home/pierre/makemenage/docs/08_prisma_migration_draft_task_execution_session.md`
