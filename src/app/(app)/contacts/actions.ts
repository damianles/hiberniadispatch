"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, writeAudit } from "@/lib/session";

const contactSchema = z.object({
  nickname: z.string().trim().min(1, "Nickname is required"),
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().optional(),
  isFavorite: z.boolean().optional(),
});

export type ContactActionState = {
  error?: string;
  ok?: boolean;
};

function formBool(v: FormDataEntryValue | null) {
  return v === "on" || v === "true" || v === "1";
}

export async function createContactAction(
  _prev: ContactActionState | undefined,
  formData: FormData,
): Promise<ContactActionState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse({
    nickname: formData.get("nickname"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? "") || undefined,
    isFavorite: formBool(formData.get("isFavorite")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid contact." };
  }

  const contact = await prisma.contact.create({
    data: {
      ...parsed.data,
      isFavorite: parsed.data.isFavorite ?? false,
      createdById: user.id,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "CONTACT_CREATED",
    entityType: "Contact",
    entityId: contact.id,
    details: { email: contact.email, nickname: contact.nickname },
  });

  revalidatePath("/contacts");
  revalidatePath("/loads");
  return { ok: true };
}

export async function toggleContactFavoriteAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.contact.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
  });

  await writeAudit({
    userId: user.id,
    action: "CONTACT_FAVORITE_TOGGLED",
    entityType: "Contact",
    entityId: id,
    details: { isFavorite: !existing.isFavorite },
  });

  revalidatePath("/contacts");
}

export async function deleteContactAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.contact.delete({ where: { id } });
  await writeAudit({
    userId: user.id,
    action: "CONTACT_DELETED",
    entityType: "Contact",
    entityId: id,
  });
  revalidatePath("/contacts");
}
