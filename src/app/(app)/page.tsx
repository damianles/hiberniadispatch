import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, toNumber } from "@/lib/money";
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/load-labels";
import { format } from "date-fns";
import type { Carrier, LoadStatus, Prisma } from "@prisma/client";

const SORT_KEYS = ["date", "destination", "status", "total", "createdBy"] as const;
type SortKey = (typeof SORT_KEYS)[number];

type SearchParams = {
  q?: string;
  origin?: string;
  destination?: string;
  customer?: string;
  createdBy?: string;
  status?: string;
  carrier?: string;
  sort?: string;
  dir?: string;
};

function trim(v: string | undefined) {
  return v?.trim() ?? "";
}

function parseSort(v: string | undefined): SortKey | null {
  return SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : null;
}

function defaultDir(sort: SortKey): "asc" | "desc" {
  return sort === "date" || sort === "total" ? "desc" : "asc";
}

function orderByFor(
  sort: SortKey | null,
  dir: "asc" | "desc",
): Prisma.LoadOrderByWithRelationInput {
  if (!sort) return { createdAt: "desc" };
  switch (sort) {
    case "date":
      return { vanDropDate: dir };
    case "destination":
      return { destination: dir };
    case "status":
      return { status: dir };
    case "total":
      return { totalAmount: dir };
    case "createdBy":
      return { createdBy: { name: dir } };
  }
}

function filterParams(sp: {
  q: string;
  origin: string;
  destination: string;
  customer: string;
  createdBy: string;
  status: string;
  carrier: string;
}) {
  const p = new URLSearchParams();
  if (sp.q) p.set("q", sp.q);
  if (sp.origin) p.set("origin", sp.origin);
  if (sp.destination) p.set("destination", sp.destination);
  if (sp.customer) p.set("customer", sp.customer);
  if (sp.createdBy) p.set("createdBy", sp.createdBy);
  if (sp.status) p.set("status", sp.status);
  if (sp.carrier) p.set("carrier", sp.carrier);
  return p;
}

