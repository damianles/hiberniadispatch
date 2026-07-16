"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, writeAudit } from "@/lib/session";

export type UserAdminState = { error?: string; ok?: boolean };

const createSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "DISPATCHER"]),
});

export async function createUserAction(
  _prev: UserAdminState | undefined,
  formData: FormData,
): Promise<UserAdminState> {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid user." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists." };

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
    },
  });

  await writeAudit({
    userId: admin.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user.id,
    details: { email: user.email, role: user.role },
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function resetUserPasswordAction(
  _prev: UserAdminState | undefined,
  formData: FormData,
): Promise<UserAdminState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await writeAudit({
    userId: admin.id,
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    details: { email: user.email },
  });

  revalidatePath("/users");
  return { ok: true };
}
