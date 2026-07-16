-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DISPATCHER');
CREATE TYPE "Carrier" AS ENUM ('CDI', 'FORTIGO');
CREATE TYPE "ProductClass" AS ENUM ('SIZE_2X4_6_8', 'SIZE_2X10_12', 'ALL');
CREATE TYPE "LoadStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE "Equipment" AS ENUM ('FLAT_DECK', 'BOX_VAN');
CREATE TYPE "EquipmentStyle" AS ENUM ('SUPER_B', 'TRI_AXLE', 'TANDEM', 'MAXI', 'STEP_DECK_TROMBONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DISPATCHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeSettings" (
    "id" TEXT NOT NULL,
    "flatDeckCdi" DECIMAL(65,30) NOT NULL,
    "flatDeckFortigo" DECIMAL(65,30) NOT NULL,
    "reloadFee" DECIMAL(65,30) NOT NULL,
    "restackFee" DECIMAL(65,30) NOT NULL,
    "blockingFee" DECIMAL(65,30) NOT NULL,
    "carbonTax" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "FeeSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FreightRate" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "carrier" "Carrier" NOT NULL,
    "productClass" "ProductClass" NOT NULL,
    "baseRate" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FreightRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "companyName" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT,
    "phone" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "outboundNumber" TEXT NOT NULL,
    "inboundNumber" TEXT,
    "status" "LoadStatus" NOT NULL DEFAULT 'DRAFT',
    "vanDropDate" TIMESTAMP(3) NOT NULL,
    "pickupCompany" TEXT NOT NULL,
    "pickupStreet" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupProvince" TEXT NOT NULL,
    "pickupPostal" TEXT,
    "pickupPhone" TEXT,
    "destination" TEXT NOT NULL,
    "deliveryCompany" TEXT,
    "deliveryStreet" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryProvince" TEXT NOT NULL,
    "deliveryPostal" TEXT,
    "deliveryRef" TEXT,
    "deliveryAddressId" TEXT,
    "carrier" "Carrier" NOT NULL,
    "productClass" "ProductClass" NOT NULL,
    "equipment" "Equipment" NOT NULL,
    "equipmentStyle" "EquipmentStyle" NOT NULL,
    "crossDock" BOOLEAN NOT NULL DEFAULT false,
    "crossDockFee" DECIMAL(65,30),
    "restack" BOOLEAN NOT NULL DEFAULT false,
    "loadContents" TEXT NOT NULL,
    "weightLbs" INTEGER,
    "baseRate" DECIMAL(65,30) NOT NULL,
    "fuelSurchargePercent" DECIMAL(65,30) NOT NULL,
    "fuelAmount" DECIMAL(65,30) NOT NULL,
    "flatDeckFee" DECIMAL(65,30) NOT NULL,
    "reloadFee" DECIMAL(65,30) NOT NULL,
    "restackFee" DECIMAL(65,30) NOT NULL,
    "blockingFee" DECIMAL(65,30) NOT NULL,
    "carbonTax" DECIMAL(65,30) NOT NULL,
    "crossDockAmount" DECIMAL(65,30) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dispatchedAt" TIMESTAMP(3),
    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "FreightRate_destination_carrier_productClass_key" ON "FreightRate"("destination", "carrier", "productClass");
CREATE INDEX "FreightRate_destination_idx" ON "FreightRate"("destination");
CREATE UNIQUE INDEX "Load_outboundNumber_key" ON "Load"("outboundNumber");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

ALTER TABLE "FeeSettings" ADD CONSTRAINT "FeeSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Load" ADD CONSTRAINT "Load_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Load" ADD CONSTRAINT "Load_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Load" ADD CONSTRAINT "Load_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
