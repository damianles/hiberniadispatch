import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { LoadForm } from "../../new/LoadForm";
import type { LoadFormInitial } from "@/lib/load-types";

export default async function EditLoadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [load, rateRows, addresses, feeSettings] = await Promise.all([
    prisma.load.findUnique({ where: { id } }),
    prisma.freightRate.findMany({ orderBy: { destination: "asc" } }),
    prisma.address.findMany({
      orderBy: [{ isFavorite: "desc" }, { nickname: "asc" }],
    }),
    prisma.feeSettings.findFirst({ orderBy: { updatedAt: "desc" } }),
  ]);

  if (!load) notFound();

  if (!feeSettings) {
    return (
      <section>
        <h1 className="font-brand text-3xl text-sage-dark">Edit load</h1>
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
    phone: a.phone,
    isFavorite: a.isFavorite,
  }));

  const fees = {
    flatDeckCdi: toNumber(feeSettings.flatDeckCdi) || 375,
    flatDeckFortigo: toNumber(feeSettings.flatDeckFortigo) || 450,
    reloadFee: toNumber(feeSettings.reloadFee) || 500,
    restackFee: toNumber(feeSettings.restackFee) || 100,
  };

  const productClass =
    load.productClass === "SIZE_2X10_12" ? "SIZE_2X10_12" : "SIZE_2X4_6_8";

  const initial: LoadFormInitial = {
    outboundNumber: load.outboundNumber,
    inboundNumber: load.inboundNumber ?? "",
    vanDropDate: format(load.vanDropDate, "yyyy-MM-dd"),
    status: load.status,
    pickupCompany: load.pickupCompany,
    pickupStreet: load.pickupStreet,
    pickupCity: load.pickupCity,
    pickupProvince: load.pickupProvince,
    pickupPostal: load.pickupPostal ?? "",
    pickupPhone: load.pickupPhone ?? "",
    destination: load.destination,
    deliveryAddressId: load.deliveryAddressId ?? "",
    deliveryCompany: load.deliveryCompany ?? "",
    deliveryStreet: load.deliveryStreet,
    deliveryCity: load.deliveryCity,
    deliveryProvince: load.deliveryProvince,
    deliveryPostal: load.deliveryPostal ?? "",
    deliveryPhone: load.deliveryPhone ?? "",
    deliveryRef: load.deliveryRef ?? "",
    carrier: load.carrier,
    productClass,
    equipment: load.equipment,
    equipmentStyle: load.equipmentStyle,
    loadContents: load.loadContents,
    weightLbs: load.weightLbs,
    fuelSurchargePercent: toNumber(load.fuelSurchargePercent),
    baseRate: toNumber(load.baseRate),
    restack: load.restack,
    reload: load.reload,
    blocking: load.blocking,
    blockingFee: toNumber(load.blockingFee),
    carbonTaxApplied: load.carbonTaxApplied,
    carbonTax: toNumber(load.carbonTax),
    crossDock: load.crossDock,
    crossDockFee: toNumber(load.crossDockFee ?? load.crossDockAmount),
    transloadFuelSurchargePercent: toNumber(load.transloadFuelSurchargePercent),
    accessorialAmount: toNumber(load.accessorialAmount),
    accessorialDescription: load.accessorialDescription ?? "",
  };

  return (
    <section>
      <p className="text-sm text-ink/50">
        <Link href={`/loads/${load.id}`} className="hover:text-sage-dark">
          {load.outboundNumber}
        </Link>
        <span className="mx-2">/</span>
        Edit
      </p>
      <h1 className="font-brand mt-1 text-3xl text-sage-dark">Edit load</h1>
      <p className="mt-2 text-ink/60">
        Update shipment details — totals recalculate with the same costing rules.
      </p>
      <div className="mt-8">
        <LoadForm
          mode="edit"
          loadId={load.id}
          initial={initial}
          rates={rates}
          addresses={addressOptions}
          fees={fees}
        />
      </div>
    </section>
  );
}
