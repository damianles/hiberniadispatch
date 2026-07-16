"use client";

import { useMemo, useRef, useState } from "react";

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sage";

type Props = {
  destinations: string[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
};

/** Filter known destinations as you type, or enter a new one manually. */
export function DestinationCombobox({
  destinations,
  value,
  onChange,
  name = "destination",
  id = "destination",
}: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter((d) => d.toLowerCase().includes(q));
  }, [destinations, value]);

  const exactMatch = destinations.some(
    (d) => d.toLowerCase() === value.trim().toLowerCase(),
  );

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        required
        autoComplete="off"
        placeholder="Type to search or enter a new destination…"
        className={field}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto border border-line bg-white shadow-sm">
          {suggestions.length > 0 && !value.trim() ? (
            <li className="sticky top-0 border-b border-line bg-paper-deep/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink/45">
              {suggestions.length} destinations for this carrier — scroll or type
              to filter
            </li>
          ) : null}
          {suggestions.map((d) => (
            <li key={d}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-deep/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
              >
                {d}
              </button>
            </li>
          ))}
          {value.trim() && !exactMatch ? (
            <li>
              <button
                type="button"
                className="block w-full border-t border-line px-3 py-2 text-left text-sm text-burgundy hover:bg-paper-deep/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(value.trim());
                  setOpen(false);
                }}
              >
                Use “{value.trim()}” (manual — enter base rate below)
              </button>
            </li>
          ) : null}
          {suggestions.length === 0 && !value.trim() ? (
            <li className="px-3 py-2 text-sm text-ink/50">Start typing…</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
