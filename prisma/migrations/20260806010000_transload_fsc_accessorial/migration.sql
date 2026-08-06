-- Transload FSC (on reload+restack only) + accessorial adhoc with description
ALTER TABLE "Load" ADD COLUMN "transloadFuelSurchargePercent" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Load" ADD COLUMN "transloadFuelAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Load" ADD COLUMN "accessorialAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Load" ADD COLUMN "accessorialDescription" TEXT;
