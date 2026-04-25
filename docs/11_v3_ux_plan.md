# MakeMenage V3 — Plan de refonte UX "Task-First"

## Légende des statuts

- ✅ Livré et fonctionnel
- 🟡 Partiellement livré
- ❌ Pas encore fait

---

## 0. Contexte & objectif

L'app couvre déjà toutes les fonctionnalités métier (récurrence, rotation équitable, historique, absences, comptes partagés, notifications, dark mode, PWA, Kanban). **Le problème n'est plus fonctionnel, il est perceptif** : trop d'informations concurrentes, la tâche à faire ne saute pas aux yeux, la surface d'action est fragmentée (3 onglets, 5 panneaux settings, 5 routes de nav), et l'ergonomie ne tient plus au-delà de ~30 tâches par foyer.

**Objectif V3** : une app *task-first*, lisible du premier coup d'œil, qui scale jusqu'à 100+ tâches, et qui rend chaque action (complete, skip, reschedule, reassign, edit, delete) atteignable en ≤ 2 taps sur n'importe quelle surface.

---

## 1. Audit de l'existant (avril 2026)

### 1.1 Surfaces actuelles

| Route | Rôle théorique | Taille | Problème identifié |
|---|---|---|---|
| `/app` | Accueil / dashboard | `page.tsx` 141 lignes, délègue à `TaskWorkspaceClient` (696 lignes) | Le workspace client est déjà task-first (search + chronomètre + pièces), mais la route reste labellisée "dashboard" dans la nav |
| `/app/my-tasks` | Daily / Templates / Wizard | 379 lignes, 3 onglets | Duplique `/app` sur l'onglet daily ; sépare édition d'occurrence (sur daily) et édition de template (sur `/app/my-tasks?tab=templates`) — confusion |
| `/app/calendar` | Planning glissant | 199 lignes | Correct, mais accessible uniquement depuis le shell |
| `/app/history` | Journal d'actions | 276 lignes | **Jugé peu utile par l'utilisateur** : chronologie d'events internes, peu actionnable, pagination récente mais toujours froide |
| `/app/settings/*` | 6 sous-panneaux | households/team/access/planning/notifications/danger/integrations | Bonne granularité mais duplication avec "admin tâches" qui vit dans `/app/my-tasks?tab=templates` |
| `OccurrenceCard` | Affichage occurrence | 698 lignes | Comporte déjà : quick complete/skip, bottom-sheet actions (reschedule/reassign/comments/skip-with-note), détails, override preview — **mais pas cliquable comme un tout**, le corps ne mène nulle part |
| `TaskCreationWizard` | Création en 3 étapes | 627 lignes | Trop lourd pour une tâche simple "sortir la poubelle aujourd'hui" ; pas de quick-add |

### 1.2 Ce qui marche déjà (ne pas casser)

- `TaskWorkspaceClient` implémente déjà le concept "ongoing session par pièce" avec chronomètre, persistance localStorage, cross-tab sync
- Kanban `WeekKanban` 4 colonnes (À faire / En retard / Fait / Sauté) — desktop et mobile
- `useFormAction` + toasts sur toutes les actions
- CSRF, rate limiting, dark mode, push notifications câblés
- Pagination cursor-based sur `/app/history`
- Tests unitaires : 73 passants, 55% statement coverage

### 1.3 Ce qui coince

