/**
 * Image adjustment resolver — Spec: Image-Positioning.
 *
 * Turns the nullable per-upload adjustment columns (fit / posX / posY /
 * zoom) into CSS declarations. Pure module: no @/db import, safe for client
 * components and tests. Every default reproduces the pre-spec rendering, so
 * NULL metadata renders pixel-identical to before:
 *   fit NULL → object-fit: cover (the old hardcoded class)
 *   pos NULL → object-position: 50% 50%
 *   zoom NULL → no transform
 */

import type * as React from "react";

export interface ImageAdjustment {
  fit?: string | null;
  posX?: number | null;
  posY?: number | null;
  zoom?: number | null;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** object-fit value: "contain" when stored, otherwise "cover" (default). */
export function resolveObjectFit(adj: ImageAdjustment | null | undefined): "cover" | "contain" {
  return adj?.fit === "contain" ? "contain" : "cover";
}

/** object-position percentage string from the 0–1 focus point. */
export function resolveObjectPosition(adj: ImageAdjustment | null | undefined): string {
  const x = typeof adj?.posX === "number" ? clamp01(adj.posX) * 100 : 50;
  const y = typeof adj?.posY === "number" ? clamp01(adj.posY) * 100 : 50;
  return `${x}% ${y}%`;
}

/** Zoom multiplier clamped to 1–3 (1 = no zoom → no transform emitted). */
export function resolveZoom(adj: ImageAdjustment | null | undefined): number {
  const z = adj?.zoom;
  if (typeof z !== "number" || Number.isNaN(z)) return 1;
  return Math.min(3, Math.max(1, z));
}

/**
 * Full style object for <img>/<Image>/<video> consumers. `width`/`height`
 * are the rendered box the image fills (object-fit crops inside it); zoom
 * scales the image within the box via transform (the box clips overflow —
 * consumers must place this inside an overflow-hidden frame, which the
 * avatar/banner wrappers already are).
 */
export function imageAdjustmentStyle(
  adj: ImageAdjustment | null | undefined,
): React.CSSProperties {
  const zoom = resolveZoom(adj);
  return {
    objectFit: resolveObjectFit(adj),
    objectPosition: resolveObjectPosition(adj),
    ...(zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: resolveObjectPosition(adj) } : {}),
  };
}
