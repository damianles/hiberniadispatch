import { z } from "zod";

export const createLoadSchema = z.object({
  outboundNumber: z.string().trim().min(1, "Outbound # is required"),
  inboundNumber: z.string().trim().optional(),
  vanDropDate: z.string().min(1, "Date is required"),
  status: z.enum(["DRAFT", "DISPATCHED"]).default("DRAFT"),

  pickupCompany: z.string().trim().min(1),
  pickupStreet: z.string().trim().min(1),
  pickupCity: z.string().trim().min(1),
  pickupProvince: z.string().trim().min(1),
  pickupPostal: z.string().trim().optional(),
  pickupPhone: z.string().trim().optional(),

  destination: z.string().trim().min(1, "Destination is required"),
  deliveryCompany: z.string().trim().optional(),
  deliveryStreet: z.string().trim().min(1, "Delivery street is required"),
  deliveryCity: z.string().trim().min(1),
  deliveryProvince: z.string().trim().min(1),
  deliveryPostal: z.string().trim().optional(),
  deliveryRef: z.string().trim().optional(),
  deliveryAddressId: z.string().optional(),

  carrier: z.enum(["CDI", "FORTIGO"]),
  productClass: z.enum(["SIZE_2X4_6_8", "SIZE_2X10_12", "ALL"]),
  equipment: z.enum(["FLAT_DECK", "BOX_VAN"]),
  equipmentStyle: z.enum([
    "SUPER_B",
    "TRI_AXLE",
    "TANDEM",
    "MAXI",
    "STEP_DECK_TROMBONE",
  ]),

  crossDock: z.boolean(),
  crossDockFee: z.number().min(0).optional(),
  restack: z.boolean(),

  loadContents: z.string().trim().min(1, "Load contents are required"),
  weightLbs: z.number().int().positive().optional(),

  fuelSurchargePercent: z.number().min(0).max(100),
  baseRate: z.number().positive("No base rate for this destination/carrier"),
  flatDeckFee: z.number().min(0),
  reloadFee: z.number().min(0),
  restackFee: z.number().min(0),
  blockingFee: z.number().min(0),
  carbonTax: z.number().min(0),

  saveAddress: z.boolean().optional(),
  addressNickname: z.string().trim().optional(),
});

export type CreateLoadInput = z.infer<typeof createLoadSchema>;
