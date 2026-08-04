"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createLoadSchema, updateLoadSchema } from "@/lib/load-schema";
import { calcLoadTotal, normalizeFuelPercent } from "@/lib/rates";
import { requireUser, writeAudit } from "@/lib/session";
import type { LoadStatus, ProductClass } from "@prisma/client";
import { isStyleAllowed } from "@/lib/load-labels";
import { syncLoadToSheet } from "@/lib/google-sheets";
import type { Load } from "@prisma/client";

async function mirrorLoadToSheet(userId: string, load: Load) {
  const result = await syncLoadToSheet(load);
  if (result.synced) {
    await writeAudit({
      userId,
      action: "SHEET_SYNCED",
      entityType: "Load",
      entityId: load.id,
      details: { outboundNumber: load.outboundNumber, row: result.row },
    });
  } else if ("error" in result) {
    await writeAudit({
      userId,
      action: "SHEET_SYNC_FAILED",
      entityType: "Load",
      entityId: load.id,
      details: { outboundNumber: load.outboundNumber, error: result.error },
    });
  }
}

function formBool(v: FormDataEntryValue | null) {
  return v === "on" || v === "true" || v === "1";
}

function formNum(v: FormDataEntryValue | null, fallback = 0) {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export type CreateLoadState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createLoadAction(
  _prev: CreateLoadState | undefined,
  formData: FormData,
): Promise<CreateLoadState> {
  const user = await requireUser();

  const carrier = String(formData.get("carrier") ?? "");
  const productClassRaw = String(formData.get("productClass") ?? "");
  const productClass =
    productClassRaw === "SIZE_2X10_12" ? "SIZE_2X10_12" : "SIZE_2X4_6_8";

  const restack = formBool(formData.get("restack"));
  const reload = formBool(formData.get("reload"));
  const blocking = formBool(formData.get("blocking"));
  const carbonTaxApplied = formBool(formData.get("carbonTaxApplied"));
  const crossDock = formBool(formData.get("crossDock"));
  const equipment = String(formData.get("equipment") ?? "FLAT_DECK");
  const equipmentStyle = String(formData.get("equipmentStyle") ?? "SUPER_B");

  const restackFeeMaster = formNum(formData.get("restackFeeMaster"));
  const flatDeckMaster = formNum(formData.get("flatDeckFee"));
  const reloadFeeMaster = formNum(formData.get("reloadFeeMaster"));

  const parsed = createLoadSchema.safeParse({
    outboundNumber: formData.get("outboundNumber"),
    inboundNumber: String(formData.get("inboundNumber") ?? "") || undefined,
    vanDropDate: formData.get("vanDropDate"),
    status: formData.get("status") === "DISPATCHED" ? "DISPATCHED" : "DRAFT",

    pickupCompany: formData.get("pickupCompany"),
    pickupStreet: formData.get("pickupStreet"),
    pickupCity: formData.get("pickupCity"),
    pickupProvince: formData.get("pickupProvince"),
    pickupPostal: String(formData.get("pickupPostal") ?? "") || undefined,
    pickupPhone: String(formData.get("pickupPhone") ?? "") || undefined,

    destination: formData.get("destination"),
    deliveryCompany: String(formData.get("deliveryCompany") ?? "") || undefined,
    deliveryStreet: formData.get("deliveryStreet"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryProvince: formData.get("deliveryProvince"),
    deliveryPostal: String(formData.get("deliveryPostal") ?? "") || undefined,
    deliveryRef: String(formData.get("deliveryRef") ?? "") || undefined,
    deliveryAddressId: String(formData.get("deliveryAddressId") ?? "") || undefined,

    carrier,
    productClass,
    equipment,
    equipmentStyle,

    crossDock,
    crossDockFee: crossDock ? formNum(formData.get("crossDockFee")) : 0,
    restack,
    reload,
    blocking,
    carbonTaxApplied,

    loadContents: formData.get("loadContents"),
    weightLbs: formData.get("weightLbs")
      ? formNum(formData.get("weightLbs"))
      : undefined,

    fuelSurchargePercent: normalizeFuelPercent(
      formNum(formData.get("fuelSurchargePercent")),
    ),
    baseRate: formNum(formData.get("baseRate")),
    flatDeckFee: equipment === "FLAT_DECK" ? flatDeckMaster : 0,
    reloadFee: reload ? reloadFeeMaster : 0,
    restackFee: restack ? restackFeeMaster : 0,
    blockingFee: blocking ? formNum(formData.get("blockingFee")) : 0,
    carbonTax: carbonTaxApplied ? formNum(formData.get("carbonTax")) : 0,

    saveAddress: formBool(formData.get("saveAddress")),
    addressNickname: String(formData.get("addressNickname") ?? "") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  if (!isStyleAllowed(data.equipment, data.equipmentStyle)) {
    return {
      error: "That equipment style is not available for the selected equipment.",
    };
  }

  // Prefer DB rate; allow manual base rate for destinations not in the sheet
  const rateProductClass: ProductClass =
    data.carrier === "FORTIGO" ? "ALL" : (data.productClass as ProductClass);

  // Restack only applies to 2x4 / 6 / 8
  const restackAllowed = data.productClass === "SIZE_2X4_6_8";
  const restackApplied = restackAllowed && data.restack;
  const restackFee = restackApplied ? data.restackFee : 0;

  if (data.blocking && data.blockingFee <= 0) {
    return { error: "Enter a blocking / bracing amount, or set Blocking to No." };
  }
  if (data.carbonTaxApplied && data.carbonTax <= 0) {
    return { error: "Enter a carbon tax amount, or set Carbon tax to No." };
  }

  const carrierRates = await prisma.freightRate.findMany({
    where: { carrier: data.carrier, productClass: rateProductClass },
  });
  const rateMatch = carrierRates.find(
    (r) => r.destination.toLowerCase() === data.destination.toLowerCase(),
  );

  const baseRate = rateMatch
    ? Number(rateMatch.baseRate.toString())
    : data.baseRate;

  if (!baseRate || baseRate <= 0) {
    return {
      error: `No saved rate for ${data.destination} via ${data.carrier}. Enter a manual base rate to continue.`,
    };
  }
  const crossDockAmount = data.crossDock ? (data.crossDockFee ?? 0) : 0;
  const { fuelAmount, totalAmount } = calcLoadTotal({
    baseRate,
    fuelSurchargePercent: data.fuelSurchargePercent,
    flatDeckFee: data.flatDeckFee,
    reloadFee: data.reloadFee,
    restackFee,
    blockingFee: data.blockingFee,
    carbonTax: data.carbonTax,
    crossDockAmount,
  });

  const existing = await prisma.load.findUnique({
    where: { outboundNumber: data.outboundNumber },
  });
  if (existing) {
    return { error: `Outbound # ${data.outboundNumber} already exists.` };
  }

  let deliveryAddressId = data.deliveryAddressId || null;

  if (data.saveAddress && data.addressNickname) {
    const address = await prisma.address.create({
      data: {
        nickname: data.addressNickname,
        companyName: data.deliveryCompany,
        street: data.deliveryStreet,
        city: data.deliveryCity,
        province: data.deliveryProvince,
        postalCode: data.deliveryPostal,
        isFavorite: true,
        createdById: user.id,
      },
    });
    deliveryAddressId = address.id;
  }

  const load = await prisma.load.create({
    data: {
      outboundNumber: data.outboundNumber,
      inboundNumber: data.inboundNumber,
      status: data.status,
      vanDropDate: new Date(data.vanDropDate + "T12:00:00"),
      pickupCompany: data.pickupCompany,
      pickupStreet: data.pickupStreet,
      pickupCity: data.pickupCity,
      pickupProvince: data.pickupProvince,
      pickupPostal: data.pickupPostal,
      pickupPhone: data.pickupPhone,
      destination: data.destination,
      deliveryCompany: data.deliveryCompany,
      deliveryStreet: data.deliveryStreet,
      deliveryCity: data.deliveryCity,
      deliveryProvince: data.deliveryProvince,
      deliveryPostal: data.deliveryPostal,
      deliveryRef: data.deliveryRef,
      deliveryAddressId,
      carrier: data.carrier,
      productClass: data.productClass as ProductClass,
      equipment: data.equipment,
      equipmentStyle: data.equipmentStyle,
      crossDock: data.crossDock,
      crossDockFee: crossDockAmount,
      restack: restackApplied,
      reload: data.reload,
      blocking: data.blocking,
      carbonTaxApplied: data.carbonTaxApplied,
      loadContents: data.loadContents,
      weightLbs: data.weightLbs,
      baseRate,
      fuelSurchargePercent: data.fuelSurchargePercent,
      fuelAmount,
      flatDeckFee: data.flatDeckFee,
      reloadFee: data.reloadFee,
      restackFee,
      blockingFee: data.blockingFee,
      carbonTax: data.carbonTax,
      crossDockAmount,
      totalAmount,
      createdById: user.id,
      updatedById: user.id,
      dispatchedAt: data.status === "DISPATCHED" ? new Date() : null,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "LOAD_CREATED",
    entityType: "Load",
    entityId: load.id,
    details: {
      outboundNumber: load.outboundNumber,
      carrier: load.carrier,
      destination: load.destination,
      totalAmount,
    },
  });

  await mirrorLoadToSheet(user.id, load);

  revalidatePath("/");
  revalidatePath(`/loads/${load.id}`);
  redirect(`/loads/${load.id}?created=1`);
}

export type UpdateLoadState = CreateLoadState;

export async function updateLoadAction(
  _prev: UpdateLoadState | undefined,
  formData: FormData,
): Promise<UpdateLoadState> {
  const user = await requireUser();
  const loadId = String(formData.get("loadId") ?? "");
  if (!loadId) return { error: "Missing load." };

  const existingLoad = await prisma.load.findUnique({ where: { id: loadId } });
  if (!existingLoad) return { error: "Load not found." };

  const carrier = String(formData.get("carrier") ?? "");
  const productClassRaw = String(formData.get("productClass") ?? "");
  const productClass =
    productClassRaw === "SIZE_2X10_12" ? "SIZE_2X10_12" : "SIZE_2X4_6_8";

  const restack = formBool(formData.get("restack"));
  const reload = formBool(formData.get("reload"));
  const blocking = formBool(formData.get("blocking"));
  const carbonTaxApplied = formBool(formData.get("carbonTaxApplied"));
  const crossDock = formBool(formData.get("crossDock"));
  const equipment = String(formData.get("equipment") ?? "FLAT_DECK");
  const equipmentStyle = String(formData.get("equipmentStyle") ?? "SUPER_B");

  const restackFeeMaster = formNum(formData.get("restackFeeMaster"));
  const flatDeckMaster = formNum(formData.get("flatDeckFee"));
  const reloadFeeMaster = formNum(formData.get("reloadFeeMaster"));

  const statusRaw = String(formData.get("status") ?? existingLoad.status);
  const status = (
    ["DRAFT", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const
  ).includes(statusRaw as LoadStatus)
    ? (statusRaw as LoadStatus)
    : existingLoad.status;

  const parsed = updateLoadSchema.safeParse({
    outboundNumber: formData.get("outboundNumber"),
    inboundNumber: String(formData.get("inboundNumber") ?? "") || undefined,
    vanDropDate: formData.get("vanDropDate"),
    status,

    pickupCompany: formData.get("pickupCompany"),
    pickupStreet: formData.get("pickupStreet"),
    pickupCity: formData.get("pickupCity"),
    pickupProvince: formData.get("pickupProvince"),
    pickupPostal: String(formData.get("pickupPostal") ?? "") || undefined,
    pickupPhone: String(formData.get("pickupPhone") ?? "") || undefined,

    destination: formData.get("destination"),
    deliveryCompany: String(formData.get("deliveryCompany") ?? "") || undefined,
    deliveryStreet: formData.get("deliveryStreet"),
    deliveryCity: formData.get("deliveryCity"),
    deliveryProvince: formData.get("deliveryProvince"),
    deliveryPostal: String(formData.get("deliveryPostal") ?? "") || undefined,
    deliveryRef: String(formData.get("deliveryRef") ?? "") || undefined,
    deliveryAddressId: String(formData.get("deliveryAddressId") ?? "") || undefined,

    carrier,
    productClass,
    equipment,
    equipmentStyle,

    crossDock,
    crossDockFee: crossDock ? formNum(formData.get("crossDockFee")) : 0,
    restack,
    reload,
    blocking,
    carbonTaxApplied,

    loadContents: formData.get("loadContents"),
    weightLbs: formData.get("weightLbs")
      ? formNum(formData.get("weightLbs"))
      : undefined,

    fuelSurchargePercent: normalizeFuelPercent(
      formNum(formData.get("fuelSurchargePercent")),
    ),
    baseRate: formNum(formData.get("baseRate")),
    flatDeckFee: equipment === "FLAT_DECK" ? flatDeckMaster : 0,
    reloadFee: reload ? reloadFeeMaster : 0,
    restackFee: restack ? restackFeeMaster : 0,
    blockingFee: blocking ? formNum(formData.get("blockingFee")) : 0,
    carbonTax: carbonTaxApplied ? formNum(formData.get("carbonTax")) : 0,

    saveAddress: formBool(formData.get("saveAddress")),
    addressNickname: String(formData.get("addressNickname") ?? "") || undefined,
  });

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  if (!isStyleAllowed(data.equipment, data.equipmentStyle)) {
    return {
      error: "That equipment style is not available for the selected equipment.",
    };
  }

  const rateProductClass: ProductClass =
    data.carrier === "FORTIGO" ? "ALL" : (data.productClass as ProductClass);

  const restackAllowed = data.productClass === "SIZE_2X4_6_8";
  const restackApplied = restackAllowed && data.restack;
  const restackFee = restackApplied ? data.restackFee : 0;

  if (data.blocking && data.blockingFee <= 0) {
    return { error: "Enter a blocking / bracing amount, or set Blocking to No." };
  }
  if (data.carbonTaxApplied && data.carbonTax <= 0) {
    return { error: "Enter a carbon tax amount, or set Carbon tax to No." };
  }

  const carrierRates = await prisma.freightRate.findMany({
    where: { carrier: data.carrier, productClass: rateProductClass },
  });
  const rateMatch = carrierRates.find(
    (r) => r.destination.toLowerCase() === data.destination.toLowerCase(),
  );

  const baseRate = rateMatch
    ? Number(rateMatch.baseRate.toString())
    : data.baseRate;

  if (!baseRate || baseRate <= 0) {
    return {
      error: `No saved rate for ${data.destination} via ${data.carrier}. Enter a manual base rate to continue.`,
    };
  }
  const crossDockAmount = data.crossDock ? (data.crossDockFee ?? 0) : 0;
  const { fuelAmount, totalAmount } = calcLoadTotal({
    baseRate,
    fuelSurchargePercent: data.fuelSurchargePercent,
    flatDeckFee: data.flatDeckFee,
    reloadFee: data.reloadFee,
    restackFee,
    blockingFee: data.blockingFee,
    carbonTax: data.carbonTax,
    crossDockAmount,
  });

  const duplicate = await prisma.load.findFirst({
    where: {
      outboundNumber: data.outboundNumber,
      NOT: { id: loadId },
    },
  });
  if (duplicate) {
    return { error: `Outbound # ${data.outboundNumber} already exists.` };
  }

  let deliveryAddressId = data.deliveryAddressId || null;

  if (data.saveAddress && data.addressNickname) {
    const address = await prisma.address.create({
      data: {
        nickname: data.addressNickname,
        companyName: data.deliveryCompany,
        street: data.deliveryStreet,
        city: data.deliveryCity,
        province: data.deliveryProvince,
        postalCode: data.deliveryPostal,
        isFavorite: true,
        createdById: user.id,
      },
    });
    deliveryAddressId = address.id;
  }

  const load = await prisma.load.update({
    where: { id: loadId },
    data: {
      outboundNumber: data.outboundNumber,
      inboundNumber: data.inboundNumber,
      status: data.status,
      vanDropDate: new Date(data.vanDropDate + "T12:00:00"),
      pickupCompany: data.pickupCompany,
      pickupStreet: data.pickupStreet,
      pickupCity: data.pickupCity,
      pickupProvince: data.pickupProvince,
      pickupPostal: data.pickupPostal,
      pickupPhone: data.pickupPhone,
      destination: data.destination,
      deliveryCompany: data.deliveryCompany,
      deliveryStreet: data.deliveryStreet,
      deliveryCity: data.deliveryCity,
      deliveryProvince: data.deliveryProvince,
      deliveryPostal: data.deliveryPostal,
      deliveryRef: data.deliveryRef,
      deliveryAddressId,
      carrier: data.carrier,
      productClass: data.productClass as ProductClass,
      equipment: data.equipment,
      equipmentStyle: data.equipmentStyle,
      crossDock: data.crossDock,
      crossDockFee: crossDockAmount,
      restack: restackApplied,
      reload: data.reload,
      blocking: data.blocking,
      carbonTaxApplied: data.carbonTaxApplied,
      loadContents: data.loadContents,
      weightLbs: data.weightLbs,
      baseRate,
      fuelSurchargePercent: data.fuelSurchargePercent,
      fuelAmount,
      flatDeckFee: data.flatDeckFee,
      reloadFee: data.reloadFee,
      restackFee,
      blockingFee: data.blockingFee,
      carbonTax: data.carbonTax,
      crossDockAmount,
      totalAmount,
      updatedById: user.id,
      dispatchedAt:
        data.status === "DISPATCHED" && !existingLoad.dispatchedAt
          ? new Date()
          : existingLoad.dispatchedAt,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "LOAD_UPDATED",
    entityType: "Load",
    entityId: load.id,
    details: {
      outboundNumber: load.outboundNumber,
      carrier: load.carrier,
      destination: load.destination,
      totalAmount,
    },
  });

  await mirrorLoadToSheet(user.id, load);

  revalidatePath("/");
  revalidatePath(`/loads/${load.id}`);
  revalidatePath(`/loads/${load.id}/edit`);
  redirect(`/loads/${load.id}?updated=1`);
}

export type UpdateStatusState = { error?: string; ok?: boolean };

export async function updateLoadStatusAction(
  _prev: UpdateStatusState | undefined,
  formData: FormData,
): Promise<UpdateStatusState> {
  const user = await requireUser();
  const loadId = String(formData.get("loadId") ?? "");
  const status = String(formData.get("status") ?? "") as
    | "DRAFT"
    | "DISPATCHED"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "CANCELLED";

  const allowed = [
    "DRAFT",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
  ] as const;

  if (!loadId || !allowed.includes(status)) {
    return { error: "Invalid status update." };
  }

  const existing = await prisma.load.findUnique({ where: { id: loadId } });
  if (!existing) return { error: "Load not found." };

  const load = await prisma.load.update({
    where: { id: loadId },
    data: {
      status,
      updatedById: user.id,
      dispatchedAt:
        status === "DISPATCHED" && !existing.dispatchedAt
          ? new Date()
          : existing.dispatchedAt,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "LOAD_STATUS_CHANGED",
    entityType: "Load",
    entityId: load.id,
    details: {
      outboundNumber: load.outboundNumber,
      from: existing.status,
      to: status,
    },
  });

  await mirrorLoadToSheet(user.id, load);

  revalidatePath("/");
  revalidatePath(`/loads/${load.id}`);
  return { ok: true };
}

export type ResyncSheetState = { error?: string; ok?: boolean; skipped?: boolean };

export async function resyncLoadToSheetAction(
  _prev: ResyncSheetState | undefined,
  formData: FormData,
): Promise<ResyncSheetState> {
  const user = await requireUser();
  const loadId = String(formData.get("loadId") ?? "");
  if (!loadId) return { error: "Missing load." };

  const load = await prisma.load.findUnique({ where: { id: loadId } });
  if (!load) return { error: "Load not found." };

  const result = await syncLoadToSheet(load);
  if (result.synced) {
    await writeAudit({
      userId: user.id,
      action: "SHEET_SYNCED",
      entityType: "Load",
      entityId: load.id,
      details: { outboundNumber: load.outboundNumber, row: result.row, manual: true },
    });
    revalidatePath(`/loads/${load.id}`);
    return { ok: true };
  }
  if ("skipped" in result && result.skipped) {
    return {
      skipped: true,
      error:
        "Google Sheets is not configured yet. Add spreadsheet ID and service account credentials to .env.",
    };
  }
  return { error: "error" in result ? result.error : "Sync failed." };
}
