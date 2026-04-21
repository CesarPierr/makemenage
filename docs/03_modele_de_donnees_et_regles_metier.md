# Modèle de données et règles métier

## 1. Principes métier

Le modèle doit séparer clairement :

- la définition d'une tâche récurrente ;
- sa planification dans le temps ;
- son mode d'attribution ;
- les occurrences concrètes générées ;
- l'exécution réelle et son historique.

Cette séparation évite les effets de bord lors des changements de règles.

## 2. Entités principales

## 2.1 User
Compte authentifié.

### Champs suggérés
- id
- email
- password_hash
- display_name
- created_at
- updated_at
- last_login_at

## 2.2 Household
Groupe logique de travail.

### Champs suggérés
- id
- name
- timezone
- created_by_user_id
- created_at
- updated_at

## 2.3 HouseholdMember
Lien utilisateur <-> foyer, ou membre invité non encore activé si on veut le supporter.

### Champs suggérés
- id
- household_id
- user_id nullable si invitation non finalisée
- display_name
- color
- role
- is_active
- weighting_factor
- weekly_capacity_minutes nullable
- created_at
- updated_at

## 2.4 MemberAvailability
Disponibilités ou absences.

### Champs suggérés
- id
- member_id
- type (`weekly_rule`, `date_range_absence`)
- weekdays nullable
- start_date
- end_date
- notes

## 2.5 TaskTemplate
Définition source de la tâche.

### Champs suggérés
- id
- household_id
- title
- description
- category
- room
- tags json
- estimated_minutes
- difficulty
- priority
- is_active
- starts_on
- ends_on nullable
- recurrence_rule_id
- assignment_rule_id
- created_by_member_id
- created_at
- updated_at

## 2.6 RecurrenceRule
Définit quand une tâche revient.

### Champs suggérés
- id
- type
- interval
- weekdays json nullable
- day_of_month nullable
- anchor_date
- generate_time_of_day nullable
- due_offset_days nullable
- config json
- created_at
- updated_at

### Types suggérés
- `daily`
- `every_x_days`
- `weekly`
- `every_x_weeks`
- `monthly_simple`

## 2.7 AssignmentRule
Définit comment choisir l'assigné.

### Champs suggérés
- id
- mode
- eligible_member_ids json
- fixed_member_id nullable
- rotation_order json nullable
- fairness_window_days nullable
- preserve_rotation_on_skip boolean
- preserve_rotation_on_reschedule boolean
- rebalance_on_member_absence boolean
- lock_assignee_after_generation boolean
- config json
- created_at
- updated_at

### Modes suggérés
- `fixed`
- `manual`
- `strict_alternation`
- `round_robin`
- `least_assigned_count`
- `least_assigned_minutes`

## 2.8 TaskOccurrence
Occurrence concrète générée.

### Champs suggérés
- id
- household_id
- task_template_id
- scheduled_date
- due_date
- assigned_member_id nullable
- status
- source_generation_key unique
- generation_version
- original_scheduled_date
- completed_at nullable
- completed_by_member_id nullable
- actual_minutes nullable
- notes nullable
- created_at
- updated_at

### Statuts
- `planned`
- `due`
- `overdue`
- `completed`
- `skipped`
- `rescheduled`
- `cancelled`

## 2.9 OccurrenceActionLog
Historique fin des actions métier.

### Champs suggérés
- id
- occurrence_id
- action_type
- actor_member_id nullable
- previous_values json
- new_values json
- created_at

### Types d'action
- created
- assigned
- completed
- skipped
- rescheduled
- reassigned
- edited
- cancelled

## 2.10 Invitation
Gestion des invitations au foyer.

### Champs suggérés
- id
- household_id
- email
- role
- token_hash
- expires_at
- accepted_at nullable
- created_at

## 3. Relations métier

- un foyer possède plusieurs membres ;
- un foyer possède plusieurs tâches templates ;
- une tâche template possède une règle de récurrence ;
- une tâche template possède une règle d'attribution ;
- une tâche template génère plusieurs occurrences ;
- une occurrence peut produire plusieurs logs ;
- un membre peut avoir plusieurs indisponibilités.

## 4. Règles de génération d'occurrences

## 4.1 Fenêtre glissante
Le système génère les occurrences sur une plage configurable, par exemple :
- passé récent : 30 jours ;
- futur : 60 jours.

## 4.2 Clé d'idempotence
Chaque occurrence doit être liée à une clé de génération déterministe, par exemple :
- `task_template_id + logical_scheduled_date`

Ainsi, régénérer ne crée pas de doublons.

## 4.3 Préservation de l'historique
Une occurrence déjà :
- complétée ;
- reportée ;
- sautée ;
ne doit pas être détruite silencieusement lors d'une régénération.

## 4.4 Versioning de règle
Quand une règle change, le moteur doit savoir si :
- il régénère uniquement le futur ;
- il laisse intact le passé ;
- il respecte les occurrences déjà ajustées manuellement.

## 5. Règles d'attribution détaillées

## 5.1 Fixed
Toujours attribuer au même membre.

