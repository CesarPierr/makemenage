-- CreateEnum
CREATE TYPE "SavingsCalculatorFieldType" AS ENUM ('number', 'amount', 'percent');

-- CreateEnum
CREATE TYPE "SavingsCalculatorResultMode" AS ENUM ('deposit', 'withdrawal');

-- CreateEnum
CREATE TYPE "SavingsCalculatorNegativeMode" AS ENUM ('clamp_to_zero', 'convert_to_opposite');

-- CreateEnum
CREATE TYPE "SavingsCalculatorRoundingMode" AS ENUM ('cents', 'euro_floor', 'euro_ceil', 'euro_nearest');

-- CreateTable
CREATE TABLE "SavingsCalculator" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formula" TEXT NOT NULL,
    "reasonTemplate" TEXT,
    "resultMode" "SavingsCalculatorResultMode" NOT NULL DEFAULT 'deposit',
    "negativeMode" "SavingsCalculatorNegativeMode" NOT NULL DEFAULT 'clamp_to_zero',
    "roundingMode" "SavingsCalculatorRoundingMode" NOT NULL DEFAULT 'cents',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsCalculator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsCalculatorField" (
    "id" TEXT NOT NULL,
    "calculatorId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "SavingsCalculatorFieldType" NOT NULL DEFAULT 'number',
    "defaultValue" DECIMAL(12,4),
    "helperText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsCalculatorField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsCalculatorRun" (
    "id" TEXT NOT NULL,
    "calculatorId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "inputValues" JSONB NOT NULL,
    "rawResult" DECIMAL(12,4) NOT NULL,
    "resultAmount" DECIMAL(12,2) NOT NULL,
    "entryType" "SavingsEntryType" NOT NULL,
    "entryId" TEXT,
    "authorMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsCalculatorRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingsCalculator_householdId_isArchived_sortOrder_idx" ON "SavingsCalculator"("householdId", "isArchived", "sortOrder");

-- CreateIndex
CREATE INDEX "SavingsCalculator_boxId_isArchived_sortOrder_idx" ON "SavingsCalculator"("boxId", "isArchived", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsCalculatorField_calculatorId_key_key" ON "SavingsCalculatorField"("calculatorId", "key");

-- CreateIndex
CREATE INDEX "SavingsCalculatorField_calculatorId_sortOrder_idx" ON "SavingsCalculatorField"("calculatorId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SavingsCalculatorRun_entryId_key" ON "SavingsCalculatorRun"("entryId");

-- CreateIndex
CREATE INDEX "SavingsCalculatorRun_calculatorId_createdAt_idx" ON "SavingsCalculatorRun"("calculatorId", "createdAt");

-- CreateIndex
CREATE INDEX "SavingsCalculatorRun_householdId_createdAt_idx" ON "SavingsCalculatorRun"("householdId", "createdAt");

-- CreateIndex
CREATE INDEX "SavingsCalculatorRun_boxId_createdAt_idx" ON "SavingsCalculatorRun"("boxId", "createdAt");

-- AddForeignKey
ALTER TABLE "SavingsCalculator" ADD CONSTRAINT "SavingsCalculator_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsCalculator" ADD CONSTRAINT "SavingsCalculator_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsCalculatorField" ADD CONSTRAINT "SavingsCalculatorField_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "SavingsCalculator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsCalculatorRun" ADD CONSTRAINT "SavingsCalculatorRun_calculatorId_fkey" FOREIGN KEY ("calculatorId") REFERENCES "SavingsCalculator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsCalculatorRun" ADD CONSTRAINT "SavingsCalculatorRun_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "SavingsBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsCalculatorRun" ADD CONSTRAINT "SavingsCalculatorRun_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SavingsEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
