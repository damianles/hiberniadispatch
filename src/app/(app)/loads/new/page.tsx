import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { LoadForm } from "./LoadForm";

export default async function NewLoadPage() {
  const [rateRows, addresses, feeSettings] = await Promise.all([
    prisma.freightRate.findMany({ orderBy: { destination: "asc" } }),
    prisma.address.findMany({
      orderBy: [{ isFavorite: "desc" }, { nickname: "asc" }],
    }),
    prisma.feeSettings.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  if (!feeSettings) {
    return (
      <section>
        <h1 className="font-brand text-3xl text-sage-dark">New load</h1>
        <p className="mt-4 text-sm text-burgundy">
          Fee defaults are missing. Run{" "}
          <code className="text-ink">npm run import:rates</code> first.
        </p>
      </section>
    );
  }

  const rates = rateRows.map((r) => ({
    destination: r.destination,
    carrier: r.carrier,
    productClass: r.productClass,
    baseRate: toNumber(r.baseRate),
  }));

  const addressOptions = addresses.map((a) => ({
    id: a.id,
    nickname: a.nickname,
    companyName: a.companyName,
    street: a.street,
    city: a.city,
    province: a.province,
    postalCode: a.postalCode,
    isFavorite: a.isFavorite,
  }));

  const fees = {
    flatDeckCdi: toNumber(feeSettings.flatDeckCdi) || 375,
    flatDeckFortigo: toNumber(feeSettings.flatDeckFortigo) || 450,
    reloadFee: toNumber(feeSettings.reloadFee) || 500,
    restackFee: toNumber(feeSettings.restackFee) || 100,
  };

  return (
    <section>
      <h1 className="font-brand text-3xl text-sage-dark">New load</h1>
      <p className="mt-2 text-ink/60">
        Enter shipment details — base rate fills from destination and carrier. Fuel
        % is set per load.
      </p>
      <div className="mt-8">
        <LoadForm rates={rates} addresses={addressOptions} fees={fees} />
      </div>
    </section>
  );
}
