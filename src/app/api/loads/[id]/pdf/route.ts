import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildDispatchPdf } from "@/lib/dispatch-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const load = await prisma.load.findUnique({ where: { id } });
  if (!load) {
    return new Response("Not found", { status: 404 });
  }

  const pdf = await buildDispatchPdf(load);
  const filename = `Dispatch_${load.outboundNumber}.pdf`;

  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
