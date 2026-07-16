"use client";

import { useActionState } from "react";
import { createUserAction, type UserAdminState } from "./actions";

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage";
const label = "block text-xs font-medium text-ink/70";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<
    UserAdminState | undefined,
    FormData
  >(createUserAction, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className={label} htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required className={field} />
      </div>
      <div>
        <label className={label} htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className={field} />
      </div>
      <div>
        <label className={label} htmlFor="password">
          Temporary password
        </label>
        <input
          id="password"
          name="password"
          type="text"
          required
          minLength={8}
          className={field}
        />
      </div>
      <div>
        <label className={label} htmlFor="role">
          Role
        </label>
        <select id="role" name="role" defaultValue="DISPATCHER" className={field}>
          <option value="DISPATCHER">Dispatcher</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {state?.error ? <p className="text-sm text-burgundy">{state.error}</p> : null}
      {state?.ok ? (
        <p className="text-sm text-sage-dark">User created.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundy-hover disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
