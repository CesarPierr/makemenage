# Variables d'environnement

## Cœur

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL PostgreSQL Prisma |
| `APP_BASE_URL` | URL publique de l'application (liens email, iCal, etc.) |
| `NEXT_PUBLIC_APP_NAME` | Nom affiché dans les nouvelles surfaces publiques/support |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Email public pour support, RGPD et sécurité |
| `NEXT_PUBLIC_SUPPORT_URL` | Lien de don/soutien optionnel |
| `AUTH_SECRET` | Secret de signature des sessions cookie |
| `OIDC_ISSUER` | Issuer OIDC optionnel (URL exacte publiée par le fournisseur) |
| `OIDC_CLIENT_ID` | Identifiant du client OIDC confidentiel |
| `OIDC_CLIENT_SECRET` | Secret du client OIDC confidentiel |
| `OIDC_DISPLAY_NAME` | Nom du fournisseur affiché sur la page de connexion (défaut : `SSO`) |
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
| `ADMIN_EMAILS` | Liste CSV des emails autorisés à accéder à `/app/admin` |

Les trois variables `OIDC_ISSUER`, `OIDC_CLIENT_ID` et `OIDC_CLIENT_SECRET`
doivent être définies ensemble. Quotidy utilise le flux Authorization Code avec
PKCE, `state` et `nonce`; l'URI de redirection est
`<APP_BASE_URL>/api/auth/oidc/callback`. Un compte local existant portant le même
email est lié lors de la première connexion uniquement si le fournisseur marque
cet email comme vérifié, puis l'identité stable `iss` + `sub` est utilisée.

## SMTP (optionnel)

Si non défini, les liens de reset sont loggés dans la console en dev.

| Variable | Rôle |
|---|---|
| `SMTP_HOST` | Hôte SMTP |
| `SMTP_PORT` | Port SMTP (587 par défaut) |
| `SMTP_USER` | Utilisateur SMTP |
| `SMTP_PASS` | Mot de passe SMTP |
| `SMTP_FROM` | Adresse expéditeur (ex. `noreply@quotidy.local`) |

## Observabilité

| Variable | Rôle |
|---|---|
| `LOG_REQUESTS` | `1` pour logger chaque requête API (route, status, durée) |
| `GITHUB_REPORT_REPO` | Repo `owner/name` où créer les issues de feedback optionnelles |
| `GITHUB_REPORT_TOKEN` | Token GitHub pour créer les issues de feedback optionnelles |

## Billing préparatoire

| Variable | Rôle |
|---|---|
| `BILLING_ENABLED` | `1` pour activer les feature gates payants. Rester à `0` pendant la bêta. |

Voir [.env.example](../.env.example) pour un point de départ.
