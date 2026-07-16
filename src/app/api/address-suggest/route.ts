import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mapPhotonToSuggestions } from "@/lib/address-suggest";

export const runtime = "nodejs";

/** Calgary bias — origin of most Hibernia moves. */
const BIAS_LAT = 51.0447;
const BIAS_LON = -114.0719;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "6");
  url.searchParams.set("lang", "en");
  url.searchParams.set("lat", String(BIAS_LAT));
  url.searchParams.set("lon", String(BIAS_LON));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "HiberniaDispatch/1.0 (internal freight dispatch)",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Address lookup unavailable", suggestions: [] },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { features?: unknown[] };
    const suggestions = mapPhotonToSuggestions(
      (data.features ?? []) as Parameters<typeof mapPhotonToSuggestions>[0],
    );

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { error: "Address lookup failed", suggestions: [] },
      { status: 502 },
    );
  }
}
