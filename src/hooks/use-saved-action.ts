"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { usePreview } from "@/components/admin/PreviewPane";

/**
 * Shared save-flow wiring (Spec: "Preview follows edits").
 *
 * Wraps the standard admin save flow — call a server action (ActionResult),
 * then on success `router.refresh()` AND reload the live preview with a
 * cache-busted iframe URL. Every mutating admin form goes through this; there
 * is no per-form preview logic anywhere.
 *
 * Returns:
 *  - `run(action, ...args)` — invokes the action inside a transition; resolves
 *    with the ActionResult so callers can surface errors inline (role=alert).
 *    On success the router refresh and the cache-busted preview reload are
 *    already done — callers must NOT call reloadPreview()/router.refresh()
 *    again around it. Rejections are caught internally and returned as an
 *    ActionResult-shaped failure.
 *  - `pending` — true while the transition runs (wire to Save buttons).
 */
export function useSavedAction() {
  const router = useRouter();
  const { reload: reloadPreview } = usePreview();
  const [pending, startTransition] = React.useTransition();

  const run = React.useCallback(
    <T,>(action: (...args: never[]) => Promise<T>, ...args: unknown[]): Promise<T> => {
      let resolveOuter!: (v: T) => void;
      const outer = new Promise<T>((resolve) => {
        resolveOuter = resolve;
      });
      startTransition(async () => {
        let result: T;
        try {
          result = await (action as (...a: unknown[]) => Promise<T>)(...args);
        } catch {
          // Network/JS failure: synthesize the standard internal ActionResult
          // so callers can branch on it like any other failure (and the
          // refresh below correctly does not happen).
          result = {
            success: false,
            error: "Something went wrong. Please try again.",
            errorCode: "internal",
          } as T;
        }
        resolveOuter(result);
        // Failure detection: ActionResult-shaped values with success:false.
        // Anything else (ActionResult success, void helpers) counts as saved.
        const res = result as { success?: boolean } | undefined;
        if (res && typeof res === "object" && res.success === false) return;
        router.refresh();
        reloadPreview();
      });
      return outer;
    },
    [router, reloadPreview],
  );

  // Stable identity: run/pending/cancel never change across renders, so
  // consumers can safely use `savedAction` itself as a hook dependency.
  const stableApi = React.useMemo(
    () => ({ run, pending }),
    [run, pending],
  );
  return stableApi;
}

/** Copy a FormData (FormData has no clone constructor). */
export function cloneFormData(fd: FormData): FormData {
  const out = new FormData();
  for (const [k, v] of fd.entries()) out.append(k, v);
  return out;
}

/** Shallow equality of two FormData objects (same keys, same string values). */
export function sameFormData(a: FormData, b: FormData): boolean {
  const ae = [...a.entries()];
  const be = [...b.entries()];
  if (ae.length !== be.length) return false;
  return ae.every(([k, v], i) => {
    const [bk, bv] = be[i];
    return k === bk && String(v) === String(bv);
  });
}

/**
 * Deferred flush helper for the debounced autosave surfaces (theme editor,
 * page appearance). `createAutosaver` returns a function that batches rapid
 * param changes and invokes `flush` once with the LATEST params after `delay`
 * ms of quiet. The returned handle also exposes `flushNow()` (timer skip on
 * blur/unmount) and `cancel()` (component teardown).
 */
export function createAutosaver<A extends unknown[]>(
  flush: (...args: A) => void,
  delay = 500,
): {
  schedule: (...args: A) => void;
  flushNow: () => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;
  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return {
    schedule: (...args: A) => {
      pendingArgs = args;
      clear();
      timer = setTimeout(() => {
        timer = null;
        const a = pendingArgs;
        pendingArgs = null;
        if (a) flush(...a);
      }, delay);
    },
    flushNow: () => {
      clear();
      const a = pendingArgs;
      pendingArgs = null;
      if (a) flush(...a);
    },
    cancel: () => {
      clear();
      pendingArgs = null;
    },
  };
}

/**
 * Autosaved-form wiring: attach `formRef` to the <form>; call `schedule()`
 * from any input's onChange (and after programmatic state changes) and
 * `flushNow()` on form blur. The flush reads the form's LIVE DOM values —
 * no per-field mirror needed — and routes them through the latest `submit`
 * closure (kept fresh via effect, so state-reading submit handlers like
 * "socialLinks from useState" always see current data).
 *
 * Also returns `status`: "idle" → "saving" (flush fired) → "saved" (the
 * action resolved successfully, shown ~2s) — render it so users SEE
 * autosave working.
 */
export function useAutosavedForm(
  submit: (formData: FormData) => void,
  delay = 700,
): {
  formRef: React.RefObject<HTMLFormElement | null>;
  schedule: () => void;
  flushNow: () => void;
  status: "idle" | "saving" | "saved";
} {
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const submitRef = React.useRef(submit);
  React.useEffect(() => {
    submitRef.current = submit;
  });
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const savedTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // The flush closure touches refs, so the autosaver must be created in an
  // effect (the react-hooks/refs rule forbids render-time construction paths
  // — useMemo/useState factories included). Until it mounts, schedule/flush
  // no-op; effects run before users can interact, so nothing is lost.
  const [autosaver, setAutosaver] = React.useState<ReturnType<
    typeof createAutosaver
  > | null>(null);
  React.useEffect(() => {
    const a = createAutosaver(() => {
      const form = formRef.current;
      if (!form) return;
      setStatus("saving");
      Promise.resolve(submitRef.current(new FormData(form))).then((result) => {
        // ActionResult-shaped failure: don't claim "saved".
        const res = result as { success?: boolean } | undefined;
        if (res && typeof res === "object" && res.success === false) {
          setStatus("idle");
          return;
        }
        setStatus("saved");
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setStatus("idle"), 2000);
      });
    }, delay);
    setAutosaver(a);
    return () => {
      a.cancel();
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [delay]);
  const schedule = React.useCallback((...args: Parameters<ReturnType<typeof createAutosaver>["schedule"]>) => {
    autosaver?.schedule(...args);
  }, [autosaver]);
  const flushNow = React.useCallback(() => {
    autosaver?.flushNow();
  }, [autosaver]);
  return { formRef, schedule, flushNow, status };
}
