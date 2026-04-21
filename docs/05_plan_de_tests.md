# Plan de tests

## 1. Objectif

Construire une suite de test progressive et fiable pour valider les fonctionnalités de l'application du plus simple au plus complexe, avec un accent particulier sur la logique métier de récurrence, d'attribution, d'équilibrage et d'exceptions.

## 2. Pyramide de tests recommandée

### 2.1 Tests unitaires
Couvrent les fonctions pures :
- calcul de prochaine occurrence ;
- génération de séries de dates ;
- choix de l'assigné ;
- calcul des métriques.

### 2.2 Tests d'intégration
Couvrent :
- API + DB ;
- permissions ;
- persistance des modifications ;
- cohérence du moteur avec les modèles.

### 2.3 Tests E2E
Couvrent les parcours utilisateur réels :
- création du foyer ;
- création de tâche ;
- validation d'occurrence ;
- visualisation calendrier ;
- répartition automatique.

### 2.4 Tests non fonctionnels
- responsive ;
- sécurité de base ;
- performance de génération ;
- robustesse de déploiement.

## 3. Environnements de test

Prévoir :
- unitaires en mémoire ;
- intégration sur PostgreSQL de test ;
- E2E sur environnement applicatif jetable Dockerisé.

## 4. Données de test

Créer des fixtures progressives :

### Fixture A — Couple simple
- Alice
- Bob
- 1 tâche alternée toutes les 2 semaines

### Fixture B — Colocation 3 personnes
- A, B, C
- tâches de durées variées
- répartition round-robin + équilibrage

### Fixture C — Famille
- 4 membres
- tâches fixes, tournantes, reportées
- absences et exceptions

## 5. Plan de tests par niveau

## 5.1 Niveau 1 — Fondations simples

### Tests unitaires
- création valide d'une règle quotidienne ;
- création valide d'une règle "tous les 14 jours" ;
- rejet d'une règle invalide ;
- calcul correct de la prochaine date ;
- affichage humain de la règle.

### Tests d'intégration
- création d'un utilisateur ;
- login/logout ;
- création d'un foyer ;
- isolation inter-foyers.

### Tests E2E
- un utilisateur s'inscrit, crée un foyer, voit le dashboard vide.

## 5.2 Niveau 2 — CRUD métier

### Tests unitaires
- sérialisation et validation d'un template de tâche ;
- validation des membres éligibles ;
- cohérence des champs obligatoires.

### Tests d'intégration
- création d'une tâche template ;
- mise à jour du titre sans casser la règle ;
- suppression logique ou désactivation propre.

### Tests E2E
- création d'une tâche hebdomadaire depuis l'UI ;
- affichage dans la liste.

## 5.3 Niveau 3 — Génération d'occurrences

### Tests unitaires
- génération de 5 occurrences quotidiennes ;
- génération toutes les 2 semaines ;
- génération mensuelle simple ;
- respect de la date de fin ;
- aucune duplication sur régénération.

### Tests d'intégration
- job de génération sur fenêtre glissante ;
- insertion en base ;
- idempotence sur second passage ;
- non-destruction d'une occurrence déjà complétée.

### Tests E2E
- création d'une tâche, lancement de génération, affichage des occurrences futures.

## 5.4 Niveau 4 — Assignation basique

### Tests unitaires
- fixed attribue toujours au même membre ;
- manual laisse non assigné ;
- alternance stricte A/B produit A, B, A, B ;
- round-robin A/B/C produit A, B, C, A.

### Tests d'intégration
- assignation des occurrences générées ;
- persistance de l'assigné en base ;
- affichage cohérent dans les listes.

### Tests E2E
- création d'une tâche alternée ;
- vérification visuelle que les occurrences alternent correctement.

## 5.5 Niveau 5 — Actions sur occurrence

### Tests unitaires
- passage `planned -> completed` ;
- skip met le bon statut ;
- report modifie la date prévue ;
- réassignation change l'assigné sans casser l'occurrence.

### Tests d'intégration
- complétion en base ;
- création de logs d'action ;
- recalcul des métriques simples ;
- non-impact sur le template.

### Tests E2E
- marquer une tâche comme faite ;
- reporter une tâche ;
- vérifier l'historique.

## 5.6 Niveau 6 — Calendrier et export

### Tests unitaires
- mapping occurrence -> événement calendrier ;
- sérialisation ICS valide.

