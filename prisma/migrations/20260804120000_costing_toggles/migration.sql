-- AlterTable
ALTER TABLE "Load" ADD COLUMN "reload" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Load" ADD COLUMN "blocking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Load" ADD COLUMN "carbonTaxApplied" BOOLEAN NOT NULL DEFAULT false;

-- Backfill toggles from existing fee amounts
UPDATE "Load" SET "reload" = true WHERE "reloadFee" > 0;
UPDATE "Load" SET "blocking" = true WHERE "blockingFee" > 0;
UPDATE "Load" SET "carbonTaxApplied" = true WHERE "carbonTax" > 0;

-- Align fee master with confirmed sheet amounts
UPDATE "FeeSettings"
SET
  "flatDeckCdi" = 375,
  "flatDeckFortigo" = 450,
  "reloadFee" = 500,
  "restackFee" = 100,
  "blockingFee" = 0,
  "carbonTax" = 0;