| # | Symptôme | Cause racine | Impact utilisateur |
|---|---|---|---|
| A | "Je ne sais pas quoi faire" en arrivant | Accueil avec 11+ sections, aucune hiérarchie visuelle forte | Rebond dès la première session |
| B | "Ma tâche est où ?" au-delà de 30 tâches | Pas de search/filter global, virtualization, ni tri | Abandon à partir de foyers chargés |
| C | "Comment j'édite cette tâche ?" | Actions *occurrence* (sur la carte) ≠ actions *template* (sur `/app/my-tasks?tab=templates`) | Confusion, double navigation |
| D | "Pourquoi il faut 3 étapes pour ajouter une tâche ?" | Wizard imposé même pour tâche triviale | Friction de création |
| E | "La page historique sert à quoi ?" | Log technique d'action, pas un récit lisible | Feature inutilisée |
| F | "Je dois scroller sans fin" | Mobile : today + strip métriques + upcoming + kanban + 3 stats glissantes | Saturation, découverte difficile |
| G | "Je voudrais enchaîner 5 tâches de la cuisine" | Session chronométrée existe mais enterrée, pas de CTA en home | Fonction cachée |
| H | "Ça rame à 100 occurrences" | `getCurrentHouseholdContext` charge TOUT (tous templates, toutes occurrences, absences, logs) en un `include` imbriqué | Page load > 2s dès ~80 tâches |

---

## 2. Principes directeurs V3

1. **Une tâche, un geste.** Chaque occurrence est un objet cliquable entier ; toutes les actions (valider / reporter / réattribuer / commenter / éditer template / supprimer) sont accessibles depuis ce clic, sans changer de route.
2. **Progressive disclosure.** Home = uniquement ce qu'il faut *maintenant*. Stats, historique, admin = à une frappe de distance, pas dans le flux principal.
3. **Ajouter doit prendre 3 secondes.** Quick-add inline ≠ wizard. Le wizard reste pour la récurrence complexe.
4. **Scale-aware dès le départ.** Toute liste > 20 items → pagination/virtualisation. Toute recherche → index DB.
5. **Chronométrage first-class.** Le mode "session pièce par pièce" doit être une CTA permanente, pas une surprise enterrée.
6. **Symétrie mobile/desktop.** Même hiérarchie, même lexique. On n'a plus deux UI qui divergent.

---

## 3. Information Architecture — AVANT / APRÈS

### 3.1 Navigation actuelle (5 items mobile + "Plus")

```
Accueil · Tâches · Calendrier · Historique · Plus (→ Réglages, Foyers, Intégrations…)
```

### 3.2 Navigation cible (3 items + "Plus")

```
🏠 Aujourd'hui     ← default, remplace à la fois Accueil et My-Tasks Daily
📅 Planning        ← Calendrier + vue liste (semaine/mois/futur)
⚙️ Réglages        ← team + access + planning + notifications + danger + admin tâches (migré depuis my-tasks templates) + foyers + intégrations
                     "Plus" disparaît, tout est dans settings
```

**Renommages** :
- `/app` → reste mais contenu refondu (voir Sprint 1)
- `/app/my-tasks?tab=daily` → **supprimé**, redirection vers `/app` ✅
- `/app/my-tasks?tab=templates` → déplacé vers `/app/settings/tasks` ✅
- `/app/my-tasks?tab=wizard` → gardé mais accessible uniquement comme "Ajouter une tâche complexe" depuis le quick-add ✅
- `/app/history` → remplacé par un drawer "Activité" (voir Sprint 5) ❌ encore en nav desktop

---

## 4. Sprints — Plan d'exécution détaillé

### Sprint 1 — Accueil task-first ✅

**Objectif** : refondre `/app` pour que 90% de la valeur soit au-dessus du fold sur mobile (375×812).

**Livrables** :

1. ✅ **Header minimal** (`src/components/home-header.tsx`)
   - ✅ Ligne 1 : `Bonjour {prénom} · {jour}`
   - ✅ Ligne 2 : compteurs `{X} à faire aujourd'hui` + `Y en retard` (pills)
   - ✅ Ligne 3 : barre de progression hebdo `N/M validées` avec pourcentage `aria-valuenow`
   - ✅ Strip 5 metric cards déjà déplacée dans `StatsDrawer`

2. ✅ **Focus zone**
   - ✅ Titre "Aujourd'hui" + CTA **"Lancer une session"** dans l'en-tête de section, qui démarre la pièce la plus chargée
   - ✅ Liste groupée par pièce
   - ✅ Tri : pièces avec retard en premier, puis nombre de tâches décroissant (`sortedNowGroups`)

