"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { loginAction } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink/80">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="briancasey@hiberniatrading.com"
          className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink outline-none focus:border-sage"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink/80">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink outline-none focus:border-sage"
        />
      </div>
      {state?.error ? <p className="text-sm text-burgundy">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-burgundy px-4 py-2.5 text-sm font-medium tracking-wide text-white transition hover:bg-burgundy-hover disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/hibernia-logo.png"
            alt="Hibernia Trading Inc"
            width={400}
            height={83}
            className="mx-auto h-auto w-[220px]"
            quality={100}
            priority
            sizes="220px"
          />
          <h1 className="font-brand mt-6 text-3xl text-sage-dark">Freight Dispatch</h1>
          <p className="mt-2 text-sm text-ink/60">Sign in to manage loads and rates</p>
        </div>
        <div className="border border-line bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <Suspense fallback={<p className="text-sm text-ink/50">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
