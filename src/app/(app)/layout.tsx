import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { MobileNav } from "@/components/MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const navItems = [
    { href: "/", label: "Loads" },
    { href: "/loads/new", label: "New load" },
    { href: "/rates", label: "Rates" },
    { href: "/contacts", label: "Contacts" },
    ...(session.user.role === "ADMIN"
      ? [{ href: "/users", label: "Users" }]
      : []),
    { href: "/account", label: "Account" },
  ];

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const navLink =
    "inline-flex min-h-11 items-center px-2.5 text-sm text-ink/70 transition hover:text-sage-dark";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-sm">
        <div className="relative mx-auto max-w-6xl px-4 py-2 sm:py-3">
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

            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={navLink}>
                  {item.label}
                </Link>
              ))}
              <span className="ml-2 hidden text-sm text-ink/60 lg:inline">
                {session.user.name} · {session.user.role}
              </span>
              <form action={signOutAction} className="ml-2">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center border border-line px-3 text-sm text-ink/80 transition hover:border-burgundy hover:text-burgundy"
                >
                  Sign out
                </button>
              </form>
            </nav>

            <MobileNav
              items={navItems}
              userLabel={`${session.user.name} · ${session.user.role}`}
              signOutAction={signOutAction}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