3. 🟡 **Second niveau**
   - ✅ Accordéon "À venir (7 jours)" via `CollapsibleList` (déjà présent)
   - ✅ Accordéon "Ma semaine" (`WeekKanban`) intégré dans `/app/page.tsx` via `<details>`

4. ✅ **Quick-add barre flottante** — `src/components/quick-add-bar.tsx`

5. ✅ **Header `TaskWorkspaceClient` allégé** — date/count/lien "Planifier" supprimés (redondant avec `HomeHeader`)

**Critères d'acceptation** :
- 🟡 Header + titre + 1ère tâche visibles sans scroll sur iPhone 13 (à vérifier en QA mobile)
- ❌ Lighthouse Performance ≥ 90 sur `/app` avec 50 tâches (non mesuré)
- ❌ Tests E2E : `quickAddOccurrence`, `sessionCtaOpensChronometer`, `upcomingSectionCollapsed` (à écrire)

**Fichiers touchés** : ✅ `src/app/app/page.tsx`, ✅ `src/components/task-workspace-client.tsx`, ✅ `src/components/quick-add-bar.tsx`, ✅ `src/components/home-header.tsx`

---

### Sprint 2 — Task Detail sheet unifié ✅

**Objectif** : un clic sur le corps d'une carte d'occurrence ouvre **une seule** surface qui couvre TOUTES les actions.

**Livrables** :

1. ✅ **Carte cliquable entière**
   - ✅ `OccurrenceCard` ouvre `TaskDetailSheet` unifié au clic (corps + bouton "...")
   - ✅ Tous les bottom-sheets éphémères supprimés (showActions, showReschedule, showReassign, showDetailedComplete, showComments, showTemplateEdit, showTaskHistory) — un seul sheet à 4 onglets

2. ✅ **Nouveau composant `TaskDetailSheet`** — `src/components/task-detail-sheet.tsx`
   - ✅ Tab "Cette fois-ci" : Terminer / Terminer avec détails / Faire plus tard / Changer la personne / Passer avec note (sous-modes inline avec retour)
   - ✅ Tab "Modèle" (admin only) : `TemplateEditPanel` existant
   - ✅ Tab "Historique" : `TaskHistoryPanel` existant
   - ✅ Tab "Commentaires" : fetch + post déplacés dans le sheet

3. 🟡 **Endpoint unifié `/api/tasks/[id]/edit`** — non créé ; les routes existantes restent (split est intentionnel : chaque action a sa permission/validation propre, et le sheet appelle déjà la bonne route. À reconsidérer plus tard si on factorise.)

4. ✅ **Suppression du tab "templates"** — redirection 301 vers `/app/settings/tasks`

**Critères d'acceptation** :
- ✅ 1 seul clic sur la carte ouvre TOUT sans navigation
- ✅ Actions occurrence vs template visuellement distinctes (onglets séparés)
- ❌ E2E : `taskDetailSheetCoversAllActions`, `editTemplateFromOccurrenceSheet`, `seeLast5RunsOfTask` (à écrire)

**Fichiers touchés** : ✅ `src/components/task-detail-sheet.tsx`, ✅ `src/components/occurrence-card.tsx` (refactor : ~780 → ~290 lignes), 🟡 `src/app/api/tasks/[id]/edit/route.ts` (non fait, justification ci-dessus)

---

### Sprint 3 — Focus Mode / Session par pièce ✅

**Objectif** : transformer le chronomètre en CTA première classe et le polir.

**Livrables** :

1. ✅ **CTA permanente en home**
   - ✅ Bouton "Lancer une session" en haut de la focus zone (cible la pièce la plus chargée — Sprint 1)
   - ✅ `<FocusSession>` rendu en haut du `TaskWorkspaceClient` quand une session est active : titre, pièce, tâche en cours, prochaine tâche, chrono, contrôles. Plus jamais enfoui en 3ᵉ section.

2. ✅ **Flux de démarrage amélioré**
   - ✅ Sélecteur par pièce
   - ✅ Composant dédié `src/components/focus-session.tsx` (présentationnel) extrait du workspace
   - ✅ Résumé fin de session (déjà livré — sprints précédents)

