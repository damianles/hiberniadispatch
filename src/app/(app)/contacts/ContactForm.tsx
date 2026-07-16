"use client";

import { useActionState, useRef } from "react";
import {
  createContactAction,
  type ContactActionState,
} from "./actions";

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage";
const label = "block text-xs font-medium text-ink/70";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ContactActionState | undefined,
    FormData
  >(async (prev, formData) => {
    const result = await createContactAction(prev, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, undefined);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            name="nickname"
            required
            placeholder="e.g. Fortigo ops"
            className={field}
          />
        </div>
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
          <input
            id="email"
            name="email"
            type="email"
            required
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" className={field} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input type="checkbox" name="isFavorite" defaultChecked />
        Favourite
      </label>
      {state?.error ? (
        <p className="text-sm text-burgundy">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-sage-dark">Contact saved.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="bg-burgundy px-4 py-2 text-sm font-medium text-white hover:bg-burgundy-hover disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add contact"}
      </button>
    </form>
  );
}
