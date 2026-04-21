# MakeMenage

Application web responsive de gestion et de répartition des tâches ménagères, pensée d'abord pour le téléphone puis pour le desktop, et déployable en self-hosted avec PostgreSQL et Docker.

## Ce qui est déjà implémenté

- authentification locale simple email / mot de passe
- création de foyer
- gestion des membres et des absences
- création de tâches récurrentes
- moteur de génération avec `daily`, `every_x_days`, `weekly`, `every_x_weeks`, `monthly_simple`
- modes d'attribution `fixed`, `manual`, `strict_alternation`, `round_robin`, `least_assigned_count`, `least_assigned_minutes`
- actions sur occurrence : complétion, saut, report, réassignation
- dashboard mobile-first
- vue mes tâches
- vue calendrier
- historique
- analytics simples de charge / équité
- export iCal foyer et par membre
- Docker dev et prod

## Démarrage rapide

```bash
cp .env.example .env
npm install
docker compose up -d db
npx prisma generate
npx prisma db push
npm run dev
```

Application : `http://localhost:3000`

## Tests

```bash
npm run lint
npm run typecheck
npm run test
```

## Documentation complémentaire

- [docs/setup-dev.md](docs/setup-dev.md)
- [docs/setup-prod.md](docs/setup-prod.md)
- [docs/reverse-proxy-caddy.md](docs/reverse-proxy-caddy.md)
- [docs/reverse-proxy-nginx.md](docs/reverse-proxy-nginx.md)
- [docs/env.md](docs/env.md)
- [docs/backup.md](docs/backup.md)

## Specs d'origine

Les spécifications initiales restent dans :

- [AGENT.md](AGENT.md)
- [docs/01_vision_produit.md](docs/01_vision_produit.md)
- [docs/02_architecture_technique.md](docs/02_architecture_technique.md)
- [docs/03_modele_de_donnees_et_regles_metier.md](docs/03_modele_de_donnees_et_regles_metier.md)
- [docs/04_plan_de_sprints.md](docs/04_plan_de_sprints.md)
- [docs/05_plan_de_tests.md](docs/05_plan_de_tests.md)
