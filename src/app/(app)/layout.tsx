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

  const navLink =
    "inline-flex min-h-10 items-center justify-center rounded-sm px-2.5 text-sm text-ink/70 transition hover:bg-paper-deep/60 hover:text-sage-dark sm:min-h-11";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image
                src="/hibernia-logo.png"
                alt="Hibernia Trading"
                width={280}
                height={58}
                className="h-9 w-auto sm:h-10"
                quality={100}
                sizes="140px"
              />
              <span className="font-brand hidden text-lg text-sage-dark sm:inline">
                Dispatch
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden text-sm text-ink/60 lg:inline">
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
                  className="inline-flex min-h-10 items-center border border-line px-3 text-sm text-ink/80 transition hover:border-burgundy hover:text-burgundy sm:min-h-11"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <nav className="mt-2 flex flex-wrap gap-x-0.5 gap-y-1 border-t border-line/70 pt-2 sm:mt-3 sm:gap-1">
            <Link href="/" className={navLink}>
              Loads
            </Link>
            <Link href="/loads/new" className={navLink}>
              New load
            </Link>
            <Link href="/rates" className={navLink}>
              Rates
            </Link>
            <Link href="/contacts" className={navLink}>
              Contacts
            </Link>
            {session.user.role === "ADMIN" ? (
              <Link href="/users" className={navLink}>
                Users
              </Link>
            ) : null}
            <Link href="/account" className={navLink}>
              Account
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