3. 🟡 **Persistance robuste**
   - ✅ Session en localStorage + sync cross-tab via `StorageEvent`
   - ❌ Sync BDD via `POST /api/sessions/ping` — non livré : décision de garder localStorage seul (les sessions sont des artefacts locaux, fragiles côté BDD pour un gain réel marginal). Le bandeau de reprise au login est de toute façon couvert puisque la session est restaurée à l'ouverture du `/app` sur n'importe quel onglet.

4. ✅ **Report automatique des minutes réelles** — `finishCurrentRunningTask()` dans `TaskWorkspaceClient` envoie déjà `actualMinutes: String(Math.max(1, Math.round(effectiveElapsedMs / 60000)))` au backend lors d'un "Terminer" depuis la session.

**Critères d'acceptation** :
- ✅ Session de 3 tâches faisable en < 5 taps (1 tap pour lancer, 1 tap pour valider chaque)
- 🟡 Session persiste à travers reload (localStorage uniquement, pas BDD — décision assumée)
- ❌ E2E : `runSessionCyclesThroughRoomTasks`, `sessionResumeAfterReload` (à écrire)

---

### Sprint 4 — Scale : search, filters, virtualization, backend 🟡

**Objectif** : rester fluide à 100+ tâches et 500+ occurrences actives.

**Livrables** :

1. ✅ **Barre de recherche persistante** — `TaskWorkspaceClient`

2. ✅ **Filtres rapides**
   - ✅ `Mes tâches` / `Tout le foyer` (segmented control)
   - ✅ `Par pièce` (select)
   - ✅ `Par assigné` (select, visible quand scope = "Tout le foyer" et > 1 membre)
   - ✅ `En retard seulement` (toggle pill)
   - ✅ Bouton "Réinitialiser" qui apparaît quand un filtre est actif
   - ✅ Filtre par membre sur le **calendrier** — déjà livré

3. ❌ **Virtualisation** — `@tanstack/react-virtual` non installé. Décision : pas nécessaire à ce stade ; la pagination "Voir plus" (12 par lot) suffit pour les volumes actuels. À reconsidérer en S8 si le seed de stress montre un goulot.

4. 🟡 **Backend — Pagination**
   - ✅ `GET /api/occurrences` paginé : `?cursor=...&limit=...&status=...&memberId=...`. Renvoie `{items, nextCursor}` avec un `take: limit + 1` puis `slice` (cursor stable, `MAX_LIMIT=200`)
   - ❌ Pas de consommateur de cette route paginée encore (la home charge via `getCurrentHouseholdContext`). À câbler quand on voudra une vue "tout l'historique" client-side.
   - ❌ `getCurrentHouseholdContext` charge encore tout (fenêtre `[today - 30j, today + 30j]`). Décision : la fenêtre 30/30 est déjà raisonnable et tous les indexes DB sont en place.

5. ✅ **Backend — Indexes DB**
   - ✅ `(householdId, scheduledDate)` sur `TaskOccurrence`
   - ✅ `(householdId, status, scheduledDate)` (encore plus précis que ce que le plan demandait)
   - ✅ `(householdId, assignedMemberId, scheduledDate)`
   - ✅ `(assignedMemberId, scheduledDate)`
   - ✅ `(taskTemplateId)`
   - ✅ `(occurrenceId, createdAt)` sur `OccurrenceComment`
   - ❌ Trigram sur `TaskTemplate.title` (la recherche est client-side pour l'instant — pas critique)

6. ❌ **Backend — Projections calculées** — non livré, et probablement pas nécessaire avant d'avoir mesuré la charge réelle. Reporté en S8.

7. ❌ **Frontend — Chargement progressif** — pas de Suspense skeleton sur "À venir" / "Kanban". Le `next/dynamic` est utilisé pour `OnboardingWizard` uniquement.

**Critères d'acceptation** :
- ❌ TTI < 1s avec 200 templates / 1000 occurrences (non mesuré)
- ❌ Recherche floue `pousiere` → "Poussière meubles" en < 200ms (recherche client substring, pas fuzzy)
- ❌ E2E : `searchFindsTaskWithFuzzyMatch`, `paginationLoadsMoreOccurrences` (à écrire)

---

### Sprint 5 — Journal / Activité ✅

**Livrables** :

1. ✅ **Composant `RecentActivityFeed`** — `src/components/recent-activity-feed.tsx`, intégré en home et dans settings/activity

2. ✅ **Retrait de "Historique" de la nav principale** — la sidebar desktop n'utilise que `mobileSections` (3 items : Aujourd'hui / Planifier / Réglages) ; "Historique" est invisible dans toute nav.

