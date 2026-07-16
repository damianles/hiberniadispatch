/**
 * Load total = base rate + fuel$ + selected fee lines.
 * Fuel % is always per-load (never from FeeSettings), up to 2 decimal places (e.g. 21.88).
 */
export type LoadRateInput = {
  baseRate: number;
  fuelSurchargePercent: number; // 0.00–100.00, chosen on the form
  flatDeckFee: number;
  reloadFee: number;
  restackFee: number; // 0 when restack is No
  blockingFee: number;
  carbonTax: number;
  crossDockAmount: number; // 0 when cross dock is No
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
  const totalAmount = roundMoney(
    input.baseRate +
      fuelAmount +
      input.flatDeckFee +
      input.reloadFee +
      input.restackFee +
      input.blockingFee +
      input.carbonTax +
      input.crossDockAmount,
  );
  return { fuelAmount, totalAmount };
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}
