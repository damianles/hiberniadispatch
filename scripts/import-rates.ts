import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { PrismaClient, Carrier, ProductClass } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_XLSX =
  process.env.RATES_XLSX_PATH ??
  path.join(
    process.env.USERPROFILE ?? "",
    "Downloads",
    "Volume Freight Rates Calgary.xlsx",
  );

function cell(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number,
): string | number | undefined {
  const addr = XLSX.utils.encode_cell({ r: row - 1, c: col - 1 });
  const c = sheet[addr];
  return c?.v as string | number | undefined;
}

function num(v: string | number | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  const xlsxPath = DEFAULT_XLSX;
  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Rates spreadsheet not found: ${xlsxPath}`);
  }

  console.log(`Reading ${xlsxPath}`);
  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets["Sheet1"];
  if (!sheet) throw new Error("Sheet1 not found");

  // B2 fuel % on the sheet is weekly/current only — not imported.
  // Fuel is selected per load on the form (1–100%).
  const flatDeckCdi = num(cell(sheet, 5, 2));
  const flatDeckFortigo = num(cell(sheet, 5, 9));
  const reloadFee = num(cell(sheet, 6, 2));
  const restackFee = num(cell(sheet, 7, 2));
  const blockingFee = num(cell(sheet, 8, 2));
  const carbonTax = num(cell(sheet, 9, 2));

  if (
    flatDeckCdi == null ||
    flatDeckFortigo == null ||
    reloadFee == null ||
    restackFee == null ||
    blockingFee == null ||
    carbonTax == null
  ) {
    throw new Error("Missing fee defaults in spreadsheet header (B5, I5, B6–B9)");
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@hibernia.local" },
    update: {},
    create: {
      email: "admin@hibernia.local",
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email}`);

  await prisma.feeSettings.deleteMany();
  const fees = await prisma.feeSettings.create({
    data: {
      flatDeckCdi,
      flatDeckFortigo,
      reloadFee,
      restackFee,
      blockingFee,
      carbonTax,
      updatedById: admin.id,
    },
  });
  console.log(
    `Fee defaults: flatDeck CDI=${fees.flatDeckCdi} Fortigo=${fees.flatDeckFortigo} reload=${fees.reloadFee} restack=${fees.restackFee} (fuel is per-load)`,
  );

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  let cdiCount = 0;
  let fortigoCount = 0;

  for (let r = 12; r <= range.e.r + 1; r++) {
    const destRaw = cell(sheet, r, 1);
    if (destRaw == null || String(destRaw).trim() === "") continue;
    const destination = String(destRaw).trim();

    const imsBase = num(cell(sheet, r, 5));
    const fortigoBase = num(cell(sheet, r, 8));

    if (imsBase != null) {
      for (const productClass of [
        ProductClass.SIZE_2X4_6_8,
        ProductClass.SIZE_2X10_12,
      ] as const) {
        await prisma.freightRate.upsert({
          where: {
            destination_carrier_productClass: {
              destination,
              carrier: Carrier.CDI,
              productClass,
            },
          },
          update: { baseRate: imsBase },
          create: {
            destination,
            carrier: Carrier.CDI,
            productClass,
            baseRate: imsBase,
          },
        });
        cdiCount += 1;
      }
    }

    if (fortigoBase != null) {
      await prisma.freightRate.upsert({
        where: {
          destination_carrier_productClass: {
            destination,
            carrier: Carrier.FORTIGO,
            productClass: ProductClass.ALL,
          },
        },
        update: { baseRate: fortigoBase },
        create: {
          destination,
          carrier: Carrier.FORTIGO,
          productClass: ProductClass.ALL,
          baseRate: fortigoBase,
        },
      });
      fortigoCount += 1;
    }
  }

  const total = await prisma.freightRate.count();
  console.log(
    `Imported rates: CDI rows written=${cdiCount}, Fortigo=${fortigoCount}, total in DB=${total}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