3. ✅ **301 de `/app/history` vers `/app/settings/activity`** — `src/app/app/history/page.tsx` est un simple `redirect()` qui préserve `?household=` et `?filter=`.

4. ✅ **Section "Dernières activités" dans le drawer Stats** — 5 dernières actions dans `StatsDrawer` (acteur · verbe · tâche · "il y a X"), avec lien "Tout voir →" vers `/app/settings/activity`.

**Critères d'acceptation** :
- ✅ Un non-admin ne voit "Historique" nulle part dans la nav (mobile et desktop)
- ✅ Feed en langage naturel "{qui} a {verbe} {tâche} il y a {X}"
- ❌ E2E : `recentActivityVisibleFromDrawer` (à écrire)

---

### Sprint 6 — Stats drawer & Settings consolidés ✅

**Livrables** :

1. ✅ **Drawer "Statistiques"** — `src/components/stats-drawer.tsx`
   - ✅ Section "Mes chiffres" (streak, complétions récentes)
   - ✅ Section "Foyer" (charge par membre, 30j)
   - ✅ Section "Dernières activités" (top 5, langage naturel, lien "Tout voir →") — Sprint 5

2. ✅ **`/app/settings` refondu** — structure Foyer / Moi : team, access, planning, tasks, notifications, integrations, danger, households, activity

3. ✅ **Toggle thème dans le header** — light/dark/system, accessible en ≤ 1 tap

**Critères d'acceptation** :
- ✅ Depuis le home, une métrique est à 1 tap (icône drawer)
- ✅ Les données stats ne vivent plus dans home (le pessimisme du précédent audit était inexact : seul le bouton `StatsDrawer` est rendu directement, le contenu vit dans le drawer)
- ❌ E2E : `statsDrawerShowsAllMetrics`, `settingsHasTwoSections` (à écrire)

---

### Sprint 7 — Polish, a11y, onboarding ré-aligné 🟡

**Livrables** :

1. ✅ **Onboarding wizard V2**
   - ✅ Étape "Choisissez un pack" (Couple / Coloc / Famille / Personnalisé)
   - ✅ Étapes Welcome → Pack → Tasks → Invite → Done
   - ✅ CTA finale "Lancer ma première session" → `/app?household=...&start=session` qui auto-démarre la pièce la plus chargée via `autoStartSession` ; secondaire "Aller au tableau de bord"

2. 🟡 **A11y**
   - ✅ `aria-live="polite"` sur les zones dynamiques (occurrence count, filtered count, comments list)
   - ✅ Landmarks : `<main>` (app-shell), `<nav>` (sidebar + mobile bottom), `<header>` (app-shell), `<aside>` (Ma semaine + Activité récente)
   - ✅ Focus trap : BottomSheet utilise `<dialog showModal()>` natif → focus trap géré par le navigateur ; `aria-label="Fermer"` ajouté sur la close-button
   - ❌ Audit contrast WCAG AA (`var(--ink-500)` etc.) non fait — nécessite Lighthouse, à faire en QA finale

3. 🟡 **Touch targets mobile** — bouton de fermeture du `BottomSheet` passé de 32×32 à 44×44 ; les `min-h-[44px]` sont déjà sur les boutons de carte. Audit complet à faire en QA.

