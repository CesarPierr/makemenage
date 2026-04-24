---
name: mm-repo-runtime
description: Use when running MakeMenage checks or builds inside Codex where node/npm are not on the global PATH. This skill captures the repo-local Node runtime path, the standard validation commands, and the known Docker-related E2E limitation from this environment.
---

# MakeMenage Repo Runtime

Use this skill when the environment cannot find `node` or `npm` directly.

## Repo-local Node runtime

This repo contains a local Node install at:

- `/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin`

Prefix commands with:

```bash
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH
```

## Standard checks

Run:

```bash
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm run lint
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm run typecheck
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm test
PATH=/home/pierre/makemenage/.codex-node/node-v22.22.2-linux-x64/bin:$PATH npm run build
```

## Known limitation in this Codex environment

`npm run test:e2e` may fail here if Docker is not available. The current failure mode observed is:

- the script tries to spawn `sg docker -c 'docker compose up -d db'`
- `docker` is not visible in this session

So:

1. run lint/typecheck/unit/build first;
2. treat E2E separately if Docker is unavailable;
3. do not claim full validation if E2E could not run.

## Useful files

- `/home/pierre/makemenage/scripts/run-e2e.mjs`
- `/home/pierre/makemenage/package.json`
- `/home/pierre/makemenage/AGENT.md`
