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

### Sprint 3 — Focus Mode / Session par pièce 🟡

**Objectif** : transformer le chronomètre en CTA première classe et le polir.

**Livrables** :

1. 🟡 **CTA permanente en home**
   - ✅ Bouton "Lancer une session" existe dans `TaskWorkspaceClient`
   - ❌ Pas en position sticky en haut de la focus zone ; pas de reprise visuelle "Session en cours · {room} · {elapsed}" au premier plan

2. 🟡 **Flux de démarrage amélioré**
   - ✅ Sélecteur de pièces implémenté
   - 🟡 Sheet plein écran avec compteur i/n et liste des tâches restantes — présent mais pas refactorisé en `focus-session.tsx`
   - ✅ Résumé (durée totale, tâches faites/sautées) à la fin de session
   - ❌ `src/components/focus-session.tsx` n'existe pas (logique toujours dans `TaskWorkspaceClient`)

3. 🟡 **Persistance robuste**
   - ✅ Session en localStorage avec sync cross-tab
   - ❌ Sync BDD via `POST /api/sessions/ping` — absent, `FocusSession` n'est pas dans le schéma Prisma
   - ❌ Bandeau de reprise au login

4. ❌ **Report automatique des minutes réelles** — `actualMinutes` pas pré-rempli depuis elapsed

**Critères d'acceptation** :
- 🟡 Session de 3 tâches faisable en < 5 taps (fonctionne mais UX non optimisée)
- 🟡 Session persiste à travers reload (localStorage uniquement, pas BDD)
- ❌ E2E : `runSessionCyclesThroughRoomTasks`, `sessionResumeAfterReload`

---

### Sprint 4 — Scale : search, filters, virtualization, backend 🟡

**Objectif** : rester fluide à 100+ tâches et 500+ occurrences actives.

**Livrables** :

1. ✅ **Barre de recherche persistante** — implémentée dans `TaskWorkspaceClient`

2. 🟡 **Filtres rapides**
   - ✅ `Mes tâches` / `Tout le foyer` — en place (segmented control)
   - ❌ Filtres `Par pièce` / `Par assigné` / `En retard seulement` — absents
   - ✅ Filtre par membre sur le **calendrier** — ajouté

3. ❌ **Virtualisation** — `@tanstack/react-virtual` pas installé, pas de virtualisation des listes

4. 🟡 **Backend — Pagination**
   - ✅ `GET /api/occurrences` existe (`src/app/api/occurrences/route.ts`)
   - ❌ Pas de cursor/limit — renvoie toutes les occurrences sans pagination
   - ❌ `getCurrentHouseholdContext` charge encore tout, pas de fenêtre 7j

5. ❌ **Backend — Indexes DB**
   - ❌ Pas d'index composite `(householdId, scheduledDate, status)` sur `TaskOccurrence`
   - ❌ Pas d'index `(householdId, createdAt)` sur `ActionLog`
   - ❌ Pas d'index trigram sur `TaskTemplate.title`

6. ❌ **Backend — Projections calculées** — pas de vue matérialisée ni cache Redis

7. ❌ **Frontend — Chargement progressif** — pas de Suspense skeleton sur "À venir" / "Kanban"

**Critères d'acceptation** :
- ❌ TTI < 1s avec 200 templates / 1000 occurrences
- ❌ Recherche floue `pousiere` → "Poussière meubles" en < 200ms
- ❌ E2E : `searchFindsTaskWithFuzzyMatch`, `paginationLoadsMoreOccurrences`

---

### Sprint 5 — Journal / Activité 🟡

**Livrables** :

1. ✅ **Composant `RecentActivityFeed`** — `src/components/recent-activity-feed.tsx` implémenté, intégré en home et dans settings/activity

2. ❌ **Retrait de "Historique" de la nav principale** — `/app/history` est encore accessible depuis le shell desktop ; non retiré de la nav mobile (mais "Historique" n'est pas dans `mobileMainTabs` — c'est dans le "Plus" sheet)

3. ❌ **301 de `/app/history` vers `/app/settings/activity`** — la page history existe encore à sa route d'origine sans redirection

4. ❌ **Section "Dernières activités" dans le drawer Stats** — le `StatsDrawer` a ses propres sections, le feed activité n'y est pas intégré

**Critères d'acceptation** :
- 🟡 Un non-admin ne voit pas "Historique" dans la nav mobile (retiré de `mobileMainTabs`) ✅ mais encore dans "Plus" sheet
- ✅ Feed en langage naturel "{qui} a {verbe} {tâche} il y a {X}"
- ❌ E2E : `recentActivityVisibleFromDrawer`

---

### Sprint 6 — Stats drawer & Settings consolidés 🟡

**Livrables** :

1. ✅ **Drawer "Statistiques"** — `src/components/stats-drawer.tsx` implémenté (128 lignes), intégré dans `src/app/app/page.tsx` via icône BarChart2
   - ✅ Section "Mes chiffres" (streak, métriques personnelles)
   - ✅ Section "Foyer" (charge par membre)
   - ❌ Section "Activité récente" dans le drawer — absente (feed dans home mais pas dans le drawer)

2. ✅ **`/app/settings` refondu** — structure Foyer / Moi en place avec sous-panneaux : team, access, planning, tasks, notifications, integrations, danger, households, activity

3. ✅ **Toggle thème dans le header** — toggle dark/light/system dans le header mobile et la sidebar desktop (pas dans un "menu user" dédié mais accessible en ≤ 1 tap)

