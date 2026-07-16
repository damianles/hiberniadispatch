import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { format } from "date-fns";
import type { Load } from "@prisma/client";
import { toNumber } from "@/lib/money";
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_STYLE_LABELS,
} from "@/lib/load-labels";

const sage = rgb(0.36, 0.42, 0.29);
const burgundy = rgb(0.42, 0.18, 0.24);
const ink = rgb(0.11, 0.12, 0.1);
const muted = rgb(0.4, 0.42, 0.38);

function money(n: number) {
  return n.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = ink,
) {
  const width = page.getWidth();
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (width - tw) / 2,
    y,
    size,
    font,
    color,
  });
}

export async function buildDispatchPdf(load: Load): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 48;
  const width = page.getWidth();
  let y = 742;

  // Centered logo
  try {
    const logoPath = path.join(process.cwd(), "public", "hibernia-logo.png");
    const logoBytes = await readFile(logoPath);
    const logo = await doc.embedPng(logoBytes);
    const logoW = 220;
    const logoH = (logo.height / logo.width) * logoW;
    page.drawImage(logo, {
      x: (width - logoW) / 2,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    y -= logoH + 14;
  } catch {
    drawCenteredText(page, "HIBERNIA TRADING INC.", y, fontBold, 16, sage);
    y -= 22;
  }

  drawCenteredText(page, "HIBERNIA TRADING INC.", y, fontBold, 11, sage);
  y -= 28;

  // Title rule
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: sage,
  });
  y -= 28;

  page.drawText(`INTERMODAL DISPATCH: ${load.outboundNumber}`, {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: ink,
  });
  y -= 18;
  page.drawText(`VAN DROP: ${format(load.vanDropDate, "MMMM d, yyyy")}`, {
    x: margin,
    y,
    size: 11,
    font,
    color: muted,
  });
  y -= 28;

  // Two-column addresses
  const colW = (width - margin * 2 - 24) / 2;
  const leftX = margin;
  const rightX = margin + colW + 24;
  const addrTop = y;

  y = drawSectionHeader(page, leftX, y, "PICK UP ADDRESS", fontBold);
  y = drawWrapped(page, leftX, y, load.pickupCompany, fontBold, 10, colW);
  y = drawWrapped(
    page,
    leftX,
    y,
    `${load.pickupStreet}`,
    font,
    10,
    colW,
  );
  y = drawWrapped(
    page,
    leftX,
    y,
    `${load.pickupCity}, ${load.pickupProvince}${load.pickupPostal ? ` ${load.pickupPostal}` : ""}`,
    font,
    10,
    colW,
  );
  if (load.pickupPhone) {
    y = drawWrapped(page, leftX, y, load.pickupPhone, font, 10, colW);
  }
  const leftBottom = y;

  let ry = addrTop;
  ry = drawSectionHeader(page, rightX, ry, "DELIVERY ADDRESS", fontBold);
  const deliveryTitle =
    load.deliveryCompany?.trim() || load.destination;
  ry = drawWrapped(page, rightX, ry, deliveryTitle, fontBold, 10, colW);
  if (load.deliveryCompany?.trim()) {
    ry = drawWrapped(page, rightX, ry, load.destination, font, 9, colW, muted);
  }
  ry = drawWrapped(page, rightX, ry, load.deliveryStreet, font, 10, colW);
  ry = drawWrapped(
    page,
    rightX,
    ry,
    `${load.deliveryCity}, ${load.deliveryProvince}${load.deliveryPostal ? ` ${load.deliveryPostal}` : ""}`,
    font,
    10,
    colW,
  );
  if (load.deliveryRef) {
    ry = drawWrapped(
      page,
      rightX,
      ry,
      `Delivery Ref: ${load.deliveryRef}`,
      font,
      10,
      colW,
    );
  }
  y = Math.min(leftBottom, ry) - 22;

  y = drawSectionHeader(page, margin, y, "SHIPMENT DETAILS", fontBold);
  const flatDeck =
    load.equipment === "FLAT_DECK"
      ? `YES — VIA ${load.carrier}`
      : `NO — BOX VAN VIA ${load.carrier}`;
  const equipmentLine = `${EQUIPMENT_LABELS[load.equipment]} — ${EQUIPMENT_STYLE_LABELS[load.equipmentStyle]}`;
  const details = [
    `INBOUND #: ${load.inboundNumber || "—"}  |  OUTBOUND #: ${load.outboundNumber}`,
    `EQUIPMENT: ${equipmentLine}`,
    `WEIGHT: ${load.weightLbs ? `${load.weightLbs.toLocaleString()} LBS` : "—"}`,
    `FLAT DECK DELIVERY: ${flatDeck}`,
  ];
  const transloadParts: string[] = [];
  if (toNumber(load.reloadFee) > 0) {
    transloadParts.push(`RELOAD ${money(toNumber(load.reloadFee))}`);
  }
  if (load.restack && toNumber(load.restackFee) > 0) {
    transloadParts.push(`RESTACK ${money(toNumber(load.restackFee))}`);
  }
  if (load.crossDock && toNumber(load.crossDockAmount) > 0) {
    transloadParts.push(`CROSS DOCK ${money(toNumber(load.crossDockAmount))}`);
  }
  if (transloadParts.length) {
    details.push(`TRANSLOAD: ${transloadParts.join(" + ")}`);
  }
  for (const line of details) {
    page.drawText(line, { x: margin, y, size: 10, font, color: ink });
    y -= 14;
  }
  y -= 10;

  y = drawSectionHeader(page, margin, y, "RATE BREAKDOWN", fontBold);
  const fuelPct = toNumber(load.fuelSurchargePercent).toFixed(2);
  const breakdown: [string, number][] = [
    [
      `IMS Base Rate (${load.carrier})`,
      toNumber(load.baseRate),
    ],
    [`CP Fuel Surcharge (${fuelPct}%)`, toNumber(load.fuelAmount)],
    ["Carbon Tax", toNumber(load.carbonTax)],
    ["Blocking / Bracing", toNumber(load.blockingFee)],
  ];
  if (toNumber(load.flatDeckFee) > 0) {
    breakdown.push([`Flat Deck (${load.carrier})`, toNumber(load.flatDeckFee)]);
  }
  if (toNumber(load.reloadFee) > 0) {
    breakdown.push(["Reload Fee", toNumber(load.reloadFee)]);
  }
  if (toNumber(load.restackFee) > 0) {
    breakdown.push(["Restack Fee", toNumber(load.restackFee)]);
  }
  if (load.crossDock && toNumber(load.crossDockAmount) > 0) {
    breakdown.push(["Cross Dock", toNumber(load.crossDockAmount)]);
  }

  const amountX = width - margin;
  for (const [label, amount] of breakdown) {
    page.drawText(label, { x: margin, y, size: 10, font, color: ink });
    const amt = money(amount);
    const aw = font.widthOfTextAtSize(amt, 10);
    page.drawText(amt, { x: amountX - aw, y, size: 10, font, color: ink });
    y -= 14;
  }

  y -= 4;
  page.drawLine({
    start: { x: margin, y: y + 10 },
    end: { x: width - margin, y: y + 10 },
    thickness: 0.75,
    color: muted,
  });
  page.drawText("VFS TOTAL", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: burgundy,
  });
  const total = money(toNumber(load.totalAmount));
  const tw = fontBold.widthOfTextAtSize(total, 12);
  page.drawText(total, {
    x: amountX - tw,
    y,
    size: 12,
    font: fontBold,
    color: burgundy,
  });
  y -= 28;

  y = drawSectionHeader(page, margin, y, "LOAD CONTENTS", fontBold);
  y = drawWrapped(page, margin, y, load.loadContents, font, 10, width - margin * 2);

  y -= 36;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: muted,
  });
  y -= 14;
  drawCenteredText(
    page,
    "Hibernia Trading Inc. — Intermodal Dispatch",
    y,
    font,
    8,
    muted,
  );

  return doc.save();
}

function drawSectionHeader(
  page: PDFPage,
  x: number,
  y: number,
  title: string,
  fontBold: PDFFont,
) {
  page.drawText(title, { x, y, size: 9, font: fontBold, color: sage });
  return y - 14;
}

function drawWrapped(
  page: PDFPage,
  x: number,
  y: number,
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  color = ink,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      page.drawText(line, { x, y: cy, size, font, color });
      cy -= size + 3;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= size + 3;
  }
  return cy - 2;
}
