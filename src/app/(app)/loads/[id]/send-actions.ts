"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, writeAudit } from "@/lib/session";
import { buildDispatchPdf } from "@/lib/dispatch-pdf";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export type SendDispatchState = {
  error?: string;
  ok?: boolean;
  sentTo?: string;
};

const sendSchema = z.object({
  loadId: z.string().min(1),
  toEmail: z.string().trim().email("Enter a valid email"),
  toName: z.string().trim().optional(),
  contactId: z.string().optional(),
  saveContact: z.boolean().optional(),
  nickname: z.string().trim().optional(),
});

function formBool(v: FormDataEntryValue | null) {
  return v === "on" || v === "true" || v === "1";
}

export async function sendDispatchEmailAction(
  _prev: SendDispatchState | undefined,
  formData: FormData,
): Promise<SendDispatchState> {
  const user = await requireUser();

  if (!isMailConfigured()) {
    return {
      error:
        "Email is not set up yet. Add SMTP_USER and SMTP_PASS to .env for Outlook/Microsoft 365 (see .env.example).",
    };
  }

  const parsed = sendSchema.safeParse({
    loadId: formData.get("loadId"),
    toEmail: formData.get("toEmail"),
    toName: String(formData.get("toName") ?? "") || undefined,
    contactId: String(formData.get("contactId") ?? "") || undefined,
    saveContact: formBool(formData.get("saveContact")),
    nickname: String(formData.get("nickname") ?? "") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email details." };
  }

  const data = parsed.data;
  const load = await prisma.load.findUnique({ where: { id: data.loadId } });
  if (!load) return { error: "Load not found." };

  if (data.saveContact) {
    if (!data.nickname) {
      return { error: "Nickname is required to save this contact." };
    }
    await prisma.contact.create({
      data: {
        nickname: data.nickname,
        name: data.toName || data.nickname,
        email: data.toEmail.toLowerCase(),
        isFavorite: true,
        createdById: user.id,
      },
    });
  }

  const pdf = await buildDispatchPdf(load);
  const filename = `Dispatch_${load.outboundNumber}.pdf`;
  const subject = `Intermodal Dispatch ${load.outboundNumber} — ${load.destination}`;
  const text = [
    `Please find attached the intermodal dispatch for ${load.outboundNumber}.`,
    "",
    `Destination: ${load.destination}`,
    `Carrier: ${load.carrier}`,
    `Van drop: ${format(load.vanDropDate, "MMMM d, yyyy")}`,
    "",
    "Hibernia Trading Inc.",
  ].join("\n");

  try {
    await sendMail({
      to: data.toEmail,
      subject,
      text,
      html: `<p>Please find attached the intermodal dispatch for <strong>${load.outboundNumber}</strong>.</p>
<p>Destination: ${load.destination}<br/>Carrier: ${load.carrier}<br/>Van drop: ${format(load.vanDropDate, "MMMM d, yyyy")}</p>
<p>Hibernia Trading Inc.</p>`,
      attachments: [
        {
          filename,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email.";
    return { error: message };
  }

  await writeAudit({
    userId: user.id,
    action: "DISPATCH_EMAILED",
    entityType: "Load",
    entityId: load.id,
    details: {
      outboundNumber: load.outboundNumber,
      to: data.toEmail,
      contactId: data.contactId,
    },
  });

  revalidatePath(`/loads/${load.id}`);
  revalidatePath("/contacts");
  return { ok: true, sentTo: data.toEmail };
}
