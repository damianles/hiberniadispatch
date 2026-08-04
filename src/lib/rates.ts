/**
 * Load total = base + fuel$ + selected fee lines.
 * Fuel % applies to base rate only (never to fees).
 */
export type LoadRateInput = {
  baseRate: number;
  fuelSurchargePercent: number; // 0.00–100.00, per load
  flatDeckFee: number; // CDI $375 / Fortigo $450 when flat deck; else 0
  reloadFee: number; // $500 when reload Yes; else 0
  restackFee: number; // $100 when restack Yes on 2x4/6/8; else 0
  blockingFee: number; // manual when blocking Yes; else 0
  carbonTax: number; // manual when carbon Yes; else 0
  crossDockAmount: number; // manual when cross dock Yes; else 0
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
