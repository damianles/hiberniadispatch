"use client";

import { useActionState, useState } from "react";
import {
  sendDispatchEmailAction,
  type SendDispatchState,
} from "./send-actions";

export type ContactOption = {
  id: string;
  nickname: string;
  name: string;
  email: string;
  isFavorite: boolean;
};

const field =
  "mt-1 w-full border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage";
const label = "block text-xs font-medium text-ink/70";

type Props = {
  loadId: string;
  outboundNumber: string;
  contacts: ContactOption[];
  mailConfigured: boolean;
};

export function SendDispatchForm({
  loadId,
  outboundNumber,
  contacts,
  mailConfigured,
}: Props) {
  const [state, formAction, pending] = useActionState<
    SendDispatchState | undefined,
    FormData
  >(sendDispatchEmailAction, undefined);

  const [contactId, setContactId] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [saveContact, setSaveContact] = useState(false);

  const favorites = contacts.filter((c) => c.isFavorite);
  const others = contacts.filter((c) => !c.isFavorite);

  function applyContact(id: string) {
    setContactId(id);
    if (!id) return;
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    setToEmail(c.email);
    setToName(c.name);
    setSaveContact(false);
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="loadId" value={loadId} />
      <input type="hidden" name="contactId" value={contactId} />

      {!mailConfigured ? (
        <p className="border border-burgundy/30 bg-burgundy/5 px-3 py-2 text-sm text-burgundy">
          Email not configured yet. Add <code>SMTP_USER</code> and{" "}
          <code>SMTP_PASS</code> for Outlook/Microsoft 365 (see{" "}
          <code>.env.example</code>), then restart.
        </p>
      ) : null}

      <div>
        <label className={label} htmlFor="contactPick">
          Saved contact
        </label>
        <select
          id="contactPick"
          className={field}
          value={contactId}
          onChange={(e) => applyContact(e.target.value)}
        >
          <option value="">Enter email manually…</option>
          {favorites.length > 0 ? (
            <optgroup label="Favourites">
              {favorites.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname} — {c.email}
                </option>
              ))}
            </optgroup>
          ) : null}
          {others.length > 0 ? (
            <optgroup label="All contacts">
              {others.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nickname} — {c.email}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="toEmail">
            Send to email
          </label>
          <input
            id="toEmail"
            name="toEmail"
            type="email"
            required
            className={field}
            value={toEmail}
            onChange={(e) => {
              setToEmail(e.target.value);
              setContactId("");
            }}
            placeholder="ops@example.com"
          />
        </div>
        <div>
          <label className={label} htmlFor="toName">
            Recipient name
          </label>
          <input
            id="toName"
            name="toName"
            className={field}
            value={toName}
            onChange={(e) => setToName(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/80">
        <input
          type="checkbox"
          name="saveContact"
          checked={saveContact}
          onChange={(e) => setSaveContact(e.target.checked)}
          disabled={Boolean(contactId)}
        />
        Save as favourite contact
      </label>
      {saveContact && !contactId ? (
        <div>
          <label className={label} htmlFor="nickname">
            Contact nickname
          </label>
          <input
            id="nickname"
            name="nickname"
            required={saveContact}
            className={field}
            placeholder="e.g. My inbox"
          />
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-burgundy">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-sage-dark">
          Dispatch {outboundNumber} emailed to {state.sentTo}.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !mailConfigured}
        className="bg-sage px-4 py-2 text-sm font-medium text-white transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Sending…" : "Email dispatch PDF"}
      </button>
    </form>
  );
}
