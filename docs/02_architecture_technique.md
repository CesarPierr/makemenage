# Architecture technique

## 1. Principes d'architecture

L'application doit être conçue comme un système web monolithique modulaire ou un petit ensemble de services, sans complexité distribuée inutile. Le but est de rester simple à développer, simple à déployer et simple à maintenir en auto-hébergement.

### Recommandation
Un **monolithe web moderne** est recommandé pour la V1 :
- frontend et backend regroupés dans un même projet ;
- API interne bien structurée ;
- worker optionnel séparé pour génération d'occurrences / jobs.

Cette approche réduit la charge d'exploitation tout en gardant une architecture propre.

## 2. Stack recommandée

## 2.1 Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS
- bibliothèque de composants accessible
- FullCalendar pour la vue calendrier
- React Hook Form + Zod pour les formulaires

## 2.2 Backend
Option recommandée :
- Node.js
- TypeScript
- routes API Next.js ou service Express/Fastify séparé

## 2.3 Base de données
- PostgreSQL

## 2.4 ORM / requêtes
- Prisma recommandé

## 2.5 Auth
- auth locale email/mot de passe ;
- invitations par lien ;
- gestion des rôles par foyer ;
- session cookie sécurisée.

## 2.6 Background jobs
- worker Node.js dédié ou cron interne ;
- génération des occurrences ;
- recalcul de métriques ;
- nettoyage / maintenance.

## 2.7 Observabilité
- logs structurés ;
- endpoint de healthcheck ;
- éventuellement métriques Prometheus plus tard.

## 3. Architecture logique

## 3.1 Modules applicatifs
- Auth
- Utilisateurs
- Foyers
- Membres
- Tâches templates
- Récurrence
- Attribution
- Occurrences
- Historique
- Calendrier
- Analytics
- Administration

## 3.2 Flux principal
1. un utilisateur crée un foyer ;
2. le foyer contient des membres ;
3. un admin crée une tâche template ;
4. une règle de récurrence définit quand les occurrences existent ;
5. une règle d'attribution définit à qui elles sont affectées ;
6. un moteur génère ou met à jour les occurrences futures ;
7. l'utilisateur consulte / valide / reporte / réassigne ;
8. les indicateurs sont recalculés.

## 4. Architecture de déploiement

## 4.1 Services minimum
- `app` : serveur web applicatif ;
- `db` : PostgreSQL ;
- `reverse-proxy` : Caddy ou Nginx.

## 4.2 Services optionnels
- `worker` : traitement asynchrone / cron ;
- `backup` : sauvegardes PostgreSQL ;
- `adminer` ou équivalent uniquement en dev.

## 4.3 Exemple de topologie
- DNS `taches.example.com`
- reverse proxy vers `app:3000`
- `app` connecté à `db`
- volume persistant PostgreSQL
- certificat TLS géré par Caddy

## 5. Docker

## 5.1 Exigences
Prévoir :
- `Dockerfile` multi-stage ;
- `docker-compose.yml` pour dev ;
- `docker-compose.prod.yml` ou `compose.yaml` paramétrable ;
- `.env.example` ;
- volumes de persistance ;
- healthchecks.

## 5.2 Services Docker suggérés
### app
- build de l'application
- expose port interne 3000
- variables env :
  - `DATABASE_URL`
  - `APP_BASE_URL`
  - `AUTH_SECRET`
  - `TZ`
  - `NODE_ENV`

### db
- image PostgreSQL
- volume persistant
- backups recommandés

### worker
- même image que app si code partagé
- commande dédiée pour jobs

### reverse-proxy
- Caddy recommandé
- mount du `Caddyfile`

## 5.3 Exemple de responsabilités Caddy
- redirection HTTP -> HTTPS
- TLS automatique
- proxy vers `app:3000`
- headers reverse proxy
- compression
- éventuel cache léger des assets

## 6. Reverse proxy et DNS

## 6.1 DNS
Documenter :
- ajout d'un enregistrement A vers le serveur ;
- éventuel AAAA si IPv6 ;
- propagation DNS.