**Critères d'acceptation** :
- ✅ Depuis le home, une métrique est à 1 tap (icône drawer)
- 🟡 Les données stats ne vivent plus dans home — les rolling metrics + metric strip sont encore présentes
- ❌ E2E : `statsDrawerShowsAllMetrics`, `settingsHasTwoSections`

---

### Sprint 7 — Polish, a11y, onboarding ré-aligné 🟡

**Livrables** :

1. 🟡 **Onboarding wizard V2**
   - ✅ Étape "Choisissez un pack" (Couple / Coloc / Famille / Personnalisé) — implémentée
   - 🟡 Étapes Nommez / Ajoutez tâches / Invitez / Fin — présentes mais pas dans l'ordre cible V3
   - ❌ CTA finale "Lancer votre première session" → Focus Mode — absent

2. 🟡 **A11y**
   - ✅ `aria-live="polite"` sur les zones dynamiques (occurrence count, filtered count)
   - ❌ Audit contrast WCAG AA complet sur `var(--ink-500)` non fait
   - ❌ Focus trap dans BottomSheet et Dialog non vérifié systématiquement
   - ❌ Landmarks `<main>`, `<nav>`, `<aside>` pas systématiques

3. ❌ **Touch targets mobile** — audit 44×44px non fait

4. ❌ **Empty states** — pas d'illustrations + CTA dédiées pour les zones vides

**Critères d'acceptation** :
- ❌ Lighthouse Accessibility ≥ 95
- ❌ Parcours au lecteur d'écran

---

### Sprint 8 — Scale validation, monitoring, release ❌

**Objectif** : valider sous charge, instrumenter, déployer.

**Livrables** :

1. ❌ **Seed de stress** — `npm run db:seed:stress` n'existe pas

2. ❌ **Métriques UX** — events `home.rendered`, `quick_add.submitted`, etc. non émis ; pas de Plausible ou équivalent

3. ❌ **Observabilité serveur** — `src/lib/logger.ts` existe mais pas de mesure P50/P95/P99 par route

4. 🟡 **Tests de non-régression**
   - ✅ Suite E2E existante (73 tests unitaires + `tests/e2e/`)
   - ❌ Viewport mobile (390×844) non testé en E2E
   - ❌ Visual regression (Playwright screenshots) absente

5. ❌ **Déploiement progressif** — pas de feature flag `ux_v3_enabled`

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
| M2 — Focus mode complet | 3 | ~1 sem | Beta élargie | 🟡 Session fonctionne, sync BDD ❌ |
| M3 — Scale & search | 4 | ~1.5 sem | Prêt pour foyers gros | 🟡 Search ✅, pagination ❌, indexes ❌ |
| M4 — Journal, Settings, Stats | 5, 6 | ~1.5 sem | UX cohérente complète | 🟡 Settings ✅, Stats drawer ✅, history route ❌ |
| M5 — Polish & release | 7, 8 | ~2 sem | **Release publique V3** | ❌ |

**Total estimé : ~8 semaines** (1 dev full-time) ou ~5 semaines avec 2 devs parallèles (M1/M4 peuvent paralléliser).

---

## 7. Métriques de succès

| KPI | Baseline (à mesurer) | Cible V3 | Statut |
|---|---|---|---|
| TTI `/app` (foyer 100 tâches) | ~2.5s estimé | < 1s | ❌ non mesuré |
| Nb de clics pour éditer un titre de tâche | 4 (home → my-tasks → templates → modifier → dialog) | 2 (home → task card → edit template tab) | ❌ TaskDetailSheet manquant |
| Nb de clics pour ajouter une tâche simple | 6 (wizard 3 étapes) | 2 (quick-add input + submit) | ✅ Quick-add livré |
| Nb de sections visibles sur home mobile au-dessus du fold | 5-6 sections saturées | 1 (Aujourd'hui, avec action CTA) | ❌ encore plusieurs sections |
| Taux d'utilisation de la session chronométrée | ~0% (enfouie) | > 30% des sessions actives | 🟡 bouton visible mais pas first-class |
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
| `src/components/focus-session.tsx` | ❌ (logique dans `TaskWorkspaceClient`) |
| `src/components/recent-activity-feed.tsx` | ✅ |
| `src/components/stats-drawer.tsx` | ✅ |
| `src/app/api/tasks/[id]/edit/route.ts` | ❌ |
| `src/app/api/occurrences/route.ts` (paginated) | 🟡 route existe, pas paginée |
| `src/app/api/sessions/ping/route.ts` | ❌ |
| `prisma/migrations/YYYYMMDD_add_scale_indexes/migration.sql` | ❌ |

## Annexe B — Fichiers à refondre

| Fichier | Statut |
|---|---|
| `src/app/app/page.tsx` | ✅ `HomeHeader` + `StatsDrawer` + `WeekKanban` accordion |
| `src/components/task-workspace-client.tsx` (extraction Focus mode) | 🟡 session fonctionne, header allégé, pas extrait dans `focus-session.tsx` |
| `src/components/occurrence-card.tsx` (carte cliquable + routing) | ✅ ouvre `TaskDetailSheet` unifié au clic ; refactor ~780 → ~290 lignes |
| `src/app/app/my-tasks/page.tsx` (→ redirections) | ✅ |
| `src/app/app/history/page.tsx` (→ `/app/settings/activity`) | ❌ redirection non mise en place |
| `src/app/app/settings/*` (restructuration IA) | ✅ Foyer/Moi en place |
| `src/components/app-shell.tsx` (nav 3 items) | ✅ mobile 3 items ; desktop sidebar encore avec Historique |
| `src/lib/households.ts` (fenêtre 7j) | ❌ charge encore tout |

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
