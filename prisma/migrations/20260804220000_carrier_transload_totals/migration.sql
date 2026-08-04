-- Separate Transload (reload/restack) from VFS/CDI carrier totals
ALTER TABLE "Load" ADD COLUMN "carrierTotal" DECIMAL(65,30);
ALTER TABLE "Load" ADD COLUMN "transloadTotal" DECIMAL(65,30);

UPDATE "Load"
SET
  "transloadTotal" = COALESCE("reloadFee", 0) + COALESCE("restackFee", 0),
  "carrierTotal" = COALESCE("totalAmount", 0) - (COALESCE("reloadFee", 0) + COALESCE("restackFee", 0));

ALTER TABLE "Load" ALTER COLUMN "carrierTotal" SET NOT NULL;
ALTER TABLE "Load" ALTER COLUMN "transloadTotal" SET NOT NULL;