4. ✅ **Empty states améliorés**
   - Focus zone vide : emoji 🎉 + message + lien "Voir le planning" (s'il y a des tâches à venir)
   - Filtres sans résultat : message + bouton "Réinitialiser les filtres"
   - "Aujourd'hui c'est tranquille" pris en compte

**Critères d'acceptation** :
- ❌ Lighthouse Accessibility ≥ 95 (non mesuré)
- ❌ Parcours au lecteur d'écran (à faire en QA)

---

### Sprint 8 — Scale validation, monitoring, release 🟡

**Objectif** : valider sous charge, instrumenter, déployer.

**Livrables** :

1. ✅ **Seed de stress** — `npm run db:seed:stress` (`prisma/seed-stress.ts`)
   - 1 foyer, 4 membres
   - 120 templates (10 pièces × variations) avec récurrences variées (1/2/3/7/14/30 jours)
   - ~1100 occurrences sur ±30 jours, statuts mixés (completed/skipped/overdue/due/planned)
   - Idempotent : purge l'utilisateur `demo-stress@makemenage.local` avant de re-seeder

2. 🟡 **Métriques UX** — `POST /api/metrics` (beacon allowlist) + `useUxEvent` hook + `<UxEventTracker>` composant
   - ✅ `home.rendered` émis avec `{todayCount, overdueCount, weekTotal, taskCount}` au mount
   - ✅ Allowlist : `home.rendered`, `quick_add.submitted`, `session.started`, `session.completed`, `task_detail.opened`, `filter.toggled`
   - ✅ Logs JSON via `logInfo("ux.event", ...)` — agrégation à connecter à un outil (Plausible, Loki, Mixpanel) en ops
   - ❌ Le hook n'est pas encore appelé sur `quick_add.submitted` / `session.*` / `task_detail.opened` / `filter.toggled` (il suffit d'importer `useUxEvent` aux bons endroits — laissé pour Phase prochaine)

3. 🟡 **Observabilité serveur** — middleware logge un événement JSON `request.middleware` quand `duration_ms > 50` ; header `Server-Timing: mw;dur=<n>` exposé. P50/P95/P99 par route nécessite encore une APM (Vercel, Datadog, OpenTelemetry).

4. 🟡 **Tests de non-régression**
   - ✅ 73 tests unitaires Vitest verts
   - ✅ Viewport mobile (390×844) déjà configuré dans `playwright.config.ts` (project `mobile-chromium`)
   - ❌ Visual regression (Playwright screenshots) — décision : pas de baseline en CI tant que l'UX bouge. À ajouter quand on aura > 1 mois sans changement majeur.
   - ❌ Tests E2E V3 spécifiques (`taskDetailSheetCoversAllActions`, `quickAddOccurrence`, etc.) à écrire

5. ❌ **Déploiement progressif** — pas de feature flag `ux_v3_enabled`. Décision : V3 est devenue la branche principale, un flag introduirait de la dette ; un rollback se fait par revert git.

---

## 5. Backend — vue d'ensemble des changements

| Changement | Motivation | Statut | Risque |
|---|---|---|---|
| `TaskOccurrence` indexes `(householdId, scheduledDate, status)` | Scale S4 | ❌ | Faible (migration additive) |
| `ActionLog` index `(householdId, createdAt)` | Pagination rapide | ❌ | Faible |
| Trigram index sur `TaskTemplate.title` | Search S4 | ❌ | Requiert extension `pg_trgm` en prod |
| `getCurrentHouseholdContext` → fenêtre 7j au lieu de tout | Perf | ❌ | Moyen : refondre tous les consommateurs |
| Nouveau endpoint `GET /api/occurrences` paginé | Scale S4 | 🟡 route existe, pas paginée | Faible |
| Endpoint unifié `POST /api/tasks/[id]/edit` | UX S2 | ❌ | Moyen |
| Vue matérialisée `household_today_summary` OU cache Redis | Perf | ❌ | Moyen |
| Modèle `FocusSession` (optionnel) | Persistance session S3 | ❌ | Faible |

