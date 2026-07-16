"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AddressOption } from "@/lib/load-types";
import type { SuggestedAddress } from "@/lib/address-suggest";

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sage";

type Props = {
  addresses: AddressOption[];
  value: string;
  onChange: (value: string) => void;
  onPick: (address: AddressOption) => void;
  name: string;
  id: string;
  placeholder?: string;
  required?: boolean;
};

function matches(a: AddressOption, q: string) {
  const hay = [a.nickname, a.companyName ?? "", a.street, a.city, a.province]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function toOption(s: SuggestedAddress): AddressOption {
  return {
    id: s.id,
    nickname: s.nickname,
    companyName: s.companyName,
    street: s.street,
    city: s.city,
    province: s.province,
    postalCode: s.postalCode,
    isFavorite: Boolean(s.isFavorite),
  };
}

/**
 * Typeahead: saved favourites first, then OpenStreetMap (Photon) for new streets.
 * No Google API / API key required.
 */
export function AddressTypeahead({
  addresses,
  value,
  onChange,
  onPick,
  name,
  id,
  placeholder,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [osm, setOsm] = useState<SuggestedAddress[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const saved = useMemo(() => {
    const q = value.trim();
    if (q.length < 1) {
      return addresses.filter((a) => a.isFavorite).slice(0, 6);
    }
    return addresses.filter((a) => matches(a, q)).slice(0, 6);
  }, [addresses, value]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setOsm([]);
      setLookingUp(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLookingUp(true);
      try {
        const res = await fetch(
          `/api/address-suggest?q=${encodeURIComponent(q)}`,
          { signal: ac.signal },
        );
        if (!res.ok) {
          setOsm([]);
          return;
        }
        const data = (await res.json()) as { suggestions?: SuggestedAddress[] };
        setOsm(data.suggestions ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setOsm([]);
      } finally {
        setLookingUp(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [value]);

  const hasList = saved.length > 0 || osm.length > 0 || lookingUp;

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
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
      {open && hasList ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-line bg-white shadow-sm">
          {saved.length > 0 ? (
            <li className="border-b border-line bg-paper-deep/40 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-ink/45">
              Saved
            </li>
          ) : null}
          {saved.map((a) => (
            <li key={`saved-${a.id}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-deep/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(a);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-sage-dark">
                  {a.nickname}
                  {a.isFavorite ? " ★" : ""}
                </span>
                <span className="mt-0.5 block text-xs text-ink/55">
                  {[a.companyName, a.street, a.city, a.province]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}

          {lookingUp ? (
            <li className="px-3 py-2 text-xs text-ink/45">Searching maps…</li>
          ) : null}

          {osm.length > 0 ? (
            <li className="border-b border-t border-line bg-paper-deep/40 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-ink/45">
              Map suggestions
            </li>
          ) : null}
          {osm.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-deep/60"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(toOption(s));
                  setOpen(false);
                }}
              >
                <span className="font-medium text-ink">{s.label}</span>
                <span className="mt-0.5 block text-xs text-ink/45">
                  OpenStreetMap
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