### Tests d'intégration
- endpoint ICS renvoie un flux correct ;
- filtres par membre appliqués.

### Tests E2E
- affichage de la vue calendrier ;
- présence des occurrences ;
- changement de filtre.

## 5.7 Niveau 7 — Indicateurs de charge

### Tests unitaires
- somme des minutes estimées ;
- somme par membre ;
- calcul écart à la répartition idéale ;
- calcul du taux de complétion.

### Tests d'intégration
- endpoint analytics sur fixture de couple ;
- cohérence des résultats avec les occurrences réelles.

### Tests E2E
- dashboard affiche une charge distincte pour Alice et Bob.

## 5.8 Niveau 8 — Auto-répartition avancée

### Tests unitaires
- `least_assigned_count` choisit le membre avec le moins de tâches ;
- `least_assigned_minutes` choisit le membre avec le moins de minutes ;
- tie-break stable en cas d'égalité ;
- fenêtre de 14 jours respectée.

### Tests d'intégration
- génération de plusieurs occurrences avec équilibrage ;
- résultat déterministe à données identiques ;
- prise en compte des tâches déjà présentes.

### Tests E2E
- configurer l'auto-répartition ;
- constater la distribution correcte sur le planning.

## 5.9 Niveau 9 — Absences et exceptions

### Tests unitaires
- membre absent ignoré si fallback activé ;
- membre absent conservé si fallback désactivé ;
- skip avec conservation de rotation ;
- report sans destruction d'historique.

### Tests d'intégration
- déclaration d'absence ;
- génération/réassignation sur plage concernée ;
- logs explicites.

### Tests E2E
- déclarer Bob absent ;
- vérifier que la tâche prévue lui est réattribuée ou signalée selon le paramètre.

## 5.10 Niveau 10 — Tests complexes métier

### Scénario complexe 1
Couple A/B, tâche toutes les 2 semaines, alternance stricte, 6 occurrences.
Attendu :
- séquence A/B/A/B/A/B.

### Scénario complexe 2
Même scénario, occurrence 2 sautée, option `preserve_rotation_on_skip = true`.
Attendu :
- rotation logique inchangée pour l'occurrence 3.

### Scénario complexe 3
Trois membres, équilibrage par minutes, tâches de 10, 20, 45 minutes.
Attendu :
- répartition compatible avec la minimisation du déséquilibre.

### Scénario complexe 4
Membre absent sur une plage, fallback activé.
Attendu :
- le système choisit un autre membre éligible.

### Scénario complexe 5
Template modifié en cours de vie.
Attendu :
- passé intact ;
- futur non verrouillé recalculé ;
- occurrences reportées conservées.

### Scénario complexe 6
Deux foyers distincts, même utilisateur présent dans un seul.
Attendu :
- aucune fuite de données.

## 6. Tests de sécurité

### À couvrir
- refus d'accès à un foyer tiers ;
- protection des endpoints auth ;
- validation serveur des formulaires ;
- tentative de modification d'occurrence hors permissions ;
- rate limiting sur login si implémenté.

## 7. Tests responsive

### Viewports minimum
- 390x844
- 768x1024
- 1280x800

### Parcours à tester
- dashboard ;
- liste des tâches ;
- création/édition d'une tâche ;
- vue calendrier ;
- marquer une tâche comme faite.

## 8. Tests de performance

### Génération
- 100 tâches templates ;
- horizon de 60 jours ;
- pas de duplication ;
- temps acceptable.

### UI
- chargement d'une semaine dense ;
- affichage calendrier avec filtres.

## 9. Outils recommandés

- Vitest ou Jest pour unitaires ;
- Supertest ou équivalent pour API ;
- Playwright pour E2E ;
- tests Dockerisés en CI.

## 10. Ordre de mise en place recommandé

1. unitaires de dates et récurrence ;
2. intégration auth/foyer ;
3. unitaires assignation ;
4. intégration génération ;
5. E2E parcours de base ;
6. analytics ;
7. absences/exceptions ;
8. régression complète avant release.

## 11. Définition de couverture minimale

### Avant V1
- couverture très forte sur moteur métier ;
- couverture raisonnable sur API ;
- E2E sur parcours critiques.

### Parcours critiques obligatoires
- s'inscrire / se connecter ;
- créer foyer ;
- ajouter membre ;
- créer tâche alternée ;
- générer occurrences ;
- marquer comme fait ;
- reporter ;
- voir calendrier ;
- consulter indicateurs de charge.

