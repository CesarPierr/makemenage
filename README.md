# Spécifications de l'application web de répartition des tâches ménagères

Ce dossier contient un pack de spécifications en **Markdown** à remettre à Codex pour développer une application web responsive, auto-hébergeable, orientée navigateur, avec déploiement Docker et reverse proxy.

## Objectif produit

Créer une application web permettant à un foyer, un couple ou une colocation de :

- définir des tâches ménagères récurrentes ;
- attribuer ces tâches manuellement ou automatiquement ;
- gérer des rotations complexes (alternance une semaine sur deux, round-robin, équilibrage par charge ou par temps estimé) ;
- visualiser les tâches dans une vue liste et calendrier ;
- suivre l'historique, la charge et l'équité ;
- fonctionner sur mobile et desktop via navigateur ;
- être déployée facilement sur un serveur personnel via Docker ;
- exposer à terme des flux iCal et, plus tard, des intégrations calendrier plus avancées.

## Fichiers

- [AGENT.md](AGENT.md) — guide global à destination de Codex / agent développeur.
- [01_vision_produit.md](01_vision_produit.md) — vision, objectifs, périmètre, cas d'usage et fonctionnalités.
- [02_architecture_technique.md](02_architecture_technique.md) — architecture cible, stack, composants, sécurité, Docker, reverse proxy, DNS.
- [03_modele_de_donnees_et_regles_metier.md](03_modele_de_donnees_et_regles_metier.md) — schéma métier, modèles, règles de récurrence et d'attribution.
- [04_plan_de_sprints.md](04_plan_de_sprints.md) — découpage par sprints avec objectifs, stories et critères d'acceptation.
- [05_plan_de_tests.md](05_plan_de_tests.md) — stratégie de test progressive, du simple au complexe.

## Hypothèses de mise en œuvre

- Application **responsive web-first**, installable ensuite en PWA si utile.
- Déploiement **self-hosted** sur un VPS ou serveur personnel.
- Reverse proxy **Caddy** recommandé pour simplifier HTTPS, avec option Nginx documentée.
- Backend API avec base PostgreSQL.
- Interface claire, simple, mobile-friendly, sans dépendre d'apps natives iOS/Android.
- Priorité au **fonctionnel robuste** avant les intégrations avancées.

## Résultat attendu pour la V1

Une application utilisable au quotidien, stable et auto-hébergeable, permettant :

- création de foyers et membres ;
- création de tâches récurrentes ;
- attribution manuelle ou auto ;
- alternance stricte ou équilibrage ;
- validation des tâches ;
- vues calendrier/liste ;
- indicateurs de charge ;
- Docker Compose opérationnel derrière reverse proxy.

