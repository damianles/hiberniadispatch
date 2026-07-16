import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { money, toNumber } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/load-labels";
import { format } from "date-fns";

export default async function LoadsPage() {
  const loads = await prisma.load.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-brand text-3xl text-sage-dark">Loads</h1>
          <p className="mt-2 text-ink/60">Track and open dispatch submissions</p>
        </div>
        <Link
          href="/loads/new"
          className="bg-burgundy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy-hover"
        >
          New load
        </Link>
      </div>

      {loads.length === 0 ? (
        <div className="mt-10 border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="text-sage-muted">No loads yet</p>
          <Link
            href="/loads/new"
            className="mt-4 inline-block text-sm text-burgundy underline-offset-2 hover:underline"
          >
            Create the first dispatch
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto border border-line bg-white/80">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-paper-deep/50 text-xs uppercase tracking-wide text-ink/55">
              <tr>
                <th className="px-4 py-3 font-medium">Outbound</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 font-medium">Carrier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">By</th>
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
                  <td className="px-4 py-3 text-ink/70">
                    {format(load.vanDropDate, "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">{load.destination}</td>
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
