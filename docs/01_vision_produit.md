# Vision produit

## 1. Résumé

L'application est une plateforme web responsive de gestion des tâches ménagères pour couple, famille ou colocation. Elle doit permettre de créer des tâches récurrentes, de les répartir équitablement, de suivre l'historique et de visualiser les engagements dans une interface simple et mobile-friendly.

Le différenciateur principal n'est pas la simple checklist, mais la **logique de récurrence et d'attribution avancée** :

- alternance stricte ;
- round-robin ;
- équité basée sur le nombre de tâches ;
- équité basée sur le temps estimé ;
- prise en compte des absences ;
- indicateurs de charge par semaine ou période.

## 2. Public cible

### Cible principale
- couples ;
- colocations ;
- familles petites à moyennes ;
- utilisateurs souhaitant du self-hosting et du contrôle sur leurs données.

### Cible secondaire
- personnes organisant des routines domestiques ou communautaires ;
- utilisateurs voulant remplacer des outils généralistes trop peu adaptés.

## 3. Problèmes à résoudre

Les solutions existantes gèrent souvent mal :
- l'alternance fine ;
- la rotation stricte sur tâches récurrentes ;
- l'équité réelle par charge ;
- les exceptions simples ;
- l'auto-hébergement ;
- le confort mobile sans app native.

## 4. Objectifs produit

### Objectifs V1
- permettre une utilisation quotidienne réelle ;
- gérer les tâches récurrentes avec fiabilité ;
- rendre l'attribution compréhensible ;
- permettre une vue par personne et une vue calendrier ;
- déployer facilement l'app sur un serveur personnel.

### Objectifs V1.5
- PWA installable ;
- exports iCal ;
- rappels email ou in-app ;
- indicateurs de charge plus riches ;
- meilleure gestion des exceptions.

### Objectifs V2+
- intégration Google Calendar par export dédié ou sync contrôlée ;
- notifications push ;
- moteur de suggestions intelligentes ;
- statistiques avancées ;
- règles d'auto-répartition plus contextuelles ;
- templates de routines.

## 5. Périmètre fonctionnel détaillé

## 5.1 Gestion des comptes et foyers

### Fonctionnalités
- création de compte ;
- connexion / déconnexion ;
- création d'un foyer ;
- invitation de membres ;
- rattachement à un ou plusieurs foyers si nécessaire plus tard ;
- rôles :
  - owner ;
  - admin ;
  - member.

### Règles
- un utilisateur ne peut voir que les foyers auxquels il appartient ;
- un owner/admin peut inviter, modifier la configuration et gérer les membres ;
- un member peut consulter et agir sur les tâches autorisées.

## 5.2 Gestion des membres

### Données par membre
- nom ;
- prénom ou pseudo ;
- couleur d'affichage ;
- statut actif/inactif ;
- capacité hebdomadaire optionnelle ;
- disponibilité récurrente optionnelle ;
- poids d'équilibrage optionnel ;
- temps maximal recommandé par semaine optionnel.

### Évolutions futures
- avatar ;
- règles d'absence ;
- préférences de tâches ;
- tâches interdites ou préférées ;
- niveau de compétence.

## 5.3 Gestion des tâches

### Données minimales d'une tâche
- titre ;
- description ;
- catégorie ;
- pièce ;
- tags ;
- estimation de durée ;
- difficulté ;
- priorité ;
- fréquence ;
- date de début ;
- date de fin optionnelle ;
- assignation ;
- règles d'exception.

### États d'une tâche / occurrence
- planifiée ;
- à faire ;
- en retard ;
- complétée ;
- reportée ;
- sautée ;
- annulée.

## 5.4 Fréquences et récurrence

### Fréquences V1
- tous les jours ;
- tous les X jours ;
- chaque semaine ;
- toutes les X semaines ;
- jours précis de la semaine ;
- toutes les 2 semaines ;
- mensuel simple ;
- chaque Nème jour du mois simple.

### Évolutions futures
- règles proches de RRULE ;
- fenêtres flexibles ;
- périodicité conditionnelle ;
- saisonnalité ;
- dépendances entre tâches.

## 5.5 Assignation et répartition

### Modes d'assignation V1
1. **Fixe**
   - toujours la même personne.
2. **Manuelle**
   - l'utilisateur choisit l'assigné occurrence par occurrence.
3. **Alternance stricte**
   - ex. Alice puis Bob puis Alice puis Bob.
4. **Round-robin**
   - rotation séquentielle sur une liste.
5. **Équilibrage par nombre**
   - attribuer à celui/celle ayant le moins de tâches sur une fenêtre.
