import type { Equipment, EquipmentStyle } from "@prisma/client";

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_OPTIONS = [
  "DRAFT",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;

export const PRODUCT_LABELS: Record<string, string> = {
  SIZE_2X4_6_8: "2x4 / 6 / 8",
  SIZE_2X10_12: "2x10 / 12",
  ALL: "All sizes",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  FLAT_DECK: "Flat deck",
  BOX_VAN: "Box van",
};

export const EQUIPMENT_STYLE_LABELS: Record<EquipmentStyle, string> = {
  SUPER_B: "Super B",
  TRI_AXLE: "Tri Axle",
  TANDEM: "Tandem",
  MAXI: "Maxi",
  STEP_DECK_TROMBONE: "Step Deck Trombone",
};

/** Styles available per equipment category */
export const EQUIPMENT_STYLES: Record<Equipment, EquipmentStyle[]> = {
  FLAT_DECK: [
    "SUPER_B",
    "TRI_AXLE",
    "TANDEM",
    "MAXI",
    "STEP_DECK_TROMBONE",
  ],
  BOX_VAN: ["TRI_AXLE", "TANDEM"],
};

export function defaultEquipmentStyle(equipment: Equipment): EquipmentStyle {
  return EQUIPMENT_STYLES[equipment][0];
}

export function isStyleAllowed(
  equipment: Equipment,
  style: EquipmentStyle,
): boolean {
  return EQUIPMENT_STYLES[equipment].includes(style);
}
