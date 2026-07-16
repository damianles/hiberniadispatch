"use client";

import { useActionState } from "react";
import {
  updateLoadStatusAction,
  type UpdateStatusState,
} from "@/app/(app)/loads/actions";
import { STATUS_LABELS, STATUS_OPTIONS } from "@/lib/load-labels";
import type { LoadStatus } from "@prisma/client";

type Props = {
  loadId: string;
  current: LoadStatus;
};

export function StatusForm({ loadId, current }: Props) {
  const [state, formAction, pending] = useActionState<
    UpdateStatusState | undefined,
    FormData
  >(updateLoadStatusAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="loadId" value={loadId} />
      <div>
        <label
          htmlFor="status"
          className="block text-xs font-medium text-ink/70"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          key={current}
          defaultValue={current}
          className="mt-1 border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="border border-line bg-white px-4 py-2 text-sm text-ink/80 transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
      >
        {pending ? "Updating…" : "Update status"}
      </button>
      {state?.error ? (
        <p className="w-full text-sm text-burgundy">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="w-full text-sm text-sage-dark">Status updated.</p>
      ) : null}
    </form>
  );
}
