# Variables d'environnement

## Cœur

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL PostgreSQL Prisma |
| `APP_BASE_URL` | URL publique de l'application (liens email, iCal, etc.) |
| `AUTH_SECRET` | Secret de signature des sessions cookie |
| `DEFAULT_TIMEZONE` | Timezone par défaut des nouveaux foyers (ex. `Europe/Paris`) |
| `OCCURRENCE_PAST_DAYS` | Fenêtre passée conservée pour la génération |
| `OCCURRENCE_FUTURE_DAYS` | Horizon futur généré |

## Sécurité

| Variable | Rôle |
|---|---|
| `CSRF_SECRET` | Secret pour le double-submit CSRF (sinon dérivé de `AUTH_SECRET`) |
| `CSRF_DISABLED` | `1` pour désactiver le check CSRF (déconseillé hors tests) |
| `RATE_LIMIT_DISABLED` | `1` pour désactiver le rate-limiter en dev |
| `ICAL_SECRET` | Secret de signature des liens iCal partageables |

## SMTP (optionnel)

Si non défini, les liens de reset sont loggés dans la console en dev.

| Variable | Rôle |
|---|---|
| `SMTP_HOST` | Hôte SMTP |
| `SMTP_PORT` | Port SMTP (587 par défaut) |
| `SMTP_USER` | Utilisateur SMTP |
| `SMTP_PASS` | Mot de passe SMTP |
| `SMTP_FROM` | Adresse expéditeur (ex. `noreply@makemenage.local`) |

## Observabilité

| Variable | Rôle |
|---|---|
| `LOG_REQUESTS` | `1` pour logger chaque requête API (route, status, durée) |

Voir [.env.example](../.env.example) pour un point de départ.
