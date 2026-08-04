export type RateOption = {
  destination: string;
  carrier: "CDI" | "FORTIGO";
  productClass: "SIZE_2X4_6_8" | "SIZE_2X10_12" | "ALL";
  baseRate: number;
};

export type AddressOption = {
  id: string;
  nickname: string;
  companyName: string | null;
  street: string;
  city: string;
  province: string;
  postalCode: string | null;
  isFavorite: boolean;
};

export type FeeDefaults = {
  flatDeckCdi: number;
  flatDeckFortigo: number;
  reloadFee: number;
  restackFee: number;
};

/** Prefill values for LoadForm create/edit */
export type LoadFormInitial = {
  outboundNumber: string;
  inboundNumber: string;
  vanDropDate: string; // YYYY-MM-DD
  status: string;
  pickupCompany: string;
  pickupStreet: string;
  pickupCity: string;
  pickupProvince: string;
  pickupPostal: string;
  pickupPhone: string;
  destination: string;
  deliveryAddressId: string;
  deliveryCompany: string;
  deliveryStreet: string;
  deliveryCity: string;
  deliveryProvince: string;
  deliveryPostal: string;
  deliveryRef: string;
  carrier: "CDI" | "FORTIGO";
  productClass: "SIZE_2X4_6_8" | "SIZE_2X10_12";
  equipment: "FLAT_DECK" | "BOX_VAN";
  equipmentStyle:
    | "SUPER_B"
    | "TRI_AXLE"
    | "TANDEM"
    | "MAXI"
    | "STEP_DECK_TROMBONE";
  loadContents: string;
  weightLbs: number | null;
  fuelSurchargePercent: number;
  baseRate: number;
  restack: boolean;
  reload: boolean;
  blocking: boolean;
  blockingFee: number;
  carbonTaxApplied: boolean;
  carbonTax: number;
  crossDock: boolean;
  crossDockFee: number;
};
