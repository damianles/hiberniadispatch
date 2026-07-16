import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./CreateUserForm";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <section>
      <h1 className="font-brand text-3xl text-sage-dark">Users</h1>
      <p className="mt-2 text-ink/60">
        Admin-only. Create logins and share a temporary password — they should
        change it under Account after first sign-in. Invite links come later.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Add user</h2>
          <div className="mt-4">
            <CreateUserForm />
          </div>
        </div>

        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">All users</h2>
          <ul className="mt-4 divide-y divide-line/60 text-sm">
            {users.map((u) => (
              <li key={u.id} className="py-3">
                <p className="font-medium text-sage-dark">{u.name}</p>
                <p className="text-ink/70">{u.email}</p>
                <p className="text-xs text-ink/45">
                  {u.role} · since {format(u.createdAt, "MMM d, yyyy")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
