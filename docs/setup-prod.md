# Setup prod

## Variables à définir

- `POSTGRES_PASSWORD`
- `APP_BASE_URL`
- `AUTH_SECRET`

## Déploiement

1. Copier `.env.example` vers un fichier d'environnement adapté.
2. Ajuster `examples/Caddyfile` avec votre domaine.
3. Lancer :

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## Après déploiement

- vérifier `https://votre-domaine/api/health`
- créer le premier compte
- créer le premier foyer
