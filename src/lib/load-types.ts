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
  blockingFee: number;
  carbonTax: number;
};
