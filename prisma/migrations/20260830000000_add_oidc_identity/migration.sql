-- AlterTable
ALTER TABLE "User"
ADD COLUMN "oidcIssuer" TEXT,
ADD COLUMN "oidcSubject" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_oidcIssuer_oidcSubject_key"
ON "User"("oidcIssuer", "oidcSubject");
