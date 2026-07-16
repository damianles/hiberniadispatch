import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, toNumber } from "@/lib/money";
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/load-labels";
import { format } from "date-fns";
import type { Carrier, LoadStatus, Prisma } from "@prisma/client";

type SearchParams = {
  q?: string;
  origin?: string;
  destination?: string;
  customer?: string;
  createdBy?: string;
  status?: string;
  carrier?: string;
};

function trim(v: string | undefined) {
  return v?.trim() ?? "";
}

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = trim(sp.q);
  const origin = trim(sp.origin);
  const destination = trim(sp.destination);
  const customer = trim(sp.customer);
  const createdBy = trim(sp.createdBy);
  const status = trim(sp.status);
  const carrier = trim(sp.carrier);

  const where: Prisma.LoadWhereInput = {};
  const and: Prisma.LoadWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { outboundNumber: { contains: q, mode: "insensitive" } },
        { inboundNumber: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (origin) {
    and.push({
      OR: [
        { pickupCity: { contains: origin, mode: "insensitive" } },
        { pickupCompany: { contains: origin, mode: "insensitive" } },
        { pickupProvince: { contains: origin, mode: "insensitive" } },
      ],
    });
  }
  if (destination) {
    and.push({ destination: { contains: destination, mode: "insensitive" } });
  }
  if (customer) {
    and.push({
      OR: [
        { pickupCompany: { contains: customer, mode: "insensitive" } },
        { deliveryCompany: { contains: customer, mode: "insensitive" } },
      ],
    });
  }
  if (createdBy) {
    and.push({ createdById: createdBy });
  }
  if (status && STATUS_OPTIONS.includes(status as (typeof STATUS_OPTIONS)[number])) {
    and.push({ status: status as LoadStatus });
  }
  if (carrier === "CDI" || carrier === "FORTIGO") {
    and.push({ carrier: carrier as Carrier });
  }
  if (and.length) where.AND = and;

  const hasFilters = Boolean(
    q || origin || destination || customer || createdBy || status || carrier,
  );

  const [loads, creators, totalMatching] = await Promise.all([
    prisma.load.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.load.count({ where }),
  ]);

  const fieldClass =
    "mt-1 w-full border border-line bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-sage";
  const labelClass = "block text-xs font-medium uppercase tracking-wide text-ink/55";

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl text-sage-dark">Loads</h1>
          <p className="mt-2 text-ink/60">
            Shared board for the whole team — filter to find a dispatch
          </p>
        </div>
        <Link
          href="/loads/new"
          className="bg-burgundy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy-hover"
        >
          New load
        </Link>
      </div>

      <form
        method="get"
        className="mt-8 grid gap-3 border border-line bg-white/80 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="block">
          <span className={labelClass}>Outbound / inbound #</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search number"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Origin</span>
          <input
            name="origin"
            defaultValue={origin}
            placeholder="City or pickup company"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Destination</span>
          <input
            name="destination"
            defaultValue={destination}
            placeholder="Destination"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Customer</span>
          <input
            name="customer"
            defaultValue={customer}
            placeholder="Pickup or delivery company"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Created by</span>
          <select name="createdBy" defaultValue={createdBy} className={fieldClass}>
            <option value="">Anyone</option>
            {creators.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Status</span>
          <select name="status" defaultValue={status} className={fieldClass}>
            <option value="">Any status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Carrier</span>
          <select name="carrier" defaultValue={carrier} className={fieldClass}>
            <option value="">Any carrier</option>
            <option value="CDI">CDI</option>
            <option value="FORTIGO">Fortigo</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="bg-sage-dark px-4 py-2 text-sm font-medium text-white transition hover:bg-sage"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href="/"
              className="border border-line px-3 py-2 text-sm text-ink/70 hover:border-sage"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mt-3 text-xs text-ink/50">
        Showing {loads.length}
        {totalMatching > loads.length ? ` of ${totalMatching}` : ""} load
        {totalMatching === 1 ? "" : "s"}
        {hasFilters ? " matching filters" : ""}
      </p>

      {loads.length === 0 ? (
        <div className="mt-6 border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="text-sage-muted">
            {hasFilters ? "No loads match these filters" : "No loads yet"}
          </p>
          {hasFilters ? (
            <Link
              href="/"
              className="mt-4 inline-block text-sm text-burgundy underline-offset-2 hover:underline"
            >
              Clear filters
            </Link>
          ) : (
            <Link
              href="/loads/new"
              className="mt-4 inline-block text-sm text-burgundy underline-offset-2 hover:underline"
            >
              Create the first dispatch
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border border-line bg-white/80">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-line bg-paper-deep/50 text-xs uppercase tracking-wide text-ink/55">
              <tr>
                <th className="px-4 py-3 font-medium">Outbound</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Origin</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Carrier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Created by</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((load) => (
                <tr
                  key={load.id}
                  className="border-b border-line/60 last:border-0 hover:bg-paper-deep/30"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/loads/${load.id}`}
                      className="text-sage-dark underline-offset-2 hover:underline"
                    >
                      {load.outboundNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink/70 whitespace-nowrap">
                    {format(load.vanDropDate, "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{load.pickupCity}</span>
                    <span className="block text-xs text-ink/45">
                      {load.pickupProvince}
                    </span>
                  </td>
                  <td className="px-4 py-3">{load.destination}</td>
                  <td className="px-4 py-3">
                    <span className="block">{load.pickupCompany}</span>
                    {load.deliveryCompany ? (
                      <span className="block text-xs text-ink/45">
                        → {load.deliveryCompany}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{load.carrier}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block border border-line px-2 py-0.5 text-xs">
                      {STATUS_LABELS[load.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {money(toNumber(load.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{load.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
