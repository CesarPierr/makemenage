# MakeMenage V3 — Plan de refonte UX "Task-First"

## 0. Contexte & objectif

L'app couvre déjà toutes les fonctionnalités métier (récurrence, rotation équitable, historique, absences, comptes partagés, notifications, dark mode, PWA, Kanban). **Le problème n'est plus fonctionnel, il est perceptif** : trop d'informations concurrentes, la tâche à faire ne saute pas aux yeux, la surface d'action est fragmentée (3 onglets, 5 panneaux settings, 5 routes de nav), et l'ergonomie ne tient plus au-delà de ~30 tâches par foyer.

**Objectif V3** : une app *task-first*, lisible du premier coup d'œil, qui scale jusqu'à 100+ tâches, et qui rend chaque action (complete, skip, reschedule, reassign, edit, delete) atteignable en ≤ 2 taps sur n'importe quelle surface.

---

## 1. Audit de l'existant (avril 2026)

### 1.1 Surfaces actuelles

| Route | Rôle théorique | Taille | Problème identifié |
|---|---|---|---|
| `/app` | Accueil / dashboard | `page.tsx` 141 lignes, délègue à `TaskWorkspaceClient` (696 lignes) | Le workspace client est déjà task-first (search + chronomètre + pièces), mais la route reste labellisée "dashboard" dans la nav |
| `/app/my-tasks` | Daily / Templates / Wizard | 379 lignes, 3 onglets | Duplique `/app` sur l'onglet daily ; sépare édition d'occurrence (sur daily) et édition de template (sur templates) — confusion |
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
- `/app/my-tasks?tab=daily` → **supprimé**, redirection vers `/app`
- `/app/my-tasks?tab=templates` → déplacé vers `/app/settings/tasks`
- `/app/my-tasks?tab=wizard` → gardé mais accessible uniquement comme "Ajouter une tâche complexe" depuis le quick-add
- `/app/history` → remplacé par un drawer "Activité" (voir Sprint 5)

---

## 4. Sprints — Plan d'exécution détaillé

### Sprint 1 — Accueil task-first (effort : 4-5 jours)

**Objectif** : refondre `/app` pour que 90% de la valeur soit au-dessus du fold sur mobile (375×812).

**Livrables** :

1. **Header minimal** (3 lignes max)
   - Ligne 1 : `Bonjour {prénom} · {jour}`
   - Ligne 2 : compteur `{X} à faire aujourd'hui` + `Y en retard` (liens vers les filtres)
   - Ligne 3 : barre de progression hebdo `N/M validées`
   - Plus de strip "5 metric cards" en haut — déplacés dans un drawer "Statistiques" (voir Sprint 6)

