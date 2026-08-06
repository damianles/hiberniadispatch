"use client";

import { useActionState } from "react";
import {
  rebuildAllLoadsSheetAction,
  type RebuildSheetState,
} from "@/app/(app)/loads/actions";

export function RebuildSheetButton({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState<
    RebuildSheetState | undefined,
    FormData
  >(rebuildAllLoadsSheetAction, undefined);

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <button
        type="submit"
        disabled={pending || !configured}
        className="border border-line px-3 py-2 text-sm text-ink/80 transition hover:border-sage hover:text-sage-dark disabled:opacity-50"
      >
        {pending ? "Rebuilding…" : "Rebuild sheet from app"}
      </button>
      <p className="text-xs text-ink/50">
        Clears the Loads tab and rewrites every load in the current column order.
        Use this after column changes if rows look shifted.
      </p>
      {state?.ok ? (
        <p className="text-xs text-sage-dark">
          Rebuilt {state.rows ?? 0} load{state.rows === 1 ? "" : "s"}.
        </p>
      ) : null}
      {state?.error ? (
        <p className="text-xs text-burgundy">{state.error}</p>
      ) : null}
    </form>
  );
}
