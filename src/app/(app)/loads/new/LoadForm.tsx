"use client";

import { useActionState, useMemo, useState } from "react";
import { FuelPercentField } from "@/components/FuelPercentField";
import { DestinationCombobox } from "@/components/DestinationCombobox";
import { AddressTypeahead } from "@/components/AddressTypeahead";
import {
  createLoadAction,
  updateLoadAction,
  type CreateLoadState,
} from "../actions";
import { calcLoadTotal } from "@/lib/rates";
import { money } from "@/lib/money";
import { DEFAULT_PICKUP } from "@/lib/load-defaults";
import type {
  AddressOption,
  FeeDefaults,
  LoadFormInitial,
  RateOption,
} from "@/lib/load-types";
import {
  defaultEquipmentStyle,
  EQUIPMENT_STYLE_LABELS,
  EQUIPMENT_STYLES,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from "@/lib/load-labels";
import type { Equipment, EquipmentStyle } from "@prisma/client";

export type { AddressOption, FeeDefaults, RateOption };

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sage";
const label = "block text-xs font-medium text-ink/70";

type Props = {
  rates: RateOption[];
  addresses: AddressOption[];
  fees: FeeDefaults;
  mode?: "create" | "edit";
  loadId?: string;
  initial?: LoadFormInitial;
};

export function LoadForm({
  rates,
  addresses,
  fees,
  mode = "create",
  loadId,
  initial,
}: Props) {
  const isEdit = mode === "edit";
  const action = isEdit ? updateLoadAction : createLoadAction;
  const [state, formAction, pending] = useActionState<
    CreateLoadState | undefined,
    FormData
  >(action, undefined);

  const [carrier, setCarrier] = useState<"CDI" | "FORTIGO">(
    initial?.carrier ?? "FORTIGO",
  );
  const [productClass, setProductClass] = useState<
    "SIZE_2X4_6_8" | "SIZE_2X10_12"
  >(initial?.productClass ?? "SIZE_2X4_6_8");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [manualBaseRate, setManualBaseRate] = useState(
    initial && initial.baseRate > 0 ? String(initial.baseRate) : "",
  );
  const [equipment, setEquipment] = useState<Equipment>(
    initial?.equipment ?? "FLAT_DECK",
  );
  const [equipmentStyle, setEquipmentStyle] = useState<EquipmentStyle>(
    initial?.equipmentStyle ?? "SUPER_B",
  );
  const [restack, setRestack] = useState(initial?.restack ?? true);
  const [reload, setReload] = useState(initial?.reload ?? false);
  const [blocking, setBlocking] = useState(initial?.blocking ?? false);
  const [blockingFee, setBlockingFee] = useState(initial?.blockingFee ?? 0);
  const [carbonTaxApplied, setCarbonTaxApplied] = useState(
    initial?.carbonTaxApplied ?? false,
  );
  const [carbonTax, setCarbonTax] = useState(initial?.carbonTax ?? 0);
  const [crossDock, setCrossDock] = useState(initial?.crossDock ?? false);
  const [crossDockFee, setCrossDockFee] = useState(initial?.crossDockFee ?? 0);
  const [fuelPercent, setFuelPercent] = useState(
    initial?.fuelSurchargePercent ?? 0,
  );
  const [saveAddress, setSaveAddress] = useState(false);

  const [delivery, setDelivery] = useState({
    deliveryAddressId: initial?.deliveryAddressId ?? "",
    deliveryCompany: initial?.deliveryCompany ?? "",
    deliveryStreet: initial?.deliveryStreet ?? "",
    deliveryCity: initial?.deliveryCity ?? "",
    deliveryProvince: initial?.deliveryProvince ?? "",
    deliveryPostal: initial?.deliveryPostal ?? "",
    deliveryRef: initial?.deliveryRef ?? "",
  });
  const destinations = useMemo(() => {
    const set = new Set<string>();
    for (const r of rates) {
      if (r.carrier !== carrier) continue;
      if (carrier === "CDI" && r.productClass !== productClass) continue;
      if (carrier === "FORTIGO" && r.productClass !== "ALL") continue;
      set.add(r.destination);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rates, carrier, productClass]);

  const matchedRate = useMemo(() => {
    if (!destination.trim()) return null;
    return (
      rates.find((r) => {
        if (r.carrier !== carrier) return false;
        if (r.destination.toLowerCase() !== destination.trim().toLowerCase()) {
          return false;
        }
        if (carrier === "FORTIGO") return r.productClass === "ALL";
        return r.productClass === productClass;
      }) ?? null
    );
  }, [rates, destination, carrier, productClass]);

  const restackAllowed = productClass === "SIZE_2X4_6_8";
  const flatDeckFee =
    equipment === "FLAT_DECK"
      ? carrier === "CDI"
        ? fees.flatDeckCdi
        : fees.flatDeckFortigo
      : 0;
  const reloadFee = reload ? fees.reloadFee : 0;
  const restackFee = restackAllowed && restack ? fees.restackFee : 0;
  const blockingAmount = blocking ? blockingFee : 0;
  const carbonAmount = carbonTaxApplied ? carbonTax : 0;
  const crossDockAmount = crossDock ? crossDockFee : 0;

  const baseRate = matchedRate
    ? matchedRate.baseRate
    : Number(manualBaseRate) || 0;
  const canSave = Boolean(destination.trim() && baseRate > 0);

  const totals = useMemo(
    () =>
      calcLoadTotal({
        baseRate,
        fuelSurchargePercent: fuelPercent,
        flatDeckFee,
        reloadFee,
        restackFee,
        blockingFee: blockingAmount,
        carbonTax: carbonAmount,
        crossDockAmount,
      }),
    [
      baseRate,
      fuelPercent,
      flatDeckFee,
      reloadFee,
      restackFee,
      blockingAmount,
      carbonAmount,
      crossDockAmount,
    ],
  );

  function onCarrierChange(next: "CDI" | "FORTIGO") {
    setCarrier(next);
    setDestination("");
    setManualBaseRate("");
    setRestack(productClass === "SIZE_2X4_6_8");
  }

  function onProductChange(next: "SIZE_2X4_6_8" | "SIZE_2X10_12") {
    setProductClass(next);
    setDestination("");
    setManualBaseRate("");
    setRestack(next === "SIZE_2X4_6_8");
  }

  function onDestinationChange(value: string) {
    setDestination(value);
    const match = rates.find((r) => {
      if (r.carrier !== carrier) return false;
      if (r.destination.toLowerCase() !== value.trim().toLowerCase()) return false;
      if (carrier === "FORTIGO") return r.productClass === "ALL";
      return r.productClass === productClass;
    });
    if (match) {
      setDestination(match.destination);
      setManualBaseRate("");
    }
  }

  function pickAddress(a: AddressOption) {
    const fromMap = a.id.startsWith("osm-");
    setDelivery({
      deliveryAddressId: fromMap ? "" : a.id,
      deliveryCompany: a.companyName ?? "",
      deliveryStreet: a.street,
      deliveryCity: a.city,
      deliveryProvince: a.province,
      deliveryPostal: a.postalCode ?? "",
      deliveryRef: delivery.deliveryRef,
    });
  }

  const cancelHref = isEdit && loadId ? `/loads/${loadId}` : "/";
  const statusDefault = initial?.status ?? "DRAFT";

  return (
    <form action={formAction} className="space-y-8">
      {isEdit && loadId ? (
        <input type="hidden" name="loadId" value={loadId} />
      ) : null}
      <input type="hidden" name="baseRate" value={baseRate || ""} />
      <input type="hidden" name="flatDeckFee" value={flatDeckFee} />
      <input type="hidden" name="reloadFeeMaster" value={fees.reloadFee} />
      <input type="hidden" name="restackFeeMaster" value={fees.restackFee} />
      <input type="hidden" name="fuelSurchargePercent" value={fuelPercent} />
      <input type="hidden" name="carrier" value={carrier} />
      <input type="hidden" name="productClass" value={productClass} />
      <input type="hidden" name="equipment" value={equipment} />
      <input type="hidden" name="equipmentStyle" value={equipmentStyle} />
      <input
        type="hidden"
        name="restack"
        value={restackAllowed && restack ? "true" : "false"}
      />
      <input type="hidden" name="reload" value={reload ? "true" : "false"} />
      <input type="hidden" name="blocking" value={blocking ? "true" : "false"} />
      <input
        type="hidden"
        name="carbonTaxApplied"
        value={carbonTaxApplied ? "true" : "false"}
      />
      <input type="hidden" name="crossDock" value={crossDock ? "true" : "false"} />
      <input
        type="hidden"
        name="deliveryAddressId"
        value={delivery.deliveryAddressId}
      />
      {state?.error ? (
        <div className="border border-burgundy/40 bg-burgundy/5 px-4 py-3 text-sm text-burgundy">
          {state.error}
        </div>
      ) : null}

      <section className="border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Shipment</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label} htmlFor="outboundNumber">
              Outbound #
            </label>
            <input
              id="outboundNumber"
              name="outboundNumber"
              required
              placeholder="S555555"
              defaultValue={initial?.outboundNumber}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="inboundNumber">
              Inbound # (Mill / PO)
            </label>
            <input
              id="inboundNumber"
              name="inboundNumber"
              defaultValue={initial?.inboundNumber}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="vanDropDate">
              Van drop date
            </label>
            <input
              id="vanDropDate"
              name="vanDropDate"
              type="date"
              required
              defaultValue={initial?.vanDropDate}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusDefault}
              className={field}
            >
              {isEdit ? (
                STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))
              ) : (
                <>
                  <option value="DRAFT">Draft</option>
                  <option value="DISPATCHED">Dispatched</option>
                </>
              )}
            </select>
          </div>
        </div>
      </section>
      <section className="border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Carrier & rate</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className={label}>Delivery through</span>
            <div className="mt-2 flex gap-2">
              {(["FORTIGO", "CDI"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCarrierChange(c)}
                  className={`flex-1 border px-3 py-2 text-sm ${
                    carrier === c
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {c === "FORTIGO" ? "Fortigo" : "CDI"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Product size</span>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["SIZE_2X4_6_8", "2x4 / 6 / 8"],
                  ["SIZE_2X10_12", "2x10 / 12"],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onProductChange(value)}
                  className={`flex-1 border px-3 py-2 text-sm ${
                    productClass === value
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink/50">
              Same size choice for CDI and Fortigo. Restack ($100) only applies to
              2x4 / 6 / 8.
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <span className={label}>Equipment</span>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["FLAT_DECK", "Flat deck"],
                  ["BOX_VAN", "Box van"],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setEquipment(value);
                    setEquipmentStyle(defaultEquipmentStyle(value));
                  }}
                  className={`flex-1 border px-3 py-2 text-sm sm:max-w-[10rem] ${
                    equipment === value
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <span className={label}>
                {equipment === "FLAT_DECK" ? "Flat deck type" : "Box van type"}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {EQUIPMENT_STYLES[equipment].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setEquipmentStyle(style)}
                    className={`border px-3 py-2 text-sm ${
                      equipmentStyle === style
                        ? "border-sage bg-sage text-white"
                        : "border-line bg-white text-ink/80"
                    }`}
                  >
                    {EQUIPMENT_STYLE_LABELS[style]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className={label} htmlFor="destination">
              Destination
            </label>
            <DestinationCombobox
              destinations={destinations}
              value={destination}
              onChange={onDestinationChange}
            />
            <p className="mt-1 text-xs text-ink/50">
              Type to search the rate list, or enter a new destination manually.
            </p>
            {matchedRate ? (
              <p className="mt-1 text-xs text-ink/55">
                Base rate ({carrier === "CDI" ? "IMS" : "Fortigo"}):{" "}
                <span className="font-medium text-sage-dark">
                  {money(matchedRate.baseRate)}
                </span>
              </p>
            ) : null}
            {!matchedRate && destination.trim() ? (
              <div className="mt-3 max-w-xs">
                <label className={label} htmlFor="manualBaseRate">
                  Manual base rate ($)
                </label>
                <input
                  id="manualBaseRate"
                  type="number"
                  min={0.01}
                  step={0.01}
                  required
                  placeholder="Enter base rate"
                  className={field}
                  value={manualBaseRate}
                  onChange={(e) => setManualBaseRate(e.target.value)}
                />
                <p className="mt-1 text-xs text-burgundy">
                  Not in the rate sheet for this carrier — enter the base rate to
                  continue.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Pickup</h2>
        <p className="mt-1 text-xs text-ink/50">
          Defaults to Transload Logistics — edit if needed.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="pickupCompany">
              Company
            </label>
            <input
              id="pickupCompany"
              name="pickupCompany"
              required
              defaultValue={
                initial?.pickupCompany ?? DEFAULT_PICKUP.pickupCompany
              }
              className={field}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="pickupStreet">
              Street
            </label>
            <input
              id="pickupStreet"
              name="pickupStreet"
              required
              defaultValue={
                initial?.pickupStreet ?? DEFAULT_PICKUP.pickupStreet
              }
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="pickupCity">
              City
            </label>
            <input
              id="pickupCity"
              name="pickupCity"
              required
              defaultValue={initial?.pickupCity ?? DEFAULT_PICKUP.pickupCity}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="pickupProvince">
              Province
            </label>
            <input
              id="pickupProvince"
              name="pickupProvince"
              required
              defaultValue={
                initial?.pickupProvince ?? DEFAULT_PICKUP.pickupProvince
              }
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="pickupPostal">
              Postal
            </label>
            <input
              id="pickupPostal"
              name="pickupPostal"
              defaultValue={
                initial?.pickupPostal ?? DEFAULT_PICKUP.pickupPostal
              }
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="pickupPhone">
              Phone
            </label>
            <input
              id="pickupPhone"
              name="pickupPhone"
              defaultValue={
                initial?.pickupPhone ?? DEFAULT_PICKUP.pickupPhone
              }
              className={field}
            />
          </div>        </div>
      </section>

      <section className="border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Delivery address</h2>
        <p className="mt-1 text-xs text-ink/50">
          Start typing — saved favourites appear first, then OpenStreetMap street
          suggestions for new addresses (no Google account needed).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="deliveryCompany">
              Company / name
            </label>
            <AddressTypeahead
              id="deliveryCompany"
              name="deliveryCompany"
              addresses={addresses}
              value={delivery.deliveryCompany}
              placeholder="Type company, nickname, or street…"
              onChange={(v) =>
                setDelivery((d) => ({
                  ...d,
                  deliveryCompany: v,
                  deliveryAddressId: "",
                }))
              }
              onPick={pickAddress}
            />
          </div>
          <div>
            <label className={label} htmlFor="deliveryRef">
              Delivery ref
            </label>
            <input
              id="deliveryRef"
              name="deliveryRef"
              className={field}
              value={delivery.deliveryRef}
              onChange={(e) =>
                setDelivery((d) => ({ ...d, deliveryRef: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label} htmlFor="deliveryStreet">
              Street
            </label>
            <AddressTypeahead
              id="deliveryStreet"
              name="deliveryStreet"
              required
              addresses={addresses}
              value={delivery.deliveryStreet}
              placeholder="Type a street address…"
              onChange={(v) =>
                setDelivery((d) => ({
                  ...d,
                  deliveryStreet: v,
                  deliveryAddressId: "",
                }))
              }
              onPick={pickAddress}
            />
          </div>
          <div>
            <label className={label} htmlFor="deliveryCity">
              City
            </label>
            <input
              id="deliveryCity"
              name="deliveryCity"
              required
              className={field}
              value={delivery.deliveryCity}
              onChange={(e) =>
                setDelivery((d) => ({ ...d, deliveryCity: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={label} htmlFor="deliveryProvince">
              Province
            </label>
            <input
              id="deliveryProvince"
              name="deliveryProvince"
              required
              className={field}
              value={delivery.deliveryProvince}
              onChange={(e) =>
                setDelivery((d) => ({ ...d, deliveryProvince: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={label} htmlFor="deliveryPostal">
              Postal
            </label>
            <input
              id="deliveryPostal"
              name="deliveryPostal"
              className={field}
              value={delivery.deliveryPostal}
              onChange={(e) =>
                setDelivery((d) => ({ ...d, deliveryPostal: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-end gap-4 border-t border-line/60 pt-4">
            <label className="flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                name="saveAddress"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
              />
              Save as favourite address
            </label>
            {saveAddress ? (
              <div className="min-w-[12rem] flex-1">
                <label className={label} htmlFor="addressNickname">
                  Nickname
                </label>
                <input
                  id="addressNickname"
                  name="addressNickname"
                  required={saveAddress}
                  placeholder="e.g. Stoney Creek yard"
                  className={field}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Load & fees</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="loadContents">
              Load contents
            </label>
            <textarea
              id="loadContents"
              name="loadContents"
              required
              rows={3}
              placeholder="e.g. 2x12 #2btr 8/8 5/10…"
              defaultValue={initial?.loadContents}
              className={field}
            />
            <p className="mt-1 text-xs text-ink/50">
              Free text for the tally — separate from the rate product class above.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="weightLbs">
              Weight (lbs)
            </label>
            <input
              id="weightLbs"
              name="weightLbs"
              type="number"
              min={1}
              placeholder="60000"
              defaultValue={initial?.weightLbs ?? undefined}
              className={field}
            />
          </div>

          <div className="sm:col-span-2">
            <FuelPercentField value={fuelPercent} onChange={setFuelPercent} />
          </div>

          <div>
            <span className={label}>Reload</span>
            <div className="mt-2 flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setReload(v)}
                  className={`flex-1 border px-3 py-2 text-sm ${
                    reload === v
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink/50">
              {reload ? `Adds ${money(fees.reloadFee)}` : "Not included"}
            </p>
          </div>

          <div>
            <span className={label}>Restack</span>
            {restackAllowed ? (
              <>
                <div className="mt-2 flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setRestack(v)}
                      className={`flex-1 border px-3 py-2 text-sm ${
                        restack === v
                          ? "border-sage bg-sage text-white"
                          : "border-line bg-white text-ink/80"
                      }`}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  {restack ? `Adds ${money(fees.restackFee)}` : "Not included"}
                </p>
              </>
            ) : (
              <p className="mt-2 border border-line bg-paper-deep/40 px-3 py-2 text-sm text-ink/60">
                Not available for 2x10 / 12
              </p>
            )}
          </div>

          <div>
            <span className={label}>Blocking / bracing</span>
            <div className="mt-2 flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setBlocking(v)}
                  className={`flex-1 border px-3 py-2 text-sm ${
                    blocking === v
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {blocking ? (
              <div className="mt-2">
                <label className={label} htmlFor="blockingFee">
                  Amount ($)
                </label>
                <input
                  id="blockingFee"
                  name="blockingFee"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={blockingFee || ""}
                  onChange={(e) => setBlockingFee(Number(e.target.value) || 0)}
                  className={field}
                  required
                />
              </div>
            ) : (
              <input type="hidden" name="blockingFee" value={0} />
            )}
          </div>

          <div>
            <span className={label}>Carbon tax</span>
            <div className="mt-2 flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setCarbonTaxApplied(v)}
                  className={`flex-1 border px-3 py-2 text-sm ${
                    carbonTaxApplied === v
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {carbonTaxApplied ? (
              <div className="mt-2">
                <label className={label} htmlFor="carbonTax">
                  Amount ($)
                </label>
                <input
                  id="carbonTax"
                  name="carbonTax"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={carbonTax || ""}
                  onChange={(e) => setCarbonTax(Number(e.target.value) || 0)}
                  className={field}
                  required
                />
              </div>
            ) : (
              <input type="hidden" name="carbonTax" value={0} />
            )}
          </div>

          <div>
            <span className={label}>Cross dock</span>
            <div className="mt-2 flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setCrossDock(v)}
                  className={`flex-1 border px-3 py-2 text-sm ${
                    crossDock === v
                      ? "border-sage bg-sage text-white"
                      : "border-line bg-white text-ink/80"
                  }`}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {crossDock ? (
              <div className="mt-2">
                <label className={label} htmlFor="crossDockFee">
                  Cross dock amount ($)
                </label>
                <input
                  id="crossDockFee"
                  name="crossDockFee"
                  type="number"
                  min={0}
                  step={0.01}
                  value={crossDockFee}
                  onChange={(e) => setCrossDockFee(Number(e.target.value) || 0)}
                  className={field}
                />
              </div>
            ) : (
              <input type="hidden" name="crossDockFee" value={0} />
            )}
          </div>
        </div>
      </section>

      <section className="border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Rate breakdown</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row
            label={`Base (${carrier === "CDI" ? "IMS" : "Fortigo"}${matchedRate ? "" : ", manual"})`}
            value={money(baseRate)}
          />
          <Row
            label={`Fuel surcharge (${fuelPercent.toFixed(2)}%)`}
            value={money(totals.fuelAmount)}
          />
          <Row label="Flat deck" value={money(flatDeckFee)} />
          <Row label="Reload" value={money(reloadFee)} />
          <Row label="Restack" value={money(restackFee)} />
          <Row label="Blocking / bracing" value={money(blockingAmount)} />
          <Row label="Carbon tax" value={money(carbonAmount)} />
          {crossDock ? (
            <Row label="Cross dock" value={money(crossDockAmount)} />
          ) : null}
          <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
            <dt>VFS total</dt>
            <dd className="font-brand text-xl text-sage-dark">
              {money(totals.totalAmount)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <a
          href={cancelHref}
          className="border border-line px-4 py-2 text-sm text-ink/70 hover:border-sage"
        >
          Cancel
        </a>
        <button
          type="submit"
          disabled={pending || !canSave}
          className="bg-burgundy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create load"}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-1.5">
      <dt className="text-ink/70">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