### Cas limites
- si le membre est inactif :
  - soit bloquer la génération ;
  - soit fallback configurable ;
  - soit marquer sans assigné.

## 5.2 Manual
Pas d'assignation automatique.
L'occurrence est créée non assignée ou pré-remplie à partir du dernier assigné si cette option est activée.

## 5.3 Strict alternation
Ordre strict entre membres éligibles.

### Exemple
Membres `[A, B]`
Occurrences :
- 1 -> A
- 2 -> B
- 3 -> A
- 4 -> B

### Paramètres critiques
- que faire si l'occurrence 2 est sautée ?
- que faire si B est absent ?
- la rotation se base-t-elle sur :
  - les occurrences générées ?
  - les occurrences effectuées ?
  - les occurrences dues ?

### Recommandation V1
Base sur les **occurrences logiques générées**, pas sur la complétion réelle, afin de conserver la simplicité et la prévisibilité.

## 5.4 Round robin
Comme l'alternance stricte mais avec plus de membres et sans présumer seulement deux personnes.

## 5.5 Least assigned count
Attribuer à la personne ayant le moins d'occurrences assignées sur une fenêtre.

### Fenêtre possible
- 7 jours ;
- 14 jours ;
- 30 jours ;
- fenêtre glissante configurable.

### Tiebreak
Prévoir une règle stable :
1. plus faible nombre ;
2. plus faible charge minute ;
3. ordre de rotation secondaire.

## 5.6 Least assigned minutes
Attribuer à la personne dont la somme des minutes estimées assignées est la plus faible sur la fenêtre.

### Important
Se baser d'abord sur l'estimé de la tâche. Plus tard, possibilité de mixer avec le temps réel mesuré.

## 6. Gestion des absences

## 6.1 Absence ponctuelle
Un membre est indisponible sur une plage.

### Comportement
Si une occurrence tombe sur une indisponibilité :
- chercher le prochain membre éligible si `rebalance_on_member_absence = true` ;
- sinon laisser l'occurrence assignée et la signaler.

## 6.2 Disponibilité hebdomadaire
Évolution future pour éviter certains jours.

## 7. Skip, report et réassignation

## 7.1 Skip
Une occurrence est ignorée intentionnellement.

### Paramètres de comportement
- conserver la rotation logique ;
- ou recalculer à partir de la prochaine occurrence.

Recommandation V1 :
- conserver la rotation logique pour préserver la lisibilité.

## 7.2 Report
Une occurrence est déplacée à une autre date.

### Décision métier
Le report crée-t-il :
- une modification de l'occurrence existante ;
- ou une occurrence dérivée ?

Recommandation V1 :
- modifier l'occurrence existante avec trace dans le log, sans toucher au template.

## 7.3 Réassignation
Changement d'assigné sur une occurrence donnée, sans modifier la règle générale.

## 8. Indicateurs de charge

## 8.1 Charge simple
- nombre de tâches planifiées par personne ;
- nombre de tâches terminées ;
- minutes estimées planifiées ;
- minutes réelles saisies.

## 8.2 Indice d'équité V1
Possibilité d'un score simple par période :
- comparer la répartition des minutes estimées entre membres actifs ;
- afficher l'écart au partage théorique.

### Exemple
Deux membres, 200 minutes totales.
Répartition idéale : 100 / 100.
Répartition réelle : 130 / 70.
Écart :
- A : +30
- B : -30

## 8.3 Indicateurs futurs
- rolling average ;
- coefficient de surcharge ;
- indice par catégorie ;
- dette de participation.

## 9. Règles de modification d'une tâche template

Quand un template est édité, il faut distinguer :
- changement cosmétique : titre, description ;
- changement métier : fréquence, membres éligibles, mode d'attribution.

### Politique recommandée
- changements cosmétiques : propager sans risque au futur et éventuellement aux occurrences futures non modifiées ;
- changements métier : régénérer uniquement les occurrences futures non verrouillées.

## 10. Fuseaux horaires

Le foyer doit avoir une timezone explicite.
Toutes les dates doivent être manipulées dans ce contexte métier pour éviter les effets de DST.

## 11. ICS / calendrier

### V1
Produire des flux iCal read-only :
- foyer complet ;
- par membre.

Chaque occurrence exportée doit contenir :
- titre ;
- date ;
- assigné ;
- catégorie/pièce si pertinent ;
- statut ou indication si terminée en option.

## 12. Requêtes et index DB à prévoir

Indexer au minimum :
- occurrences par `household_id + scheduled_date`
- occurrences par `assigned_member_id + scheduled_date`
- occurrences par `task_template_id`
- templates par `household_id`
- membres par `household_id`
- logs par `occurrence_id`
- invitations par `token_hash`

## 13. Invariants métier à tester

- aucune occurrence orpheline ;
- aucune fuite de données inter-foyers ;
- pas de duplication lors d'une régénération ;
- alternance stable à règles égales ;
- équilibrage déterministe à input identique ;
- modifications manuelles préservées ;
- historique non détruit.

