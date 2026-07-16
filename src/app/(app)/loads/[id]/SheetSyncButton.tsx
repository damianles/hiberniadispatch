"use client";

import { useActionState } from "react";
import {
  resyncLoadToSheetAction,
  type ResyncSheetState,
} from "@/app/(app)/loads/actions";

type Props = {
  loadId: string;
  sheetsConfigured: boolean;
};

export function SheetSyncButton({ loadId, sheetsConfigured }: Props) {
  const [state, formAction, pending] = useActionState<
    ResyncSheetState | undefined,
    FormData
  >(resyncLoadToSheetAction, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="loadId" value={loadId} />
      <button
        type="submit"
        disabled={pending}
        className="border border-line px-3 py-2 text-sm text-ink/80 transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
      >
        {pending ? "Syncing…" : "Sync to Google Sheet"}
      </button>
      {!sheetsConfigured ? (
        <p className="text-xs text-ink/45">
          Sheets not configured — sync will no-op until credentials are added.
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-xs text-sage-dark">Synced to Google Sheet.</p>
      ) : null}
      {state?.error ? (
        <p className="text-xs text-burgundy">{state.error}</p>
      ) : null}
    </form>
  );
}
