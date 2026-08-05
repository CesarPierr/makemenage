-- Next-month budget planning: a pocket can carry a prepared allocation that
-- becomes live when the month it targets starts, without touching the current one.
ALTER TABLE "BudgetPocket" ADD COLUMN "plannedQuota" DECIMAL(12,2);
ALTER TABLE "BudgetPocket" ADD COLUMN "plannedPeriod" TEXT;
ALTER TABLE "BudgetPocket" ADD COLUMN "plannedFor" TEXT;
