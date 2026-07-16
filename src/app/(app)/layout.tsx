import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/hibernia-logo.png"
                alt="Hibernia Trading"
                width={280}
                height={58}
                className="h-10 w-auto"
                quality={100}
                sizes="140px"
              />
              <span className="font-brand hidden text-lg text-sage-dark sm:inline">
                Dispatch
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-ink/70 transition hover:text-sage-dark">
                Loads
              </Link>
              <Link
                href="/loads/new"
                className="text-ink/70 transition hover:text-sage-dark"
              >
                New load
              </Link>
              <Link href="/rates" className="text-ink/70 transition hover:text-sage-dark">
                Rates
              </Link>
              <Link
                href="/contacts"
                className="text-ink/70 transition hover:text-sage-dark"
              >
                Contacts
              </Link>
              {session.user.role === "ADMIN" ? (
                <Link
                  href="/users"
                  className="text-ink/70 transition hover:text-sage-dark"
                >
                  Users
                </Link>
              ) : null}
              <Link
                href="/account"
                className="text-ink/70 transition hover:text-sage-dark"
              >
                Account
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-ink/60 sm:inline">
              {session.user.name} · {session.user.role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="border border-line px-3 py-1.5 text-ink/80 transition hover:border-burgundy hover:text-burgundy"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
