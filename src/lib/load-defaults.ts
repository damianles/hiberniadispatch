/** Default pickup — editable per load if Transload details change. */
export const DEFAULT_PICKUP = {
  pickupCompany: "TRANSLOAD LOGISTICS",
  pickupStreet: "1020 40 Ave NE",
  pickupCity: "Calgary",
  pickupProvince: "AB",
  pickupPostal: "T2E 6Y1",
  pickupPhone: "+1 855-866-6901",
} as const;

/** Confirmed fee master amounts (rate sheet). Blocking & carbon are manual per load. */
export const FEE_AMOUNTS = {
  flatDeckCdi: 375,
  flatDeckFortigo: 450,
  reloadFee: 500,
  restackFee: 100,
} as const;
