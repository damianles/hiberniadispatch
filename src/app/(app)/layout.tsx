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
    "inline-flex min-h-11 shrink-0 items-center px-2 text-ink/70 transition hover:text-sage-dark";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:py-3">
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
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <nav className="-mx-1 flex items-center gap-0.5 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <span className="hidden shrink-0 text-sm text-ink/60 lg:inline">
              {session.user.name} · {session.user.role}
            </span>
            <form
              className="shrink-0"
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="inline-flex min-h-11 items-center border border-line px-3 text-sm text-ink/80 transition hover:border-burgundy hover:text-burgundy"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
