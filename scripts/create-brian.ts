import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/**
 * Upsert Brian Casey admin.
 * Password from env BRIAN_TEMP_PASSWORD (do not commit passwords).
 *
 *   $env:BRIAN_TEMP_PASSWORD="..."; npm run user:brian
 */
const prisma = new PrismaClient();

async function main() {
  const email = "briancasey@hiberniatrading.com";
  const password = process.env.BRIAN_TEMP_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      "Set BRIAN_TEMP_PASSWORD env var (min 8 chars) before running.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Brian Casey",
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email,
      name: "Brian Casey",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`User ready: ${user.email} (${user.role}) id=${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
