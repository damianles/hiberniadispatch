"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  updateProfileAction,
  type AccountActionState,
} from "./actions";

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage";
const label = "block text-xs font-medium text-ink/70";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState<
    AccountActionState | undefined,
    FormData
  >(updateProfileAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="name">
          Display name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultName}
          className={field}
        />
      </div>
      {state?.error ? <p className="text-sm text-burgundy">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-sage-dark">Profile updated. Sign out and back in to refresh the header name.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundy-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<
    AccountActionState | undefined,
    FormData
  >(changePasswordAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
        />
      </div>
      {state?.error ? <p className="text-sm text-burgundy">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-sage-dark">Password changed.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-line px-4 py-2 text-sm hover:border-sage disabled:opacity-50"
      >
        {pending ? "Updating…" : "Change password"}
      </button>
    </form>
  );
}
