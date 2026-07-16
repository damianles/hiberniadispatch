import { google, type sheets_v4 } from "googleapis";
import { format } from "date-fns";
import { readFileSync } from "node:fs";
import type { Load } from "@prisma/client";
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_STYLE_LABELS,
  PRODUCT_LABELS,
  STATUS_LABELS,
} from "@/lib/load-labels";
import { toNumber } from "@/lib/money";

/**
 * Column order mirrors the New Load form + dispatch PDF:
 * identity → shipment → pickup → delivery → contents → fees → totals → meta
 */
export const SHEET_HEADERS = [
  // Identity / lifecycle
  "Outbound #",
  "Status",
  "Van drop",
  "Carrier",
  "Inbound #",
  // Shipment
  "Destination",
  "Equipment",
  "Equipment style",
  "Product class",
  "Weight (lbs)",
  // Pickup (dispatch left column)
  "Pickup company",
  "Pickup street",
  "Pickup city",
  "Pickup province",
  "Pickup postal",
  "Pickup phone",
  // Delivery (dispatch right column)
  "Delivery company",
  "Delivery street",
  "Delivery city",
  "Delivery province",
  "Delivery postal",
  "Delivery ref",
  // Contents
  "Load contents",
  "Restack",
  "Cross dock",
  // Rate breakdown (same lines as PDF)
  "Base rate",
  "Fuel %",
  "Fuel $",
  "Flat deck $",
  "Reload $",
  "Restack $",
  "Blocking $",
  "Carbon $",
  "Cross dock $",
  "VFS total",
  // Meta
  "Created at",
  "Updated at",
  "Load ID",
] as const;

const COL_COUNT = SHEET_HEADERS.length;

/** A=1 … Z=26, AA=27 … */
function colLetter(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

const LAST_COL = colLetter(COL_COUNT);

export function isSheetsConfigured() {
  return Boolean(
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() &&
      (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()),
  );
}

function tabName() {
  return process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Loads";
}

function loadServiceAccount(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const parsed = JSON.parse(raw) as {
      client_email: string;
      private_key: string;
    };
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credPath) {
    const parsed = JSON.parse(readFileSync(credPath, "utf8")) as {
      client_email: string;
      private_key: string;
    };
    return parsed;
  }

  throw new Error("Google service account credentials not configured");
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const creds = loadServiceAccount();
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

function moneyCell(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function loadToRow(load: Load): string[] {
  return [
    load.outboundNumber,
    STATUS_LABELS[load.status] ?? load.status,
    format(load.vanDropDate, "yyyy-MM-dd"),
    load.carrier,
    load.inboundNumber ?? "",
    load.destination,
    EQUIPMENT_LABELS[load.equipment],
    EQUIPMENT_STYLE_LABELS[load.equipmentStyle],
    PRODUCT_LABELS[load.productClass] ?? load.productClass,
    load.weightLbs != null ? String(load.weightLbs) : "",
    load.pickupCompany,
    load.pickupStreet,
    load.pickupCity,
    load.pickupProvince,
    load.pickupPostal ?? "",
    load.pickupPhone ?? "",
    load.deliveryCompany ?? "",
    load.deliveryStreet,
    load.deliveryCity,
    load.deliveryProvince,
    load.deliveryPostal ?? "",
    load.deliveryRef ?? "",
    load.loadContents,
    load.restack ? "Yes" : "No",
    load.crossDock ? "Yes" : "No",
    moneyCell(toNumber(load.baseRate)),
    toNumber(load.fuelSurchargePercent).toFixed(2),
    moneyCell(toNumber(load.fuelAmount)),
    moneyCell(toNumber(load.flatDeckFee)),
    moneyCell(toNumber(load.reloadFee)),
    moneyCell(toNumber(load.restackFee)),
    moneyCell(toNumber(load.blockingFee)),
    moneyCell(toNumber(load.carbonTax)),
    moneyCell(toNumber(load.crossDockAmount)),
    moneyCell(toNumber(load.totalAmount)),
    format(load.createdAt, "yyyy-MM-dd HH:mm"),
    format(load.updatedAt, "yyyy-MM-dd HH:mm"),
    load.id,
  ];
}

async function ensureHeader(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const range = `${tabName()}!A1:${LAST_COL}1`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const first = existing.data.values?.[0] ?? [];
  const matches =
    first.length === SHEET_HEADERS.length &&
    SHEET_HEADERS.every((h, i) => first[i] === h);

  if (matches) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [Array.from(SHEET_HEADERS)] },
  });
}

/**
 * Upsert a load into the mirror sheet (keyed by Outbound # in column A).
 * No-op if Sheets env is not configured.
 */
export async function syncLoadToSheet(load: Load): Promise<
  | { synced: true; row: number }
  | { synced: false; skipped: true }
  | { synced: false; error: string }
> {
  if (!isSheetsConfigured()) {
    return { synced: false, skipped: true };
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!.trim();
    const sheets = await getSheetsClient();
    const tab = tabName();

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const hasTab = meta.data.sheets?.some((s) => s.properties?.title === tab);
    if (!hasTab) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tab } } }],
        },
      });
    }

    await ensureHeader(sheets, spreadsheetId);

    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A:A`,
    });
    const values = colA.data.values ?? [];
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i]?.[0] === load.outboundNumber) {
        rowIndex = i + 1;
        break;
      }
    }

    const row = loadToRow(load);

    if (rowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A${rowIndex}:${LAST_COL}${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
      return { synced: true, row: rowIndex };
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:${LAST_COL}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return { synced: true, row: values.length + 1 };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sheet sync failed";
    return { synced: false, error: message };
  }
}
