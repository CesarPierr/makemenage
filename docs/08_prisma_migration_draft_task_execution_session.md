# Draft de migration Prisma — Sessions `En cours`

## 1. But

Introduire une entité persistante pour suivre une tâche en cours ou une séquence de tâches par pièce, avec reprise après refresh et écriture du temps réel sur la tâche terminée.

Ce document est un draft de conception. Il ne remplace pas une vraie migration validée et testée.

## 2. Changements proposés

## 2.1 Nouvel enum

```prisma
enum TaskExecutionSessionStatus {
  running
  paused
  completed
  cancelled
}
```

## 2.2 Nouveau modèle

```prisma
model TaskExecutionSession {
  id                String                    @id @default(cuid())
  householdId       String
  occurrenceId      String
  startedByMemberId String
  status            TaskExecutionSessionStatus @default(running)
  mode              String
  roomSnapshot      String?
  queueSnapshot     Json?
  queueIndex        Int                       @default(0)
  startedAt         DateTime
  pausedAt          DateTime?
  endedAt           DateTime?
  elapsedSeconds    Int                       @default(0)
  notes             String?
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt

  household         Household                 @relation(fields: [householdId], references: [id], onDelete: Cascade)
  occurrence        TaskOccurrence            @relation(fields: [occurrenceId], references: [id], onDelete: Cascade)
  startedByMember   HouseholdMember           @relation(fields: [startedByMemberId], references: [id], onDelete: Cascade)

  @@index([householdId, status])
  @@index([startedByMemberId, status])
  @@index([occurrenceId])
}
```

## 2.3 Relations à ajouter

Dans `Household` :

```prisma
executionSessions TaskExecutionSession[]
```

Dans `HouseholdMember` :

```prisma
startedExecutionSessions TaskExecutionSession[]
```

Dans `TaskOccurrence` :

```prisma
executionSessions TaskExecutionSession[]
```

## 3. Remarques de modélisation

### 3.1 Pourquoi un modèle dédié

- l'état `running` ne doit pas être un statut direct de `TaskOccurrence` ;
- une occurrence peut exister sans session active ;
- une même occurrence peut avoir plusieurs sessions successives dans l'historique ;
- on garde `TaskOccurrence` comme vérité métier de la tâche, et la session comme vérité d'exécution.

### 3.2 Pourquoi `queueSnapshot`

Pour un mode `room_sequence`, il faut pouvoir :

- reprendre l'ordre initial ;
- savoir quelle tâche de la séquence est courante ;
- éviter un recalcul implicite au refresh qui casserait le flux utilisateur.

### 3.3 Pourquoi `mode` en string au draft

Deux options :

- garder `String` au premier jet pour aller vite ;
- ou introduire un enum `TaskExecutionMode`.

La recommandation long terme est d'ajouter l'enum :

```prisma
enum TaskExecutionMode {
  single_occurrence
  room_sequence
}
```

## 4. SQL draft

```sql
CREATE TYPE "TaskExecutionSessionStatus" AS ENUM (
  'running',
  'paused',
  'completed',
  'cancelled'
);

CREATE TABLE "TaskExecutionSession" (
  "id" TEXT PRIMARY KEY,
  "householdId" TEXT NOT NULL,
  "occurrenceId" TEXT NOT NULL,
  "startedByMemberId" TEXT NOT NULL,
  "status" "TaskExecutionSessionStatus" NOT NULL DEFAULT 'running',
  "mode" TEXT NOT NULL,
  "roomSnapshot" TEXT,
  "queueSnapshot" JSONB,
  "queueIndex" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "pausedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskExecutionSession_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskExecutionSession_occurrenceId_fkey"
    FOREIGN KEY ("occurrenceId") REFERENCES "TaskOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskExecutionSession_startedByMemberId_fkey"
    FOREIGN KEY ("startedByMemberId") REFERENCES "HouseholdMember"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TaskExecutionSession_householdId_status_idx"
  ON "TaskExecutionSession"("householdId", "status");

CREATE INDEX "TaskExecutionSession_startedByMemberId_status_idx"
  ON "TaskExecutionSession"("startedByMemberId", "status");

CREATE INDEX "TaskExecutionSession_occurrenceId_idx"
  ON "TaskExecutionSession"("occurrenceId");
```

## 5. Contraintes métier recommandées

### 5.1 V1

- une seule session active (`running` ou `paused`) par membre et par foyer ;
- une occurrence peut avoir plusieurs sessions closes dans l'historique ;
- finir une session peut compléter automatiquement l'occurrence, mais ce n'est pas obligatoire techniquement.

### 5.2 Vérification applicative recommandée

Avant création d'une session :

- chercher une session active pour le membre ;
- si trouvée, demander reprise/annulation au lieu d'en créer une autre.

## 6. Impacts côté service

Nouveaux services recommandés :

- `startExecutionSession`
- `pauseExecutionSession`
- `resumeExecutionSession`
- `finishExecutionSession`
- `skipCurrentInExecutionSession`
- `getCurrentExecutionSession`

`finishExecutionSession` devra :

- calculer `elapsedSeconds` final ;
- convertir vers `actualMinutes` ;
- appeler l'équivalent de `completeOccurrence` si demandé ;
- consigner l'historique d'exécution si utile.

## 7. Tests à prévoir avant migration réelle

- création d'une session simple ;
- création d'une séquence par pièce ;
- reprise après refresh ;
- interdiction de doublon de session active ;
- clôture avec report de temps réel ;
- clôture sans completion automatique ;
- suppression d'une occurrence avec session active ;
- comportement sur foyer avec plusieurs membres.

## 8. Option différée

Si l'équipe veut aller encore plus loin plus tard, ajouter :

- `TaskExecutionSessionEvent` pour un audit fin pause/reprise ;
- `deviceId` ou `clientId` pour reprise multi-device ;
- `source` pour distinguer lancement manuel et lancement par suggestion UI.

