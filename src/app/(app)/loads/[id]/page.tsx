import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { money, toNumber } from "@/lib/money";
import { isMailConfigured } from "@/lib/mail";
import { isSheetsConfigured } from "@/lib/google-sheets";
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_STYLE_LABELS,
  PRODUCT_LABELS,
  STATUS_LABELS,
} from "@/lib/load-labels";
import { StatusForm } from "./StatusForm";
import { SendDispatchForm } from "./SendDispatchForm";
import { SheetSyncButton } from "./SheetSyncButton";

export default async function LoadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [load, contacts] = await Promise.all([
    prisma.load.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true } },
      },
    }),
    prisma.contact.findMany({
      orderBy: [{ isFavorite: "desc" }, { nickname: "asc" }],
    }),
  ]);

  if (!load) notFound();

  const n = toNumber;
  const rows = [
    {
      label: `Base (${load.carrier === "CDI" ? "IMS" : "Fortigo"})`,
      value: money(n(load.baseRate)),
    },
    {
      label: `Fuel surcharge (${n(load.fuelSurchargePercent).toFixed(2)}%)`,
      value: money(n(load.fuelAmount)),
    },
    { label: "Flat deck", value: money(n(load.flatDeckFee)) },
    { label: "Reload", value: money(n(load.reloadFee)) },
    { label: "Restack", value: money(n(load.restackFee)) },
    { label: "Blocking / bracing", value: money(n(load.blockingFee)) },
    { label: "Carbon tax", value: money(n(load.carbonTax)) },
  ];
  if (load.crossDock) {
    rows.push({
      label: "Cross dock",
      value: money(n(load.crossDockAmount)),
    });
  }

  const contactOptions = contacts.map((c) => ({
    id: c.id,
    nickname: c.nickname,
    name: c.name,
    email: c.email,
    isFavorite: c.isFavorite,
  }));

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink/50">
            <Link href="/" className="hover:text-sage-dark">
              Loads
            </Link>
            <span className="mx-2">/</span>
            {load.outboundNumber}
          </p>
          <h1 className="font-brand mt-1 text-3xl text-sage-dark">
            {load.outboundNumber}
          </h1>
          <p className="mt-2 text-ink/60">
            {load.destination} · {load.carrier} · {STATUS_LABELS[load.status]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/loads/${load.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-burgundy px-4 py-2 text-sm font-medium text-white transition hover:bg-burgundy-hover"
          >
            View dispatch PDF
          </a>
          <Link
            href="/loads/new"
            className="border border-line px-3 py-2 text-sm text-ink/70 hover:border-sage"
          >
            New load
          </Link>
        </div>
      </div>

      {sp.created ? (
        <p className="mt-4 border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark">
          Load created successfully.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Lifecycle</h2>
          <div className="mt-4">
            <StatusForm loadId={load.id} current={load.status} />
          </div>
          <p className="mt-3 text-xs text-ink/45">
            Created by {load.createdBy.name} · Last updated by{" "}
            {load.updatedBy.name}
            {load.dispatchedAt
              ? ` · Dispatched ${format(load.dispatchedAt, "MMM d, yyyy h:mm a")}`
              : null}
          </p>
          <div className="mt-4 border-t border-line/60 pt-4">
            <p className="mb-2 text-xs font-medium text-ink/55">Google Sheet mirror</p>
            <SheetSyncButton
              loadId={load.id}
              sheetsConfigured={isSheetsConfigured()}
            />
          </div>
        </div>

        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Send dispatch</h2>
          <p className="mt-1 text-xs text-ink/50">
            For now: open the PDF, then attach it in Outlook to whoever you need.
            In-app email can be added later.
          </p>
          <div className="mt-4 space-y-3">
            <a
              href={`/api/loads/${load.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-sage-dark"
            >
              Open PDF to attach in Outlook
            </a>
            <details className="text-sm text-ink/60">
              <summary className="cursor-pointer text-ink/70 hover:text-sage-dark">
                In-app email (coming later)
              </summary>
              <div className="mt-3">
                <SendDispatchForm
                  loadId={load.id}
                  outboundNumber={load.outboundNumber}
                  contacts={contactOptions}
                  mailConfigured={isMailConfigured()}
                />
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Shipment</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Info label="Inbound #" value={load.inboundNumber || "—"} />
            <Info
              label="Van drop"
              value={format(load.vanDropDate, "MMMM d, yyyy")}
            />
            <Info label="Carrier" value={load.carrier} />
            <Info
              label="Product class"
              value={PRODUCT_LABELS[load.productClass] ?? load.productClass}
            />
            <Info
              label="Equipment"
              value={`${EQUIPMENT_LABELS[load.equipment]} — ${EQUIPMENT_STYLE_LABELS[load.equipmentStyle]}`}
            />
            <Info
              label="Weight"
              value={
                load.weightLbs
                  ? `${load.weightLbs.toLocaleString()} lbs`
                  : "—"
              }
            />
            <Info label="Restack" value={load.restack ? "Yes" : "No"} />
            <Info
              label="Cross dock"
              value={
                load.crossDock
                  ? `Yes (${money(n(load.crossDockAmount))})`
                  : "No"
              }
            />
          </dl>
        </div>

        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Addresses</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
                Pickup
              </p>
              <p className="mt-1 font-medium">{load.pickupCompany}</p>
              <p className="text-ink/70">
                {load.pickupStreet}
                <br />
                {load.pickupCity}, {load.pickupProvince}{" "}
                {load.pickupPostal || ""}
                {load.pickupPhone ? (
                  <>
                    <br />
                    {load.pickupPhone}
                  </>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
                Delivery
              </p>
              <p className="mt-1 font-medium">
                {load.deliveryCompany || load.destination}
              </p>
              <p className="text-ink/70">
                {load.deliveryStreet}
                <br />
                {load.deliveryCity}, {load.deliveryProvince}{" "}
                {load.deliveryPostal || ""}
                {load.deliveryRef ? (
                  <>
                    <br />
                    Ref: {load.deliveryRef}
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-ink/50">
                Rate destination: {load.destination}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Load contents</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink/80">
          {load.loadContents}
        </p>
      </div>

      <div className="mt-6 border border-line bg-white/80 p-5">
        <h2 className="font-brand text-xl text-burgundy">Rate breakdown</h2>
        <dl className="mt-4 space-y-2 text-sm">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex justify-between border-b border-line/50 py-1.5"
            >
              <dt className="text-ink/70">{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
            <dt>VFS total</dt>
            <dd className="font-brand text-xl text-sage-dark">
              {money(n(load.totalAmount))}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/40 py-1.5">
      <dt className="text-ink/55">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
