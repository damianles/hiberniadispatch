/**
 * Costing:
 * - Carrier (VFS / CDI): base + fuel$ + flat deck + blocking + carbon + cross dock
 * - Transload Logistics: reload + restack + FSC% on (reload+restack) only
 * - Accessorial: manual adhoc amount (description required when > 0)
 * - Combined total = carrier + transload + accessorial
 * Carrier fuel % applies to base rate only.
 * Transload FSC % applies to reload+restack only.
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
  transloadFuelSurchargePercent: number;
  accessorialAmount: number;
};

export function normalizeFuelPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(100, Math.max(0, value)) * 100) / 100;
}

export function calcFuelAmount(base: number, fuelSurchargePercent: number) {
  const pct = normalizeFuelPercent(fuelSurchargePercent);
  return roundMoney(base * (pct / 100));
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

  const transloadFees = roundMoney(input.reloadFee + input.restackFee);
  const transloadFuelAmount = calcFuelAmount(
    transloadFees,
    input.transloadFuelSurchargePercent,
  );
  const transloadTotal = roundMoney(transloadFees + transloadFuelAmount);

  const accessorialAmount = roundMoney(Math.max(0, input.accessorialAmount));
  const totalAmount = roundMoney(
    carrierTotal + transloadTotal + accessorialAmount,
  );

  return {
    fuelAmount,
    carrierTotal,
    transloadFuelAmount,
    transloadTotal,
    accessorialAmount,
    totalAmount,
  };
}

/** Display label for the carrier bucket (Fortigo = VFS, CDI = CDI). */
export function carrierTotalLabel(carrier: "CDI" | "FORTIGO" | string) {
  return carrier === "CDI" ? "CDI total" : "VFS total";
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}