---

## 6. Ordre recommandé & jalons

| Jalon | Sprints | Durée | Livraison | Statut |
|---|---|---|---|---|
| M1 — Home task-first utilisable | 1, 2 | ~2 sem | Beta fermée internes | ✅ S1 + S2 livrés (HomeHeader, sticky session CTA, busiest-room sort, WeekKanban accordion, TaskDetailSheet 4 onglets) |
| M2 — Focus mode complet | 3 | ~1 sem | Beta élargie | ✅ FocusSession en haut, extrait ; sync BDD volontairement skippé |
| M3 — Scale & search | 4 | ~1.5 sem | Prêt pour foyers gros | 🟡 Filtres ✅, indexes ✅, pagination API ✅, virtualisation/trigram skippés |
| M4 — Journal, Settings, Stats | 5, 6 | ~1.5 sem | UX cohérente complète | ✅ Settings ✅, Stats drawer ✅ avec activité, /app/history → 301 |
| M5 — Polish & release | 7, 8 | ~2 sem | **Release publique V3** | 🟡 onboarding ✅, a11y partiel, stress seed ✅, beacon métrique ✅, request log middleware ✅, Lighthouse + visual regression ❌ |

**Total estimé : ~8 semaines** (1 dev full-time) ou ~5 semaines avec 2 devs parallèles (M1/M4 peuvent paralléliser).

---

## 7. Métriques de succès

