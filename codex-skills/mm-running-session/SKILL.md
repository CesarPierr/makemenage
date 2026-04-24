---
name: mm-running-session
description: Use when working on the MakeMenage En cours timer flow, room-by-room execution, actualMinutes writeback, or migrating the current client-only running flow toward a server-backed TaskExecutionSession model.
---

# MakeMenage Running Session

Use this skill when the task touches:

- the `En cours` section;
- room-based task execution;
- timer behavior;
- `actualMinutes` writeback;
- future migration to persistent execution sessions.

## Current implementation state

The first implementation is client-side:

- room session starts from `Aujourd'hui`
- current session is stored in `localStorage`
- timer can pause/resume
- finishing a timed task posts to `/api/occurrences/:id/complete`
- `actualMinutes` is derived from elapsed time

This is useful, but transitional.

## Current files

- `/home/pierre/makemenage/src/components/task-workspace-client.tsx`
- `/home/pierre/makemenage/src/app/api/occurrences/[id]/complete/route.ts`
- `/home/pierre/makemenage/src/lib/scheduling/service.ts`

## Target direction

Move toward a true `TaskExecutionSession` model.

Read before redesigning:

- `/home/pierre/makemenage/docs/08_prisma_migration_draft_task_execution_session.md`
- `/home/pierre/makemenage/docs/07_endpoint_contracts_task_workspace.md`
- `/home/pierre/makemenage/docs/09_component_map_task_workspace.md`

## Important rules

1. Do not turn `TaskOccurrence.status` into `running`.
2. Keep `TaskOccurrence` as execution truth for completion state.
3. Treat the running session as a helper layer around execution.
4. Preserve the ability to finish a task without forcing the timer path.
5. Be explicit about recovery after refresh and about one-active-session semantics.

## Validation focus

When modifying this flow, test:

- start room sequence
- pause/resume
- finish with actual minutes
- skip current task
- session recovery after refresh
- interaction with existing complete/skip APIs