2. **Focus zone** (ce que l'utilisateur voit après le header)
   - Titre "Aujourd'hui" + bouton **"Lancer une session"** (ouvre le chronomètre par pièce — Sprint 3)
   - Liste groupée par pièce, déjà implémentée dans `TaskWorkspaceClient`
   - Tri par défaut : pièce avec le plus de tâches en premier, sauf si une tâche est en retard → remontée en haut

3. **Second niveau** (sous le fold)
   - Accordéon fermé par défaut "À venir (7 jours)" avec les occurrences futures
   - Accordéon fermé par défaut "Kanban de la semaine" (réutilise `WeekKanban`)

4. **Quick-add barre flottante**
   - Input unique `Nouvelle tâche…` + bouton → POST `/api/tasks` avec defaults (`recurrenceType: single`, assignation `round_robin`, durée 15min)
   - Lien discret "Configurer en détail" → ouvre le wizard complet

5. **Suppression**
   - Toutes les sections "Rolling completion metrics 7/14/30j" → migrées dans drawer Stats (Sprint 6)
   - Strip mobile métriques compactes → migrée dans drawer
   - Panneau "Charge de la semaine" desktop → migré dans drawer

**Critères d'acceptation** :
- Sur iPhone 13 (390×844), tout le header + le titre "Aujourd'hui" + la 1ère tâche sont visibles sans scroll
- Lighthouse Performance ≥ 90 sur `/app` avec 50 tâches
- Tests E2E : `quickAddOccurrence`, `sessionCtaOpensChronometer`, `upcomingSectionCollapsed`

**Fichiers touchés** : `src/app/app/page.tsx`, `src/components/task-workspace-client.tsx`, nouveaux : `src/components/home-header.tsx`, `src/components/quick-add-bar.tsx`

---

### Sprint 2 — Task Detail sheet unifié (effort : 5-6 jours)

**Objectif** : un clic sur le corps d'une carte d'occurrence ouvre **une seule** surface qui couvre TOUTES les actions, peu importe le rôle admin/membre.

**Livrables** :

1. **Carte cliquable entière**
   - Modifier `src/components/occurrence-card.tsx` pour que le body (hors boutons quick) soit un `<button>` qui ouvre le `TaskDetailSheet`
   - Garder les 3 quick buttons (complete / skip / more) pour l'action rapide

2. **Nouveau composant `TaskDetailSheet` (remplace les 5 bottom-sheets actuels)**
   - Header : titre tâche + pièce + durée estimée + assignation actuelle + badges statut (overridé, retard, en cours)
   - Tabs (mobile: swipeable, desktop: segmented) :
     - **Cette fois-ci** : terminer / reporter / réassigner / sauter / commenter → actions sur l'occurrence uniquement (override)
     - **Template** (admin only) : éditer titre/durée/pièce/récurrence/assignation → actions sur le template (impact futur)
     - **Historique** : 5 dernières occurrences de ce template (dates + statuts + durées réelles)
     - **Commentaires** : fil existant
   - Footer admin : bouton "Supprimer" → confirmation + checkbox "Supprimer aussi les occurrences futures modifiées"

3. **Endpoint unifié `/api/tasks/[id]/edit`**
   - Remplace les 2 paths actuels (POST `/api/tasks/:id` avec `_method=PUT` pour template, et divers `/api/occurrences/:id/...` pour occurrence)
   - Accepte un discriminator `scope: "occurrence" | "template"`
   - Retourne un payload uniforme `{ updatedOccurrence, updatedTemplate, affectedFutureCount }`

4. **Suppression du tab "templates"**
   - `/app/my-tasks?tab=templates` → 301 vers `/app/settings/tasks`
   - `/app/my-tasks?tab=daily` → 301 vers `/app`
   - `/app/my-tasks?tab=wizard` → garde, accessible depuis quick-add et `/app/settings/tasks`

**Critères d'acceptation** :
- 1 seul clic ouvre TOUT : pas de navigation vers `?tab=templates` pour éditer un titre
- Les actions "sur l'occurrence" vs "sur le template" sont visuellement distinctes (couleur, libellé, icône)
- E2E : `taskDetailSheetCoversAllActions`, `editTemplateFromOccurrenceSheet`, `seeLast5RunsOfTask`

**Fichiers touchés** : `src/components/occurrence-card.tsx`, nouveau `src/components/task-detail-sheet.tsx`, nouveau `src/app/api/tasks/[id]/edit/route.ts`, `src/app/app/my-tasks/page.tsx` (rediriger)

---

### Sprint 3 — Focus Mode / Session par pièce (effort : 4-5 jours)

**Objectif** : transformer le chronomètre déjà implémenté dans `TaskWorkspaceClient` en une CTA première classe, et le polir.

**Livrables** :

1. **CTA permanente en home**
   - Bouton sticky "🎯 Lancer une session" en haut de la focus zone
   - Si session déjà active : le bouton devient "⏸ Session en cours · {room} · {elapsed}" → tap pour reprendre

2. **Flux de démarrage amélioré**
   - Tap "Lancer une session" → sheet qui propose les pièces avec leur nb de tâches dues aujourd'hui
   - Tap une pièce → sheet plein écran avec :
     - Titre pièce + compteur "{i}/{n}"
     - Tâche courante (grande) avec timer et bouton "Pause / Suivant / Terminer"
     - Liste des tâches restantes (compactes, réordonnables par drag)
     - Bouton "Terminer la session" avec résumé (durée totale, tâches faites, sautées)

3. **Persistance robuste**
   - Déjà en localStorage, ajouter sync BDD : endpoint `POST /api/sessions/ping` toutes les 30s pour que la session survive à un crash navigateur
   - Récupération au login : bandeau "Vous aviez une session en cours dans {room} il y a {X} min. La reprendre ?"

4. **Report automatique des minutes réelles**
   - Quand l'utilisateur appuie "Terminer" sur une tâche, la durée elapsed depuis le "Suivant" précédent est pré-remplie dans `actualMinutes`
   - Confirmation rapide (1 tap) sans ouvrir le full sheet

**Critères d'acceptation** :
- Démarrer une session de 3 tâches Cuisine et les faire en < 5 taps (1 pour lancer + 1 par tâche + 1 pour finir)
- La session persiste à travers reload navigateur
- E2E : `runSessionCyclesThroughRoomTasks`, `sessionResumeAfterReload`

**Fichiers touchés** : `src/components/task-workspace-client.tsx` (extraction), nouveau `src/components/focus-session.tsx`, nouveau `src/app/api/sessions/ping/route.ts`, nouveau modèle Prisma `FocusSession` (optionnel)

---

### Sprint 4 — Scale : search, filters, virtualization, backend (effort : 5-7 jours)

**Objectif** : rester fluide à 100+ tâches et 500+ occurrences actives.

**Livrables** :

1. **Frontend**
   - Barre de recherche persistante dans home (déjà en place dans `TaskWorkspaceClient` — améliorer)
   - Filtres rapides : `Mes tâches` / `Tout` / `Par pièce` / `Par assigné` / `En retard seulement`
   - Virtualisation des listes via `@tanstack/react-virtual` quand > 30 items
   - Debounced search (300ms) côté client

2. **Backend — Pagination**
   - `GET /api/occurrences?household=&from=&to=&room=&assignee=&status=&cursor=&limit=30`
   - Remplace le fait que `getCurrentHouseholdContext` ramène tout
   - `getCurrentHouseholdContext` ne ramène plus que les occurrences actives de la fenêtre courante (aujourd'hui + 7j)

3. **Backend — Indexes DB**
   - Ajouter `@@index([householdId, scheduledDate, status])` sur `TaskOccurrence`
   - Ajouter `@@index([householdId, createdAt])` sur `ActionLog`
   - Ajouter trigram index sur `TaskTemplate.title` pour la recherche floue (`CREATE INDEX ... USING gin (title gin_trgm_ops)`)
   - Migration SQL séparée à reviewer par un humain

4. **Backend — Projections calculées**
   - Vue matérialisée ou cache Redis : `household_today_summary(householdId) → {todoCount, overdueCount, weekRate, streak}`
   - Rafraîchie via hooks Prisma après chaque complete/skip/reschedule
   - Évite de recalculer `calculateStreak()` à chaque page load

5. **Frontend — Chargement progressif**
   - `/app` SSR rend uniquement "Aujourd'hui"
   - "À venir", "Kanban semaine" chargent en `<Suspense>` avec skeleton
   - React Query ou SWR pour cache côté client

**Critères d'acceptation** :
- TTI `/app` < 1s sur foyer avec 200 templates / 1000 occurrences actives (sur machine médiane)
- Recherche floue `pousiere` trouve "Poussière meubles" en < 200ms
- E2E : `searchFindsTaskWithFuzzyMatch`, `paginationLoadsMoreOccurrences`

**Fichiers touchés** : `src/lib/households.ts`, nouveau `src/app/api/occurrences/route.ts`, `prisma/schema.prisma`, nouvelle migration SQL, `src/components/task-workspace-client.tsx`

---

### Sprint 5 — Journal / Activité — décision & implémentation (effort : 2-3 jours)

**Décision recommandée** : **supprimer** `/app/history` en tant que route principale, **remplacer** par :

1. **Section "Dernières activités" dans le drawer Stats** (voir Sprint 6)
   - Les 10 derniers events ({qui, quoi, quand}), format "Sam a validé *Vaisselle* il y a 2h"
   - Lien "Voir tout" → ancienne page history gardée en fallback

2. **Onglet "Historique" dans le `TaskDetailSheet`** (Sprint 2)
   - Les 5 dernières exécutions de *cette tâche* avec durée/statut

3. **Feed léger dans les réglages foyer** (`/app/settings/team`)
   - Permet de répondre à "qui a fait quoi récemment ?" sans ouvrir une page dédiée

**Si l'utilisateur préfère garder une vue journal complète** : la garder sous `/app/settings/activity` (derrière "Plus") plutôt qu'en nav principale.

**Livrables** :
- Nouveau composant `RecentActivityFeed`
- Retrait de "Historique" de `mobileMainTabs` et du shell desktop
- 301 de `/app/history` vers `/app/settings/activity`

**Critères d'acceptation** :
- Un utilisateur non-admin ne voit jamais "Historique" dans sa nav
- Le feed dans le drawer montre les events en langage naturel, pas `actionType: completed`
- E2E : `recentActivityVisibleFromDrawer`

---

### Sprint 6 — Stats drawer & Settings consolidés (effort : 3-4 jours)

**Objectif** : regrouper tout ce qui n'est pas une tâche dans des espaces secondaires propres.

**Livrables** :

1. **Drawer "Statistiques"**
   - Ouvert via icône 📊 en haut à droite du home
   - 3 sections : Mes chiffres (personnel) / Foyer (collectif) / Activité récente
   - Reprend les métriques 7/14/30j actuelles, la charge par membre, la streak
   - Sur desktop : ancré à droite (slide-in). Sur mobile : full-screen sheet

2. **`/app/settings` refondu**
   - Structure à 2 niveaux :
     - **Foyer** : team, access, planning (absences), tâches (ex-templates tab), intégrations, danger
     - **Moi** : profil, notifications, thème, foyers (multi-household)
   - Sidebar collapse mobile
   - Breadcrumb pour éviter de se perdre

3. **Remontée du thème dans le menu user**
   - Actuellement caché dans `/app/settings/notifications` → ajout d'un toggle rapide dans le header user menu

**Critères d'acceptation** :
- Depuis le home, une métrique est à 1 tap (icône drawer)
- Aucune donnée stats ne vit en home
- E2E : `statsDrawerShowsAllMetrics`, `settingsHasTwoSections`

---

### Sprint 7 — Polish, a11y, onboarding ré-aligné (effort : 3-4 jours)

**Objectif** : que la première session d'un nouvel utilisateur raconte l'histoire de l'app V3.

**Livrables** :

1. **Onboarding wizard V2**
   - Étape 1 "Nommez votre foyer" (skip "Bienvenue" générique)
   - Étape 2 "Choisissez un pack" (Couple / Coloc / Famille / Vide) — déjà implémenté, mieux mis en avant
   - Étape 3 "Ajoutez 1-3 tâches immédiatement" avec quick-add inline → sentiment d'achievement
   - Étape 4 "Invitez (optionnel)"
   - Fin : CTA "Lancer votre première session" → démarre le Focus Mode

2. **A11y systématique**
   - Audit contrast WCAG AA sur tous les `var(--ink-500)` et équivalents
   - Focus visible partout (inclure les BottomSheet et Dialog — focus trap à vérifier)
   - Landmarks `<main>`, `<nav>`, `<aside>` systématiques
   - `aria-live` sur tous les updates optimistes

3. **Touch targets mobile**
   - Audit : tout bouton interactif ≥ 44×44px
   - Augmenter les quick actions (complete/skip) sur les cartes mobile
   - Bottom nav bar : assurer que la zone tactile est ≥ 48px

4. **Empty states**
   - Chaque zone vide a une illustration + une CTA pertinente (pas juste "Aucune tâche")

**Critères d'acceptation** :
- Lighthouse Accessibility ≥ 95 sur `/app`, `/app/settings`, `/app/calendar`
- Tous les parcours golden passent au lecteur d'écran (VoiceOver macOS + TalkBack si possible)

---

### Sprint 8 — Scale validation, monitoring, release (effort : 3-4 jours)

**Objectif** : valider sous charge, instrumenter, déployer.

**Livrables** :

1. **Seed de stress**
   - Script `npm run db:seed:stress` qui crée un foyer avec 120 templates, 5 membres, 1500 occurrences, 800 logs
   - Tourne dans CI en "heavy E2E" (nightly)

2. **Métriques UX**
   - Analytics évents : `home.rendered`, `quick_add.submitted`, `task_detail.opened`, `session.started`, `session.completed`
   - Hooké à l'existant `src/lib/analytics.ts`
   - Dashboard Plausible ou équivalent (à définir)

3. **Observabilité serveur**
   - Durées P50/P95/P99 par route API (étendre `src/lib/logger.ts`)
   - Alerte si `getCurrentHouseholdContext` > 500ms P95

4. **Tests de non-régression**
   - E2E mobile (390×844) et desktop (1280×800) pour tous les parcours golden
   - Visual regression (optionnel, Playwright screenshots) sur home + task detail + session

5. **Déploiement progressif**
   - Feature flag `ux_v3_enabled` (cookie user ou env var) pour basculer utilisateurs en V3 par lots
   - Rollback possible en 1 commit

**Critères d'acceptation** :
- Suite E2E nightly verte
- Home < 1s TTI avec seed stress
- Rollback testé en staging

---

## 5. Backend — vue d'ensemble des changements

| Changement | Motivation | Risque |
|---|---|---|
| `TaskOccurrence` indexes `(householdId, scheduledDate, status)` | Scale S4 | Faible (migration additive) |
| `ActionLog` index `(householdId, createdAt)` | Pagination rapide | Faible |
| Trigram index sur `TaskTemplate.title` | Search S4 | Requiert extension `pg_trgm` en prod |
| `getCurrentHouseholdContext` → fenêtre 7j au lieu de tout | Perf | Moyen : refondre tous les consommateurs qui attendent toutes les occurrences |
| Nouveau endpoint `GET /api/occurrences` paginé | Scale S4 | Faible |
| Endpoint unifié `POST /api/tasks/[id]/edit` | UX S2 | Moyen : couvrir les cas de rétrocompatibilité |
| Vue matérialisée `household_today_summary` OU cache Redis | Perf | Moyen : nouvelle dépendance si Redis |
| Modèle `FocusSession` (optionnel) | Persistance session S3 | Faible |

---

## 6. Ordre recommandé & jalons

| Jalon | Sprints | Durée | Livraison |
|---|---|---|---|
| M1 — Home task-first utilisable | 1, 2 | ~2 sem | Beta fermée internes |
| M2 — Focus mode complet | 3 | ~1 sem | Beta élargie |
| M3 — Scale & search | 4 | ~1.5 sem | Prêt pour foyers gros |
| M4 — Journal, Settings, Stats | 5, 6 | ~1.5 sem | UX cohérente complète |
| M5 — Polish & release | 7, 8 | ~2 sem | **Release publique V3** |

**Total estimé : ~8 semaines** (1 dev full-time) ou ~5 semaines avec 2 devs parallèles (M1/M4 peuvent paralléliser).

---

## 7. Métriques de succès

| KPI | Baseline (à mesurer) | Cible V3 |
|---|---|---|
| TTI `/app` (foyer 100 tâches) | ~2.5s estimé | < 1s |
| Nb de clics pour éditer un titre de tâche | 4 (home → my-tasks → templates → modifier → dialog) | 2 (home → task card → edit template tab) |
| Nb de clics pour ajouter une tâche simple | 6 (wizard 3 étapes) | 2 (quick-add input + submit) |
| Nb de sections visibles sur home mobile au-dessus du fold | 5-6 sections saturées | 1 (Aujourd'hui, avec action CTA) |
| Taux d'utilisation de la session chronométrée | ~0% (enfouie) | > 30% des sessions actives |
| Lighthouse Performance `/app` | À mesurer | ≥ 90 |
| Lighthouse A11y | À mesurer | ≥ 95 |

---

## 8. Risques & points à arbitrer avec l'équipe

1. **Migration "my-tasks tabs" vers home + settings** : il faut une période de redirection propre pour ne pas casser les bookmarks utilisateurs existants. → 301 + bannière "Cette page a déménagé vers…"
2. **Journal supprimé** : certains utilisateurs (admins multi-foyer) *peuvent* tenir à la vue chronologique complète. Garder un fallback `/app/settings/activity` au lieu de tout supprimer sec.
3. **Dépendance Redis** pour le cache (Sprint 4) : si on ne veut pas l'ajouter, utiliser une vue matérialisée Postgres à la place (plus simple en ops, moins rapide).
4. **Feature flag V3** : décider *maintenant* si on bascule tout le monde d'un coup ou par lot. Recommandation : par lot (5% → 25% → 100%).
5. **Parcours non-admin vs admin** : le "tab Template" du TaskDetailSheet ne doit pas apparaître pour les membres simples. Prévoir les tests de permission.
6. **Taille des PRs** : chaque sprint = 1 PR idéalement. Dépasser 1500 lignes changées = split obligatoire.

---

## 9. Ce qui reste tel quel (intentionnellement)

- Moteur de récurrence / attribution (`src/lib/scheduling/*`) — stable, bien testé
- Système PWA / push notifications — livré, ne pas toucher
- CSRF / rate limiting / CSP — livré, ne pas toucher
- Dark mode — livré, bouger juste le toggle dans le menu user
- Kanban `WeekKanban` — gardé, déplacé en second niveau sur home

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

- `src/components/home-header.tsx`
- `src/components/quick-add-bar.tsx`
- `src/components/task-detail-sheet.tsx`
- `src/components/focus-session.tsx`
- `src/components/recent-activity-feed.tsx`
- `src/components/stats-drawer.tsx`
- `src/app/api/tasks/[id]/edit/route.ts`
- `src/app/api/occurrences/route.ts` (paginated)
- `src/app/api/sessions/ping/route.ts`
- `prisma/migrations/YYYYMMDD_add_scale_indexes/migration.sql`

## Annexe B — Fichiers à refondre

- `src/app/app/page.tsx`
- `src/components/task-workspace-client.tsx` (extraction Focus mode)
- `src/components/occurrence-card.tsx` (carte cliquable + routing vers detail sheet)
- `src/app/app/my-tasks/page.tsx` (→ redirections)
- `src/app/app/history/page.tsx` (→ `/app/settings/activity`)
- `src/app/app/settings/*` (restructuration IA)
- `src/components/app-shell.tsx` (nav 3 items)
- `src/lib/households.ts` (fenêtre 7j)

## Annexe C — Tests E2E à ajouter

- `quickAddOccurrenceFromHome`
- `sessionCtaOpensChronometer`
- `taskDetailSheetCoversAllActions`
- `editTemplateFromOccurrenceSheet`
- `seeLast5RunsOfTask`
- `runSessionCyclesThroughRoomTasks`
- `sessionResumeAfterReload`
- `searchFindsTaskWithFuzzyMatch`
- `paginationLoadsMoreOccurrences`
- `statsDrawerShowsAllMetrics`
- `settingsHasTwoSections`
- `recentActivityVisibleFromDrawer`
