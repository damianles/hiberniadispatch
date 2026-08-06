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
 * Column order mirrors the New Load form + dispatch PDF.
 * When this list changes, sync rewrites the whole tab so old rows cannot drift.
 */
export const SHEET_HEADERS = [
  "Outbound #",
  "Status",
  "Van drop",
  "Carrier",
  "Inbound #",
  "Destination",
  "Equipment",
  "Equipment style",
  "Product class",
  "Weight (lbs)",
  "Pickup company",
  "Pickup street",
  "Pickup city",
  "Pickup province",
  "Pickup postal",
  "Pickup phone",
  "Delivery company",
  "Delivery street",
  "Delivery city",
  "Delivery province",
  "Delivery postal",
  "Delivery phone",
  "Delivery ref",
  "Load contents",
  "Restack",
  "Cross dock",
  "Base rate",
  "Fuel %",
  "Fuel $",
  "Flat deck $",
  "Blocking $",
  "Carbon $",
  "Cross dock $",
  "VFS/CDI total",
  "Reload $",
  "Restack $",
  "Transload FSC %",
  "Transload FSC $",
  "Transload total",
  "Accessorial $",
  "Accessorial description",
  "Combined total",
  "Created at",
  "Updated at",
  "Load ID",
] as const;

const COL_COUNT = SHEET_HEADERS.length;

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
    const parsed = parseServiceAccountJson(raw);
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

function parseServiceAccountJson(raw: string): {
  client_email: string;
  private_key: string;
} {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  const candidates = [cleaned];

  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    candidates.push(cleaned.slice(1, -1));
  }

  try {
    const decoded = Buffer.from(cleaned, "base64").toString("utf8").trim();
    if (decoded.startsWith("{")) candidates.push(decoded);
  } catch {
    // ignore
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        client_email?: string;
        private_key?: string;
      };
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error("JSON missing client_email or private_key");
      }
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    } catch (e) {
      lastError = e;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Invalid GOOGLE_SERVICE_ACCOUNT_JSON (${msg}). Re-paste as one line, or set the value to base64 of the key file.`,
  );
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

/** Force text so Sheets does not auto-convert percents/dates into wrong types. */
function textCell(value: string) {
  return value === "" ? "" : `'${value}`;
}

function loadToRow(load: Load): string[] {
  return [
    load.outboundNumber,
    STATUS_LABELS[load.status] ?? load.status,
    textCell(format(load.vanDropDate, "yyyy-MM-dd")),
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
    // Phones often start with "+" which Sheets treats as a formula → #ERROR!
    textCell(load.pickupPhone ?? ""),
    load.deliveryCompany ?? "",
    load.deliveryStreet,
    load.deliveryCity,
    load.deliveryProvince,
    load.deliveryPostal ?? "",
    textCell(load.deliveryPhone ?? ""),
    load.deliveryRef ?? "",
    load.loadContents,
    load.restack ? "Yes" : "No",
    load.crossDock ? "Yes" : "No",
    moneyCell(toNumber(load.baseRate)),
    textCell(toNumber(load.fuelSurchargePercent).toFixed(2)),
    moneyCell(toNumber(load.fuelAmount)),
    moneyCell(toNumber(load.flatDeckFee)),
    moneyCell(toNumber(load.blockingFee)),
    moneyCell(toNumber(load.carbonTax)),
    moneyCell(toNumber(load.crossDockAmount)),
    moneyCell(toNumber(load.carrierTotal)),
    moneyCell(toNumber(load.reloadFee)),
    moneyCell(toNumber(load.restackFee)),
    // FSC % is a small percent (e.g. 21.88), never a dollar total
    textCell(toNumber(load.transloadFuelSurchargePercent).toFixed(2)),
    moneyCell(toNumber(load.transloadFuelAmount)),
    moneyCell(toNumber(load.transloadTotal)),
    moneyCell(toNumber(load.accessorialAmount)),
    load.accessorialDescription ?? "",
    moneyCell(toNumber(load.totalAmount)),
    textCell(format(load.createdAt, "yyyy-MM-dd HH:mm")),
    textCell(format(load.updatedAt, "yyyy-MM-dd HH:mm")),
    load.id,
  ];
}

async function ensureTab(sheets: sheets_v4.Sheets, spreadsheetId: string) {
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
  return tab;
}

async function headersMatch(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
): Promise<boolean> {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:${LAST_COL}1`,
  });
  const first = existing.data.values?.[0] ?? [];
  return (
    first.length === SHEET_HEADERS.length &&
    SHEET_HEADERS.every((h, i) => first[i] === h)
  );
}

/**
 * Wipe the Loads tab and rewrite headers + every load row in current column order.
 * Use after column changes so old rows cannot sit under the wrong headers.
 */
export async function rebuildLoadsSheet(loads: Load[]): Promise<
  | { synced: true; rows: number }
  | { synced: false; skipped: true }
  | { synced: false; error: string }
> {
  if (!isSheetsConfigured()) {
    return { synced: false, skipped: true };
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!.trim();
    const sheets = await getSheetsClient();
    const tab = await ensureTab(sheets, spreadsheetId);

    // Clear a wide block so leftover cells from older (shorter) layouts disappear
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tab}!A:ZZ`,
    });

    const body = [
      Array.from(SHEET_HEADERS),
      ...loads.map((load) => loadToRow(load)),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: body },
    });

    return { synced: true, rows: loads.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sheet rebuild failed";
    return { synced: false, error: message };
  }
}

/**
 * Upsert a load (keyed by Outbound #).
 * If headers are out of date, returns needsRebuild so the caller can rewrite the tab.
 */
export async function syncLoadToSheet(load: Load): Promise<
  | { synced: true; row: number }
  | { synced: false; skipped: true }
  | { synced: false; needsRebuild: true }
  | { synced: false; error: string }
> {
  if (!isSheetsConfigured()) {
    return { synced: false, skipped: true };
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!.trim();
    const sheets = await getSheetsClient();
    const tab = await ensureTab(sheets, spreadsheetId);

    if (!(await headersMatch(sheets, spreadsheetId, tab))) {
      return { synced: false, needsRebuild: true };
    }

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
      // Clear then write so leftover cells from older layouts cannot remain
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${tab}!A${rowIndex}:ZZ${rowIndex}`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A${rowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [row] },
      });
      return { synced: true, row: rowIndex };
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tab}!A:${LAST_COL}`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return { synced: true, row: values.length + 1 };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sheet sync failed";
    return { synced: false, error: message };
  }
}