## 6.2 Reverse proxy Caddy
Prévoir une configuration du type :
- domaine ;
- reverse proxy sur le service app ;
- gestion automatique des certificats ;
- headers `X-Forwarded-*`.

## 6.3 Reverse proxy Nginx
Fournir en annexe un exemple minimal pour les utilisateurs ne voulant pas Caddy.

## 6.4 Cookies et sécurité
Configurer l'application pour :
- reconnaître qu'elle est derrière proxy ;
- utiliser cookies `Secure` en prod ;
- définir correctement `sameSite` et domaine.

## 7. Modèle d'API

## 7.1 Style
- API REST JSON suffisante en V1 ;
- validation stricte des payloads ;
- pagination simple ;
- filtres par foyer / membre / période.

## 7.2 Endpoints clés
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Foyers
- `GET /api/households`
- `POST /api/households`
- `GET /api/households/:id`
- `PATCH /api/households/:id`

### Membres
- `POST /api/households/:id/members`
- `PATCH /api/members/:id`
- `POST /api/members/:id/absence`

### Tâches templates
- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Occurrences
- `GET /api/occurrences`
- `PATCH /api/occurrences/:id`
- `POST /api/occurrences/:id/complete`
- `POST /api/occurrences/:id/skip`
- `POST /api/occurrences/:id/reschedule`
- `POST /api/occurrences/:id/reassign`

### Analytics
- `GET /api/analytics/load`
- `GET /api/analytics/fairness`

### Calendrier
- `GET /api/calendar/feed.ics`
- `GET /api/calendar/member/:memberId/feed.ics`

## 8. Performance et stratégie de génération

## 8.1 Approche recommandée
Ne pas générer toutes les occurrences à l'infini. Utiliser une **fenêtre glissante**.

Exemple :
- générer les occurrences de J-30 à J+60 ;
- régénérer périodiquement ou à la demande quand une règle change.

## 8.2 Avantages
- volume contrôlé ;
- historique conservé ;
- projections suffisantes ;
- performance stable.

## 8.3 Idempotence
Le job de génération doit être idempotent :
- créer ce qui manque ;
- ne pas dupliquer ;
- préserver l'historique et les exceptions déjà enregistrées.

## 9. Sécurité

## 9.1 Authentification
- mot de passe hashé avec Argon2 ou bcrypt robuste ;
- rotation de secret documentée ;
- limitation de débit sur login.

## 9.2 Autorisation
- contrôle systématique par foyer ;
- middleware d'autorisation centralisé ;
- tests d'isolation inter-foyers.

## 9.3 Validation
- schémas Zod ou équivalent ;
- aucune confiance dans le client.

## 9.4 Journalisation
Journaliser au minimum :
- création/modification/suppression de tâche ;
- changement de règles d'attribution ;
- invitation de membre ;
- complétion/replanification/saut.

## 10. Responsive et UX technique

## 10.1 Responsive
Breakpoints à traiter :
- mobile portrait ;
- mobile large ;
- tablette ;
- desktop.

## 10.2 Navigation
Prévoir un shell d'application avec :
- header ;
- navigation basse ou drawer sur mobile ;
- sidebar sur desktop.

## 10.3 Composants clés
- liste de tâches ;
- cartes par tâche ;
- calendrier ;
- filtres ;
- modales d'édition ;
- graphiques simples ;
- indicateurs de charge.

## 11. PWA et offline

Pas obligatoire en V1, mais l'architecture doit rester compatible avec :
- manifest ;
- icônes ;
- cache d'assets ;
- offline partiel futur.

## 12. Sauvegarde et restauration

Documenter à terme :
- backup PostgreSQL ;
- restauration depuis dump ;
- politique de fréquence ;
- test de restauration.

## 13. Documentation attendue dans le repo

- `README.md`
- `docs/setup-dev.md`
- `docs/setup-prod.md`
- `docs/reverse-proxy-caddy.md`
- `docs/reverse-proxy-nginx.md`
- `docs/env.md`
- `docs/backup.md`

## 14. Futures extensions techniques

- Redis pour jobs ou cache ;
- file d'événements internes ;
- Web Push ;
- Webhooks ;
- SSO local ou tiers ;
- intégrations calendrier avancées ;
- exports enrichis.

