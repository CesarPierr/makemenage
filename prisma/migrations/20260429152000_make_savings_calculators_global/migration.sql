-- Allow calculators to be household-level templates with no default target box.
ALTER TABLE "SavingsCalculator" DROP CONSTRAINT "SavingsCalculator_boxId_fkey";

ALTER TABLE "SavingsCalculator" ALTER COLUMN "boxId" DROP NOT NULL;

ALTER TABLE "SavingsCalculator" ADD CONSTRAINT "SavingsCalculator_boxId_fkey"
FOREIGN KEY ("boxId") REFERENCES "SavingsBox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
