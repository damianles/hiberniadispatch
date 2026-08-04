/**
 * Costing:
 * - Carrier (VFS / CDI): base + fuel$ + flat deck + blocking + carbon + cross dock
 * - Transload Logistics: reload + restack (only when selected)
 * - Combined total = carrier + transload
 * Fuel % applies to base rate only.
 */
export type LoadRateInput = {
  baseRate: number;
  fuelSurchargePercent: number;
  flatDeckFee: number;
  reloadFee: number;
  restackFee: number;
  blockingFee: number;
  carbonTax: number;
  crossDockAmount: number;
};

export function normalizeFuelPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
}

export function calcFuelAmount(baseRate: number, fuelSurchargePercent: number) {
  const pct = normalizeFuelPercent(fuelSurchargePercent);
  return roundMoney(baseRate * (pct / 100));
}

export function calcLoadTotal(input: LoadRateInput) {
  const fuelAmount = calcFuelAmount(input.baseRate, input.fuelSurchargePercent);
  const carrierTotal = roundMoney(
    input.baseRate +
      fuelAmount +
      input.flatDeckFee +
      input.blockingFee +
      input.carbonTax +
      input.crossDockAmount,
  );
  const transloadTotal = roundMoney(input.reloadFee + input.restackFee);
  const totalAmount = roundMoney(carrierTotal + transloadTotal);
  return { fuelAmount, carrierTotal, transloadTotal, totalAmount };
}

/** Display label for the carrier bucket (Fortigo = VFS, CDI = CDI). */
export function carrierTotalLabel(carrier: "CDI" | "FORTIGO" | string) {
  return carrier === "CDI" ? "CDI total" : "VFS total";
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}
