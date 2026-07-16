export type SuggestedAddress = {
  id: string;
  source: "saved" | "osm";
  nickname: string;
  companyName: string | null;
  street: string;
  city: string;
  province: string;
  postalCode: string | null;
  label: string;
  isFavorite?: boolean;
};

const PROVINCE_MAP: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "newfoundland": "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  québec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
  ab: "AB",
  bc: "BC",
  mb: "MB",
  nb: "NB",
  nl: "NL",
  nt: "NT",
  ns: "NS",
  nu: "NU",
  on: "ON",
  pe: "PE",
  qc: "QC",
  sk: "SK",
  yt: "YT",
};

export function abbreviateProvince(raw: string | undefined | null): string {
  if (!raw) return "";
  const key = raw.trim().toLowerCase();
  return PROVINCE_MAP[key] ?? raw.trim().toUpperCase().slice(0, 2);
}

type PhotonFeature = {
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
};

function buildStreet(p: NonNullable<PhotonFeature["properties"]>): string {
  const street = p.street || p.name || "";
  if (p.housenumber && street) return `${p.housenumber} ${street}`;
  if (p.housenumber) return p.housenumber;
  return street;
}

function buildCity(p: NonNullable<PhotonFeature["properties"]>): string {
  return (
    p.city ||
    p.town ||
    p.village ||
    p.municipality ||
    p.district ||
    p.county ||
    ""
  );
}

export function mapPhotonToSuggestions(
  features: PhotonFeature[],
): SuggestedAddress[] {
  const out: SuggestedAddress[] = [];
  for (const f of features) {
    const p = f.properties;
    if (!p) continue;
    const cc = (p.countrycode || "").toLowerCase();
    if (cc && cc !== "ca") continue;

    const street = buildStreet(p);
    const city = buildCity(p);
    const province = abbreviateProvince(p.state);
    const postalCode = p.postcode?.trim() || null;
    if (!street && !city) continue;

    const id = `osm-${p.osm_type ?? "n"}-${p.osm_id ?? out.length}`;
    const label = [street, city, province, postalCode].filter(Boolean).join(", ");

    out.push({
      id,
      source: "osm",
      nickname: label,
      companyName: null,
      street: street || city,
      city,
      province,
      postalCode,
      label,
    });
  }
  return out;
}
