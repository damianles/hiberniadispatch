"use client";

import { useMemo } from "react";
import { normalizeFuelPercent } from "@/lib/rates";

const WHOLE = Array.from({ length: 101 }, (_, i) => i); // 0–100
const HUNDREDTHS = Array.from({ length: 100 }, (_, i) => i); // 00–99

export function formatFuelPercent(value: number): string {
  return normalizeFuelPercent(value).toFixed(2);
}

type FuelPercentFieldProps = {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Easy fuel % picker with 2 decimal places.
 * Two menus: whole percent (0–100) + hundredths (.00–.99),
 * plus a typed field for pasting values like 21.88.
 */
export function FuelPercentField({
  id = "fuel-percent",
  name,
  value,
  onChange,
  disabled,
  className = "",
}: FuelPercentFieldProps) {
  const normalized = normalizeFuelPercent(value);
  const whole = Math.floor(normalized);
  const hundredths = Math.round((normalized - whole) * 100);

  const selectClass =
    "border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sage disabled:opacity-50";

  const combined = useMemo(
    () => formatFuelPercent(whole + hundredths / 100),
    [whole, hundredths],
  );

  function setFromParts(nextWhole: number, nextHundredths: number) {
    onChange(normalizeFuelPercent(nextWhole + nextHundredths / 100));
  }

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className}`}>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-whole`} className="text-xs font-medium text-ink/70">
          Fuel %
        </label>
        <div className="flex items-center gap-1">
          <select
            id={`${id}-whole`}
            aria-label="Fuel percent whole number"
            className={`${selectClass} min-w-[4.5rem]`}
            value={whole}
            disabled={disabled}
            onChange={(e) => setFromParts(Number(e.target.value), hundredths)}
          >
            {WHOLE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-ink/50" aria-hidden>
            .
          </span>
          <select
            id={`${id}-hundredths`}
            aria-label="Fuel percent hundredths"
            className={`${selectClass} min-w-[4.5rem]`}
            value={hundredths}
            disabled={disabled}
            onChange={(e) => setFromParts(whole, Number(e.target.value))}
          >
            {HUNDREDTHS.map((n) => (
              <option key={n} value={n}>
                {String(n).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="pl-1 text-sm text-ink/60">%</span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-typed`} className="text-xs font-medium text-ink/70">
          Or type
        </label>
        <input
          id={`${id}-typed`}
          name={name}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.01}
          disabled={disabled}
          className={`${selectClass} w-[7.5rem]`}
          value={combined}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value === "") return;
            onChange(normalizeFuelPercent(n));
          }}
        />
      </div>
    </div>
  );
}
