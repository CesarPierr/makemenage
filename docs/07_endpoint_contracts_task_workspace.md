# Contrats d'API — Workspace quotidien, planification et sessions

## 1. Objectif

Ces contrats définissent les endpoints nécessaires pour supporter :

- un workspace quotidien centré tâches ;
- un détail unifié occurrence/routine ;
- une bibliothèque de tâches scalable ;
- un flux d'activité léger ;
- des sessions `En cours` persistantes.

Ils complètent les routes existantes ; ils ne supposent pas la suppression immédiate des routes actuelles.

## 2. Conventions

- Auth : session cookie existante.
- CSRF : même mécanisme que les routes existantes.
- Format :
  - `GET` -> JSON ;
  - `POST` -> JSON recommandé pour les nouvelles routes riches ;
  - conserver `FormData` comme compatibilité si nécessaire pendant migration.
- Toutes les dates sont renvoyées en ISO 8601.
- Tous les endpoints doivent être bornés par `householdId`.

## 3. Types communs

## 3.1 TaskCardDTO

```json
{
  "id": "occ_x",
  "taskTemplateId": "task_x",
  "title": "Surface cuisine",
  "room": "Cuisine",
  "category": "Nettoyage",
  "estimatedMinutes": 15,
  "actualMinutes": null,
  "color": "#C56643",
  "status": "due",
  "scheduledDate": "2026-04-23T00:00:00.000Z",
  "assignedMember": {
    "id": "mem_x",
    "displayName": "Pierre",
    "color": "#2F6D88"
  },
  "isCollective": false,
  "isManuallyModified": false,
  "hasComments": true,
  "isRunning": false,
  "nextRecommendedAction": "complete"
}
```

## 3.2 TaskDetailDTO

```json
{
  "occurrence": {},
  "template": {},
  "comments": [],
  "recentActivity": [],
  "editScopes": {
    "canEditOccurrenceOnly": true,
    "canEditFuture": true,
    "futureManualOverridesCount": 3
  },
  "runningSession": null
}
```

## 4. Workspace quotidien

## 4.1 GET /api/tasks/workspace

### Query

- `household`
- `memberId` optionnel
- `search` optionnel
- `room` optionnel
- `status` optionnel
- `cursor` optionnel pour `all`
- `limit` optionnel

### Usage

Charge la page `Aujourd'hui`.

### Response

```json
{
  "summary": {
    "nowCount": 4,
    "runningCount": 1,
    "nextCount": 6,
    "allCount": 28
  },
  "now": {
    "groups": [
      {
        "key": "overdue",
        "label": "En retard",
        "items": []
      },
      {
        "key": "Cuisine",
        "label": "Cuisine",
        "items": []
      }
    ]
  },
  "running": {
    "items": []
  },
  "next": {
    "groups": []
  },
  "all": {
    "items": [],
    "nextCursor": null
  },
  "filters": {
    "rooms": ["Cuisine", "Salle de bain"],
    "members": [],
    "statuses": ["due", "overdue", "planned", "running"]
  }
}
```

## 4.2 GET /api/occurrences/:id

### Usage

Charge le détail unifié d'une tâche.

### Response

- `TaskDetailDTO`

## 4.3 POST /api/occurrences/:id/edit

### Body

```json
{
  "scope": "occurrence_only",
  "scheduledDate": "2026-04-24",
  "assignedMemberId": "mem_x",
  "notes": "Optionnel",
  "actualMinutes": 22
}
```

### Notes

- `scope` initialement limité à `occurrence_only`.
- Ne modifie jamais la routine source.

## 4.4 POST /api/occurrences/:id/delete-one

### Body

```json
{
  "mode": "cancel_only_this_occurrence",
  "reason": "Optionnel"
}
```

### Effet

- annule uniquement cette occurrence ;
- conserve l'historique ;
- ne touche pas à la routine future.

## 5. Routines et bibliothèque

## 5.1 GET /api/tasks/library

### Query

- `household`
- `search`
- `room`
- `category`
- `active`
- `collective`
- `cursor`
- `limit`

### Response

```json
{
  "items": [
    {
      "id": "task_x",
      "title": "Surface cuisine",
      "room": "Cuisine",
      "category": "Nettoyage",
      "estimatedMinutes": 15,
      "isActive": true,
      "isCollective": false,
      "assignmentMode": "round_robin",
      "recurrenceLabel": "Tous les jours",
      "futureManualOverridesCount": 2,
      "nextOccurrenceDate": "2026-04-24T00:00:00.000Z"
    }
  ],
  "nextCursor": null,
  "counts": {
    "active": 42,
    "archived": 8
  }
}
```

## 5.2 POST /api/tasks/:taskId/edit-rule

### Body

