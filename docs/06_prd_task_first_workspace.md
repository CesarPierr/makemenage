# PRD — Refonte task-first de MakeMenage

## 1. Résumé

MakeMenage doit passer d'une application "dashboard + statistiques + navigation éclatée" à une application "ouvrir, voir quoi faire, agir, finir".

La promesse produit cible devient :

- arriver sur une seule page claire ;
- comprendre immédiatement quoi faire maintenant ;
- pouvoir lancer, terminer, déplacer ou modifier une tâche sans changer de contexte ;
- garder la puissance actuelle de planification, d'équité et de configuration, mais hors du chemin principal.

Le point d'entrée authentifié `/app` devient donc la surface `Aujourd'hui`.

## 2. Problème actuel

### 2.1 Problèmes UX

- l'information utile est noyée entre métriques, vues annexes, sous-pages et quick actions ;
- l'utilisateur doit comprendre plusieurs concepts dès l'arrivée : dashboard, mes tâches, calendrier, historique, réglages ;
- l'édition des tâches est fragmentée entre occurrence, récurrence, overrides et réglages ;
- l'historique existe, mais n'apporte pas assez de valeur quotidienne pour justifier une place de premier plan ;
- la navigation mobile reste plus simple qu'avant, mais pas encore assez directe pour un usage quotidien.

### 2.2 Problèmes produit

- l'app ne vend pas assez clairement son bénéfice principal : "faire les tâches du foyer avec le moins de friction possible" ;
- les bénéfices avancés (équité, répartition, calendrier, commentaires) arrivent trop tôt ;
- l'expérience n'est pas encore pensée pour un foyer avec 100 tâches actives et environ 10 tâches par jour.

### 2.3 Problèmes techniques et structurels

- trop de données sont chargées via un contexte household large puis re-filtrées en mémoire ;
- les mutations client ne sont pas encore homogènes ;
- certains formulaires utilisent encore des rechargements complets ;
- les concepts métier `TaskTemplate`, `TaskOccurrence`, overrides manuels et régénération sont solides, mais mal exposés côté UX.

## 3. Vision cible

### 3.1 Positionnement

MakeMenage doit ressembler à un compagnon quotidien calme et utile, pas à un centre de contrôle.

### 3.2 Principe directeur

Priorité absolue :

1. voir les tâches ;
2. agir sur les tâches ;
3. comprendre les conséquences ;
4. planifier ensuite ;
5. administrer en dernier.

### 3.3 Nouvelle architecture produit

- `Aujourd'hui` : surface principale, orientée exécution.
- `Planifier` : calendrier, bibliothèque de tâches, absences, charge future, activité approfondie.
- `Réglages` : foyers, équipe, accès, intégrations, notifications.
- `Activité` : soit panneau secondaire, soit entrée dans `Plus`, mais plus une destination primaire.

## 4. Objectifs

### 4.1 Objectifs produit

- réduire le temps entre ouverture de l'app et première action utile ;
- rendre l'app adoptable par un public large via simplicité et clarté ;
- rendre toutes les tâches consultables, cliquables, modifiables et supprimables avec des conséquences explicites ;
- introduire un mode `En cours` avec chronométrage réel ;
- conserver les possibilités avancées de planification et de configuration.

### 4.2 Objectifs UX

- une seule page principale pour l'usage quotidien ;
- hiérarchie visuelle centrée sur les tâches ;
- langage plus naturel et moins "outil de gestion" ;
- accessibilité claire sur mobile et desktop ;
- règles d'édition compréhensibles : cette fois / les prochaines fois.

### 4.3 Objectifs techniques

- APIs dédiées par usage au lieu d'un gros contexte global ;
- pagination, recherche et filtres pour supporter les gros volumes ;
- mutations homogènes avec feedback toast et rafraîchissement ciblé ;
- persistance d'une session de tâche en cours ;
- couverture de test explicite sur les effets de planification.

## 5. Non-objectifs

- ne pas réécrire le moteur de scheduling en profondeur ;
- ne pas supprimer les réglages détaillés déjà utiles ;
- ne pas ajouter tout de suite de collaboration temps réel multi-utilisateur ;
- ne pas transformer la V1 en outil de reporting avancé ou de gamification lourde.

## 6. Utilisateurs cibles

### 6.1 Cœur de cible

- couples ;
- colocations ;
- familles petites et moyennes ;
- utilisateurs qui veulent un usage quotidien simple sur mobile.

### 6.2 Utilisateurs secondaires

- foyers avec beaucoup de routines ;
- utilisateurs sensibles à l'équité de répartition ;
- profils organisateurs qui veulent garder un contrôle fin.

## 7. Nouvelle information architecture

## 7.1 Navigation globale

- `Aujourd'hui`
- `Planifier`
- `Réglages`
- `Plus`
  - `Activité`
  - éventuellement `Aide`

## 7.2 Aujourd'hui

Ordre des sections :

1. `À faire maintenant`
2. `En cours`
3. `Ensuite`
4. `Toutes les tâches`

Règles :

