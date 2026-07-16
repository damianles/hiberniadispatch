import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PasswordForm, ProfileForm } from "./AccountForms";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <section>
      <h1 className="font-brand text-3xl text-sage-dark">Account</h1>
      <p className="mt-2 text-ink/60">Your profile and password</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 py-2">
              <dt className="text-ink/55">Email</dt>
              <dd>{session.user.email}</dd>
            </div>
            <div className="flex justify-between border-b border-line/50 py-2">
              <dt className="text-ink/55">Role</dt>
              <dd>{session.user.role}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <ProfileForm defaultName={session.user.name} />
          </div>
        </div>

        <div className="border border-line bg-white/80 p-5">
          <h2 className="font-brand text-xl text-burgundy">Change password</h2>
          <p className="mt-1 text-xs text-ink/50">
            Use at least 8 characters. This is your Hibernia login — separate from
            any Gmail App Password used for sending mail.
          </p>
          <div className="mt-4">
            <PasswordForm />
          </div>
        </div>
      </div>
    </section>
  );
}