```json
{
  "title": "Surface cuisine",
  "room": "Cuisine",
  "estimatedMinutes": 15,
  "isCollective": false,
  "startsOn": "2026-04-23",
  "recurrence": {
    "type": "weekly",
    "interval": 1
  },
  "assignment": {
    "mode": "round_robin",
    "eligibleMemberIds": ["mem_a", "mem_b"]
  },
  "overwriteFutureManualOverrides": false
}
```

### Response

```json
{
  "taskId": "task_x",
  "updated": true,
  "futureOccurrencesTouched": 12,
  "manualOverridesPreserved": 2
}
```

## 5.3 POST /api/tasks/:taskId/archive

### Body

```json
{
  "cancelFutureOccurrences": true,
  "deleteManualFutureOccurrences": false
}
```

### Effet

- archive la routine ;
- annule les occurrences futures selon les options.

## 5.4 POST /api/tasks/:taskId/delete-future

### Body

```json
{
  "deleteManualFutureOccurrences": false
}
```

### Usage

Cas rare si l'on veut supprimer le futur sans forcément changer d'autres attributs.

## 6. Activité

## 6.1 GET /api/activity

### Query

- `household`
- `taskTemplateId` optionnel
- `occurrenceId` optionnel
- `filter` optionnel : `completed|skipped|rescheduled|edited|commented`
- `cursor`
- `limit`

### Response

```json
{
  "items": [
    {
      "id": "log_x",
      "type": "completed",
      "createdAt": "2026-04-23T19:24:00.000Z",
      "label": "Terminée",
      "message": "Pierre a terminé Surface cuisine",
      "taskTitle": "Surface cuisine",
      "occurrenceId": "occ_x",
      "actor": {
        "id": "mem_x",
        "displayName": "Pierre"
      }
    }
  ],
  "nextCursor": null
}
```

## 7. Sessions `En cours`

## 7.1 GET /api/execution-sessions/current

### Query

- `household`
- `memberId` optionnel

### Response

```json
{
  "session": {
    "id": "sess_x",
    "status": "running",
    "startedAt": "2026-04-23T19:00:00.000Z",
    "elapsedSeconds": 740,
    "roomSnapshot": "Cuisine",
    "occurrenceId": "occ_x",
    "queue": [
      {
        "occurrenceId": "occ_x",
        "title": "Surface cuisine",
        "done": false
      },
      {
        "occurrenceId": "occ_y",
        "title": "Vaisselle",
        "done": false
      }
    ]
  }
}
```

## 7.2 POST /api/execution-sessions/start

### Body

```json
{
  "householdId": "hh_x",
  "memberId": "mem_x",
  "mode": "single_occurrence",
  "occurrenceId": "occ_x"
}
```

ou

```json
{
  "householdId": "hh_x",
  "memberId": "mem_x",
  "mode": "room_sequence",
  "room": "Cuisine"
}
```

### Response

```json
{
  "sessionId": "sess_x",
  "status": "running",
  "occurrenceId": "occ_x",
  "queue": []
}
```

## 7.3 POST /api/execution-sessions/:id/pause

### Body

```json
{
  "memberId": "mem_x"
}
```

## 7.4 POST /api/execution-sessions/:id/resume

### Body

```json
{
  "memberId": "mem_x"
}
```

## 7.5 POST /api/execution-sessions/:id/finish

### Body

```json
{
  "memberId": "mem_x",
  "completeOccurrence": true,
  "notes": "Optionnel",
  "overrideActualMinutes": null
}
```

### Effet

- clôt la session ;
- si `completeOccurrence=true`, renseigne `actualMinutes` depuis `elapsedSeconds` ou `overrideActualMinutes`.

## 7.6 POST /api/execution-sessions/:id/skip-current

### Body

```json
{
  "memberId": "mem_x",
  "notes": "Optionnel"
}
```

### Usage

Saute la tâche courante dans une séquence, puis passe à la suivante.

## 8. Compatibilité avec les routes existantes

Les routes actuelles suivantes peuvent rester pendant transition :

- `/api/occurrences/:id/complete`
- `/api/occurrences/:id/skip`
- `/api/occurrences/:id/reschedule`
- `/api/occurrences/:id/reassign`
- `/api/occurrences/:id/comments`
- `/api/tasks/:taskId`

Mais la cible est :

- un client unique pour le détail ;
- des réponses JSON plus explicites ;
- moins de redirections serveur implicites ;
- un meilleur contrôle des refreshs ciblés.

## 9. Règles de validation

- toute mutation doit vérifier l'appartenance au foyer ;
- toute mutation sur routine doit expliciter son scope ;
- `overwriteFutureManualOverrides` doit être `false` par défaut ;
- une session active simultanée par membre au lancement V1 ;
- `actualMinutes` borné comme aujourd'hui par validation ;
- aucune route ne doit faire dériver les dates via des conversions timezone ambiguës.