- la première viewport mobile doit montrer les tâches, pas les stats ;
- les métriques doivent être secondaires, compactes et facultatives ;
- tout item de tâche ouvre la même surface de détail.

## 7.3 Planifier

Sous-sections :

- `Calendrier`
- `Bibliothèque de tâches`
- `Absences et rééquilibrage`
- `Activité` si elle reste page dédiée

## 7.4 Réglages

Sous-sections conservées :

- `Foyers`
- `Équipe`
- `Accès`
- `Intégrations`
- `Notifications`
- `Zone sensible`

## 8. Expériences clés

## 8.1 Parcours quotidien principal

1. l'utilisateur ouvre l'app ;
2. il voit immédiatement ce qui est à faire maintenant ;
3. il clique une tâche ;
4. il termine, saute, reporte ou réattribue ;
5. la liste se met à jour sans le sortir de son flux ;
6. il peut enchaîner avec la suivante ou lancer une séquence par pièce.

## 8.2 Détail d'une tâche

Le panneau de détail doit permettre :

- terminer ;
- terminer avec temps réel ;
- passer ;
- faire plus tard ;
- changer la personne ;
- ajouter un commentaire ;
- voir l'activité liée ;
- modifier cette fois seulement ;
- modifier la routine ;
- retirer la routine ou annuler seulement cette occurrence.

## 8.3 Tâche en cours

L'utilisateur peut :

- lancer une tâche seule ;
- lancer une séquence de tâches dans une pièce ;
- voir le chronomètre ;
- mettre en pause ;
- reprendre ;
- terminer ;
- transmettre le temps réel à la tâche terminée.

## 8.4 Gestion d'une routine

L'utilisateur admin doit pouvoir :

- rechercher une routine ;
- en modifier le titre, la pièce, la durée, le rythme, la logique d'attribution ;
- comprendre si les prochaines tâches déjà modifiées à la main seront conservées ou écrasées ;
- archiver la routine ;
- supprimer seulement le futur si nécessaire.

## 9. Exigences fonctionnelles

### 9.1 Workspace quotidien

- vue triée par urgence puis par pièce ;
- filtres par pièce, statut et assigné ;
- regroupement lisible des retards ;
- liste complète consultable sans quitter la page ;
- recherche rapide.

### 9.2 Détail unifié

- composant unique mobile/desktop ;
- actions contextualisées selon le statut ;
- informations minimales toujours visibles : titre, pièce, personne, durée prévue, état, prochain impact.

### 9.3 Mode en cours

- au plus une session active par membre à la fois au lancement initial ;
- reprise après refresh ;
- temps réel facultatif mais simple ;
- possibilité d'enchaîner pièce par pièce.

### 9.4 Activité

- vue légère des dernières validations, sauts, reports, réattributions, commentaires ;
- accès depuis le détail d'une tâche ;
- utilité pratique de suivi, pas une page décorative.

### 9.5 Échelle

- support explicite de 100 tâches actives ;
- environ 10 tâches par jour sans surcharge visuelle ;
- listes longues avec pagination ou virtualisation ;
- backend ciblé par usage.

## 10. Contraintes métier

- distinguer clairement `routine` et `cette fois seulement` ;
- ne jamais écraser un override manuel sans choix explicite ;
- préserver l'historique des actions et commentaires ;
- garder la cohérence avec `TaskTemplate`, `TaskOccurrence`, `isManuallyModified`, et les services de sync existants ;
- ne pas réintroduire de bugs de date/timezone.

## 11. KPIs de succès

- temps médian ouverture -> première action < 20 secondes ;
- part des sessions où une tâche est terminée depuis `Aujourd'hui` ;
- baisse du taux de navigation vers d'autres pages avant première action ;
- taux d'usage du mode `En cours` ;
- baisse des abandons pendant l'onboarding ;
- satisfaction qualitative sur clarté et simplicité.

## 12. Découpage de livraison

### Phase A — Recentrage navigation

- `/app` devient `Aujourd'hui` ;
- retrait du dashboard actuel comme concept principal ;
- historique retiré de la navigation primaire.

### Phase B — Workspace quotidien

- nouvelles sections `À faire maintenant`, `En cours`, `Ensuite`, `Toutes les tâches` ;
- premières APIs dédiées.

### Phase C — Détail unifié

- toutes les cartes cliquables ;
- panneau de détail unique ;
- actions centralisées.

### Phase D — Bibliothèque de tâches

- déplacement de la gestion des routines dans `Planifier` ;
- recherche, filtres, archive et édition explicite.

### Phase E — Sessions de tâche en cours

- modèle persistant ;
- chronomètre ;
- séquences par pièce.

### Phase F — Activité et hardening

- refonte du journal ;
- performance, observabilité, tests de charge UX.

## 13. Questions ouvertes

- faut-il garder `Activité` comme page ou comme panneau dans `Planifier` ?
- veut-on autoriser plusieurs sessions actives en parallèle dès la V1 du mode timer ?
- faut-il introduire une vraie notion de priorité visible par l'utilisateur, ou rester sur urgence et date ?
- faut-il exposer la charge/fairness sur `Aujourd'hui` ou la laisser uniquement dans `Planifier` ?

