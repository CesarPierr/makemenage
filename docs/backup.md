# Backup

## Dump PostgreSQL

```bash
docker compose exec db pg_dump -U makemenage -d makemenage > makemenage-backup.sql
```

## Restauration

```bash
cat makemenage-backup.sql | docker compose exec -T db psql -U makemenage -d makemenage
```

## Fréquence recommandée

- quotidien si usage réel du foyer
- test de restauration mensuel