function sortHref(
  filters: ReturnType<typeof filterParams>,
  key: SortKey,
  current: SortKey | null,
  dir: "asc" | "desc",
) {
  const next = new URLSearchParams(filters);
  const nextDir =
    current === key ? (dir === "asc" ? "desc" : "asc") : defaultDir(key);
  next.set("sort", key);
  next.set("dir", nextDir);
  const qs = next.toString();
  return qs ? `/?${qs}` : "/";
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  filters,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey | null;
  dir: "asc" | "desc";
  filters: URLSearchParams;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  return (
    <th
      className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : ""}`}
    >
      <Link
        href={sortHref(filters, sortKey, current, dir)}
        className={`inline-flex items-center gap-1 hover:text-sage-dark ${
          active ? "text-sage-dark" : ""
        } ${align === "right" ? "justify-end" : ""}`}
      >
        {label}
        {active ? (
          <span aria-hidden className="text-[10px]">
            {dir === "asc" ? "↑" : "↓"}
          </span>
        ) : null}
      </Link>
    </th>
  );
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
  const sort = parseSort(sp.sort);
  const effectiveDir: "asc" | "desc" = sort
    ? sp.dir === "asc" || sp.dir === "desc"
      ? sp.dir
      : defaultDir(sort)
    : "desc";

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
  } else {
    and.push({ status: { not: "CANCELLED" } });
  }
  if (carrier === "CDI" || carrier === "FORTIGO") {
    and.push({ carrier: carrier as Carrier });
  }
  if (and.length) where.AND = and;

  const hasFilters = Boolean(
    q || origin || destination || customer || createdBy || status || carrier,
  );
  const filters = filterParams({
    q,
    origin,
    destination,
    customer,
    createdBy,
    status,
    carrier,
  });

  const [loads, creators, totalMatching] = await Promise.all([
    prisma.load.findMany({
      where,
      orderBy: orderByFor(sort, effectiveDir),
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
          className="inline-flex min-h-11 items-center bg-burgundy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy-hover"
        >
          New load
        </Link>
      </div>

      <form
        method="get"
        className="mt-8 grid gap-3 border border-line bg-white/80 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {sort ? (
          <>
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={effectiveDir} />
          </>
        ) : null}
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
            <option value="">All (excl. cancelled)</option>
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
            className="inline-flex min-h-11 items-center bg-sage-dark px-4 py-2 text-sm font-medium text-white transition hover:bg-sage"
          >
            Apply filters
          </button>
          {hasFilters ? (
            <Link
              href={
                sort
                  ? `/?sort=${sort}&dir=${effectiveDir}`
                  : "/"
              }
              className="inline-flex min-h-11 items-center border border-line px-3 py-2 text-sm text-ink/70 hover:border-sage"
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
        {!status ? " · cancelled hidden" : ""}
      </p>

      {loads.length === 0 ? (
        <div className="mt-6 border border-dashed border-line bg-white/50 px-6 py-14 text-center">
          <p className="font-brand text-lg text-sage-dark">
            {hasFilters ? "Nothing matches" : "Board is empty"}
          </p>
          <p className="mt-2 text-sm text-ink/55">
            {hasFilters
              ? "Try clearing filters or pick Cancelled under Status."
              : "Create a dispatch to get the board started."}
          </p>
          {hasFilters ? (
            <Link
              href="/"
              className="mt-5 inline-flex min-h-11 items-center text-sm text-burgundy underline-offset-2 hover:underline"
            >
              Clear filters
            </Link>
          ) : (
            <Link
              href="/loads/new"
              className="mt-5 inline-flex min-h-11 items-center text-sm text-burgundy underline-offset-2 hover:underline"
            >
              New load
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: stacked rows */}
          <ul className="mt-4 divide-y divide-line border border-line bg-white/80 sm:hidden">
            {loads.map((load) => (
              <li key={load.id}>
                <Link
                  href={`/loads/${load.id}`}
                  className="block px-4 py-3.5 transition active:bg-paper-deep/40"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-sage-dark">
                      {load.outboundNumber}
                    </span>
                    <span className="tabular-nums text-sm text-ink/80">
                      {money(toNumber(load.totalAmount))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink/75">
                    {load.pickupCity}
                    {load.pickupProvince ? `, ${load.pickupProvince}` : ""}
                    {" → "}
                    {load.destination}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/50">
                    <span>{format(load.vanDropDate, "MMM d, yyyy")}</span>
                    <span className="border border-line px-1.5 py-0.5 text-ink/65">
                      {STATUS_LABELS[load.status]}
                    </span>
                    <span>{load.carrier}</span>
                    <span>{load.createdBy.name}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="mt-4 hidden overflow-x-auto border border-line bg-white/80 sm:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-line bg-paper-deep/50 text-xs uppercase tracking-wide text-ink/55">
                <tr>
                  <th className="px-4 py-3 font-medium">Outbound</th>
                  <SortTh
                    label="Date"
                    sortKey="date"
                    current={sort}
                    dir={effectiveDir}
                    filters={filters}
                  />
                  <th className="px-4 py-3 font-medium">Origin</th>
                  <SortTh
                    label="Destination"
                    sortKey="destination"
                    current={sort}
                    dir={effectiveDir}
                    filters={filters}
                  />
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Carrier</th>
                  <SortTh
                    label="Status"
                    sortKey="status"
                    current={sort}
                    dir={effectiveDir}
                    filters={filters}
                  />
                  <SortTh
                    label="Total"
                    sortKey="total"
                    current={sort}
                    dir={effectiveDir}
                    filters={filters}
                    align="right"
                  />
                  <SortTh
                    label="Created by"
                    sortKey="createdBy"
                    current={sort}
                    dir={effectiveDir}
                    filters={filters}
                  />
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
                    <td className="px-4 py-3 whitespace-nowrap text-ink/70">
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
        </>
      )}
    </section>
  );
}
