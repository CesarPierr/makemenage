# Journal de simplification — avril 2026

Suite de l'audit du 26 avril 2026 (voir [audit-2026-04.md](audit-2026-04.md)).
Chaque entrée résume une PR/commit en moins de 200 caractères.

## 2026-04-26

### `1212977` — useOptimistic + 4 routes household migrées

OccurrenceCard passe à React 19 `useOptimistic` + `startTransition` au lieu d'un
état manuel avec rollback try/catch. Corrige un bug latent où `router.refresh()`
pouvait laisser une carte sur son ancien état optimiste après succès.

Routes household supplémentaires migrées vers `withHousehold` :
`holidays/[holidayId]`, `integrations/openclaw`, `invites`, `members`,
`members/[memberId]`. **11 routes** au total utilisent désormais les wrappers.

### `64eae39` — Wrapper `withOccurrence` / `withHousehold`

Création de [src/lib/api.ts](../src/lib/api.ts) avec deux factories qui absorbent
le prologue auth + lookup membership dupliqué dans 26 routes. Migration des 5
routes d'action sur occurrence (`complete`, `skip`, `reschedule`, `reassign`,
`reopen`) et de 2 routes household (`recalculate`, `holidays`). Bilan :
**−90 lignes nettes** sur 8 fichiers, comportement identique.

### `8fbe319` — Audit doc + nettoyage dep

Plan de simplification commité dans le repo (`docs/audit-2026-04.md`).
Dépendance `@hookform/resolvers` retirée (déclarée mais jamais importée).

## Sprint en cours

| Item | Statut | Commit |
|---|---|---|
| Audit doc dans le repo | ✅ | `8fbe319` |
| Suppression `@hookform/resolvers` | ✅ | `8fbe319` |
| Wrapper `withOccurrence` / `withHousehold` | ✅ | `64eae39` |
| Migration des 5 routes occurrence | ✅ | `64eae39` |
| `useOptimistic` sur `OccurrenceCard` | ✅ | `1212977` |
| Migration de 6 routes household | ✅ | `64eae39`, `1212977` |
| Migration des routes restantes (`tasks/*`, `comments`) | 🟡 partiel | — |
| CSS dark mode → `@variant dark` | ⏸ reporté | — |
| Découpage `task-workspace-client.tsx` | ⏸ | — |
| Server Actions sur les forms d'auth | ⏸ | — |

## Prochaines étapes recommandées

1. **`tasks/[taskId]` route** : migration vers `withHousehold` avec
   `resolveHouseholdId` (la route lit `householdId` depuis le formData, pas les
   params). Gain estimé : −40 lignes.
2. **`comments` route** : extraction d'un wrapper `withOccurrenceMembership`
   (membership check via `household.members.some`) pour GET + POST.
3. **CSS dark mode** : remplacer les 8 overrides `bg-white/X` par un token
   `--surface-card-rgb` consommé par les composants. Refactor à faire en bloc
   sur l'ensemble des composants car les utilitaires Tailwind générés sont
   littéraux (`rgb(255 255 255 / 0.6)`).
4. **Découpage `task-workspace-client.tsx` (869 lignes)** : extraire
   `useRunningSession()` (logique localStorage), `<FocusSessionTimer>` et
   `<RoomPicker>` dans des fichiers dédiés.
5. **Server Actions** : commencer par les forms d'auth (`login`, `register`,
   `forgot-password`) — moins de surface qu'OccurrenceCard, valeur de
   démonstration.

<!-- nouvelles entrées en haut -->
