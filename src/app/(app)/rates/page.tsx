import { prisma } from "@/lib/prisma";
import { isSheetsConfigured } from "@/lib/google-sheets";

export default async function RatesPage() {
  const [feeSettings, rateCount, cdiCount, fortigoCount] = await Promise.all([
    prisma.feeSettings.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.freightRate.count(),
    prisma.freightRate.count({ where: { carrier: "CDI" } }),
    prisma.freightRate.count({ where: { carrier: "FORTIGO" } }),
  ]);

  const money = (v: { toString(): string } | null | undefined) =>
    v == null
      ? "—"
      : Number(v.toString()).toLocaleString("en-CA", {
          style: "currency",
          currency: "CAD",
        });

  const sheetsOk = isSheetsConfigured();
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  const sheetTab = process.env.GOOGLE_SHEETS_TAB_NAME?.trim() || "Loads";

  return (
    <section>
      <h1 className="font-brand text-3xl text-sage-dark">Rates & fees</h1>
      <p className="mt-2 text-ink/60">
        Base rates by destination/provider, plus fee defaults for the load form.
        Fuel surcharge is set on each load (0.00–100.00%, two decimal places), not
        here.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="border border-line bg-white/80 p-6">
          <h2 className="font-brand text-xl text-burgundy">Fee defaults</h2>
          <p className="mt-1 text-xs text-ink/50">
            Flat deck, reload, and restack amounts from the rate sheet. Blocking and
            carbon tax are entered manually on each load when enabled.
          </p>
          {feeSettings ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between border-b border-line/60 py-2">
                <dt>Flat deck (CDI)</dt>
                <dd className="font-medium">{money(feeSettings.flatDeckCdi)}</dd>
              </div>
              <div className="flex justify-between border-b border-line/60 py-2">
                <dt>Flat deck (Fortigo)</dt>
                <dd className="font-medium">{money(feeSettings.flatDeckFortigo)}</dd>
              </div>
              <div className="flex justify-between border-b border-line/60 py-2">
                <dt>Reload (when Yes)</dt>
                <dd className="font-medium">{money(feeSettings.reloadFee)}</dd>
              </div>
              <div className="flex justify-between border-b border-line/60 py-2">
                <dt>Restack (2x4/6/8 when Yes)</dt>
                <dd className="font-medium">{money(feeSettings.restackFee)}</dd>
              </div>
              <div className="flex justify-between border-b border-line/60 py-2">
                <dt>Blocking / bracing</dt>
                <dd className="font-medium text-ink/55">Manual per load</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt>Carbon tax</dt>
                <dd className="font-medium text-ink/55">Manual per load</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-ink/50">
              No fee defaults yet. Run{" "}
              <code className="text-burgundy">npm run import:rates</code>.
            </p>
          )}
        </div>

        <div className="border border-line bg-white/80 p-6">
          <h2 className="font-brand text-xl text-burgundy">Base rates</h2>
          <p className="mt-1 text-xs text-ink/50">
            CDI = IMS BASE · Fortigo = VFS base rate · Totals = base + fuel% + fees
            on each load
          </p>
          <p className="mt-6 font-brand text-5xl text-sage-dark">{rateCount}</p>
          <p className="mt-2 text-sm text-ink/60">
            {cdiCount} CDI · {fortigoCount} Fortigo
          </p>
        </div>
      </div>

      <div className="mt-8 border border-line bg-white/80 p-6">
        <h2 className="font-brand text-xl text-burgundy">Integrations</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 py-2">
            <dt>Google Sheets mirror</dt>
            <dd className={sheetsOk ? "text-sage-dark" : "text-burgundy"}>
              {sheetsOk
                ? `Configured · tab “${sheetTab}”${sheetId ? ` · …${sheetId.slice(-6)}` : ""}`
                : "Not configured — see .env.example"}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            <dt>Dispatch email</dt>
            <dd className="text-ink/55">
              Manual for now — open PDF, attach in Outlook
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink/50">
          App remains source of truth. When Sheets is configured, new loads and
          status changes upsert a row by outbound #.
        </p>
      </div>
    </section>
  );
}