6. **Équilibrage par temps estimé**
   - attribuer selon la somme des durées sur une fenêtre.

### Paramètres d'attribution
- liste des membres éligibles ;
- ordre de rotation ;
- règle si un membre est absent ;
- fenêtre de calcul pour l'équilibrage ;
- conservation de la rotation après skip ;
- conservation de la rotation après report ;
- verrouillage de l'assigné après génération.

### Évolutions futures
- répartition par score composite ;
- prise en compte de disponibilité/jours préférés ;
- pénalisation des tâches récentes déjà effectuées ;
- rotation par catégorie ;
- apprentissage de préférences.

## 5.6 Occurrences

Le système doit distinguer :
- le **template** de tâche ;
- les **occurrences générées** pour un horizon donné.

### Opérations sur occurrence
- marquer comme faite ;
- replanifier ;
- réassigner ;
- sauter ;
- annoter ;
- modifier seulement cette occurrence.

### Horizon de génération
- par défaut, générer sur une fenêtre glissante configurable, par exemple 30 à 60 jours.

## 5.7 Historique et audit

### Historique V1
- qui a fait la tâche ;
- quand elle a été faite ;
- temps réel saisi optionnel ;
- statut d'origine et final ;
- commentaires.

### Futur
- audit complet des changements de règles ;
- timeline d'activité du foyer ;
- export CSV.

## 5.8 Vues utilisateur

### Vues V1
- tableau de bord ;
- mes tâches ;
- tâches du foyer ;
- vue semaine ;
- vue calendrier ;
- historique ;
- configuration des règles.

### Dashboard V1
- tâches du jour ;
- tâches en retard ;
- charge par personne ;
- prochaines tâches récurrentes ;
- indicateur d'équité simple.

## 5.9 Calendrier

### V1
- vue calendrier intégrée ;
- filtres par membre, pièce, catégorie ;
- export iCal par foyer ;
- export iCal par membre.

### Futur
- URL iCal sécurisée ;
- sync plus fine avec calendriers tiers ;
- CalDAV partiel ;
- intégration Google Calendar.

## 5.10 Indicateurs et analytics

### Indicateurs V1
- nombre de tâches faites par personne ;
- temps estimé total par personne ;
- charge planifiée cette semaine ;
- tâches en retard ;
- taux de complétion ;
- équilibre global simple.

### Indicateurs futurs
- charge moyenne sur 4 semaines ;
- indice d'équité pondéré ;
- backlog domestique par pièce ;
- temps réel vs temps estimé ;
- heatmap des jours chargés ;
- tendance de retards ;
- estimation de saturation d'un membre.

## 5.11 Notifications et rappels

### V1
- pas obligatoires ;
- éventuellement notifications in-app simples.

### V1.5 / V2
- email quotidien ;
- rappel avant échéance ;
- digest hebdomadaire ;
- push web.

## 6. Cas d'usage concrets

## 6.1 Couple avec alternance simple
- Tâche : salle de bain
- Fréquence : toutes les 2 semaines
- Membres : Alice, Bob
- Attribution : alternance stricte
- Règle : si Alice saute son tour, soit Bob prend le relais, soit la rotation reste inchangée selon paramètre.

## 6.2 Colocation avec équilibrage par temps
- Tâches variées avec durées différentes
- Trois colocataires
- Attribution automatique au membre avec le moins de minutes planifiées sur les 14 prochains jours.

## 6.3 Famille avec tâches fixes et tâches tournantes
- Poubelles : alternance
- Cuisine : fixe
- Linge : round-robin
- Nettoyage du salon : équilibrage par charge.

## 7. Hors périmètre initial

À éviter en V1 :
- app mobile native ;
- IA complexe ;
- OCR ;
- commandes vocales ;
- intégrations domotiques ;
- multi-tenant avancé type SaaS public ;
- marketplace ;
- gamification lourde.

## 8. Exigences non fonctionnelles

- temps de chargement raisonnable ;
- interface utilisable sur écran mobile ;
- accessibilité de base ;
- cohérence des dates et fuseaux ;
- architecture testable ;
- logs suffisants ;
- documentation de déploiement simple.

## 9. Critères de réussite produit

Le produit est considéré utile si un foyer peut, sans bricolage externe :

- créer des tâches récurrentes ;
- faire une alternance une semaine sur deux ;
- voir la répartition de la semaine ;
- valider ce qui a été fait ;
- comprendre si la charge est équilibrée ;
- accéder à l'application sur téléphone et ordinateur.