| KPI | Baseline (à mesurer) | Cible V3 | Statut |
|---|---|---|---|
| TTI `/app` (foyer 100 tâches) | ~2.5s estimé | < 1s | ❌ non mesuré (seed de stress dispo via `npm run db:seed:stress` pour mesurer) |
| Nb de clics pour éditer un titre de tâche | 4 (home → my-tasks → templates → modifier → dialog) | 2 (home → task card → edit template tab) | ✅ TaskDetailSheet onglet "Modèle" en 2 taps |
| Nb de clics pour ajouter une tâche simple | 6 (wizard 3 étapes) | 2 (quick-add input + submit) | ✅ Quick-add livré |
| Nb de sections visibles sur home mobile au-dessus du fold | 5-6 sections saturées | 1 (Aujourd'hui, avec action CTA) | ✅ HomeHeader + Aujourd'hui (FocusSession au-dessus si active) |
| Taux d'utilisation de la session chronométrée | ~0% (enfouie) | > 30% des sessions actives | ✅ FocusSession en haut + CTA dans onboarding ; mesurable via `session.started` (à câbler) |
| Lighthouse Performance `/app` | À mesurer | ≥ 90 | ❌ non mesuré |
| Lighthouse A11y | À mesurer | ≥ 95 | ❌ non mesuré |

---

## 8. Risques & points à arbitrer avec l'équipe

1. **Migration "my-tasks tabs" vers home + settings** : ✅ redirections 301 en place pour `?tab=templates` et `?tab=wizard`
2. **Journal supprimé** : `/app/settings/activity` existe en fallback ✅ mais la route `/app/history` n'est pas encore redirigée
3. **Dépendance Redis** pour le cache (Sprint 4) : si on ne veut pas l'ajouter, utiliser une vue matérialisée Postgres à la place (plus simple en ops, moins rapide).
4. **Feature flag V3** : pas encore mis en place — recommandation : basculer par lot (5% → 25% → 100%).
5. **Parcours non-admin vs admin** : le "tab Template" du TaskDetailSheet ne doit pas apparaître pour les membres simples. Prévoir les tests de permission.
6. **Taille des PRs** : chaque sprint = 1 PR idéalement. Dépasser 1500 lignes changées = split obligatoire.

---

## 9. Ce qui reste tel quel (intentionnellement)

- Moteur de récurrence / attribution (`src/lib/scheduling/*`) — stable, bien testé ✅
- Système PWA / push notifications — livré ✅
- CSRF / rate limiting / CSP — livré ✅
- Dark mode — livré ✅ (toggle dans le header)
- Kanban `WeekKanban` — composant prêt ✅, à intégrer en second niveau dans home (Sprint 1)

---

## 10. Dépendances entre sprints

```
S1 (Home) ──────┐
                ├── S3 (Focus Mode, dépend de home refondue)
S2 (Detail) ────┤
                ├── S6 (Stats drawer, récupère ce qui sortait de home)
S4 (Scale) ─────┘
S5 (Journal) ─── indépendant, peut tourner en parallèle
S7 (Polish) ─── après S1-S6
S8 (Release) ── après tout
```

**S1 et S2 peuvent être en parallèle si deux devs.** S3 attend S1. S4 idéalement avant S3 pour valider les perfs sous charge.

---

## Annexe A — Fichiers à créer

| Fichier | Statut |
|---|---|
| `src/components/home-header.tsx` | ✅ |
| `src/components/quick-add-bar.tsx` | ✅ |
| `src/components/task-detail-sheet.tsx` | ✅ |
| `src/components/focus-session.tsx` | ✅ (présentationnel, état dans `TaskWorkspaceClient`) |
| `src/components/recent-activity-feed.tsx` | ✅ |
| `src/components/stats-drawer.tsx` | ✅ |
| `src/app/api/tasks/[id]/edit/route.ts` | 🟡 décision : routes existantes par action gardées (validation/permissions par route) |
| `src/app/api/occurrences/route.ts` (paginated) | ✅ cursor + limit + status + memberId |
| `src/app/api/sessions/ping/route.ts` | ❌ décision : localStorage + cross-tab sync suffisent |
| `src/app/api/metrics/route.ts` (UX beacon) | ✅ |
| `src/lib/use-ux-event.ts` + `src/components/ux-event-tracker.tsx` | ✅ |
| `prisma/seed-stress.ts` | ✅ (`npm run db:seed:stress`) |
| `prisma/migrations/YYYYMMDD_add_scale_indexes/migration.sql` | ✅ indexes déjà en place dans `schema.prisma` |

## Annexe B — Fichiers à refondre

| Fichier | Statut |
|---|---|
| `src/app/app/page.tsx` | ✅ `HomeHeader` + `StatsDrawer` + `WeekKanban` accordion |
| `src/components/task-workspace-client.tsx` (extraction Focus mode) | ✅ FocusSession extraite, rendue en haut, filtres En retard / Par assigné ajoutés |
| `src/components/occurrence-card.tsx` (carte cliquable + routing) | ✅ ouvre `TaskDetailSheet` unifié au clic ; refactor ~780 → ~290 lignes |
| `src/app/app/my-tasks/page.tsx` (→ redirections) | ✅ |
| `src/app/app/history/page.tsx` (→ `/app/settings/activity`) | ✅ redirect server-side avec préservation des params |
| `src/app/app/settings/*` (restructuration IA) | ✅ Foyer/Moi en place |
| `src/components/app-shell.tsx` (nav 3 items) | ✅ mobile + desktop : 3 items partagés |
| `src/lib/households.ts` (fenêtre 7j) | 🟡 garde fenêtre `[today−30, today+30]` ; les indexes DB rendent la query rapide. Réduction à 7j gardée pour S8 si métriques montrent un goulot. |

## Annexe C — Tests E2E à ajouter

| Test | Statut |
|---|---|
| `quickAddOccurrenceFromHome` | ❌ |
| `sessionCtaOpensChronometer` | ❌ |
| `taskDetailSheetCoversAllActions` | ❌ |
| `editTemplateFromOccurrenceSheet` | ❌ |
| `seeLast5RunsOfTask` | ❌ |
| `runSessionCyclesThroughRoomTasks` | ❌ |
| `sessionResumeAfterReload` | ❌ |
| `searchFindsTaskWithFuzzyMatch` | ❌ |
| `paginationLoadsMoreOccurrences` | ❌ |
| `statsDrawerShowsAllMetrics` | ❌ |
| `settingsHasTwoSections` | ❌ |
| `recentActivityVisibleFromDrawer` | ❌ |
