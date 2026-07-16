"use server";

import { revalidatePath } from "next/cache";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, writeAudit } from "@/lib/session";

export type AccountActionState = { error?: string; ok?: boolean };

export async function updateProfileAction(
  _prev: AccountActionState | undefined,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  await prisma.user.update({
    where: { id: user.id },
    data: { name },
  });

  await writeAudit({
    userId: user.id,
    action: "PROFILE_UPDATED",
    entityType: "User",
    entityId: user.id,
    details: { name },
  });

  revalidatePath("/account");
  return { ok: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePasswordAction(
  _prev: AccountActionState | undefined,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "User not found." };

  const ok = await compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  const passwordHash = await hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await writeAudit({
    userId: user.id,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: user.id,
  });

  revalidatePath("/account");
  return { ok: true };
}
