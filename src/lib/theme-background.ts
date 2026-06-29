const NIGHT_BASE = "#0a0820";

interface ThemeBackground {
  backgroundType?: string | null;
  backgroundValue?: string | null;
}

/** True when the theme should render the animated <AuroraBackground />. */
export function isAnimatedAurora(theme: ThemeBackground): boolean {
  return theme.backgroundType === "aurora";
}

/**
 * Resolve a CSS background string for solid / gradient / pattern themes.
 * The "aurora" type is handled separately (renders the AuroraBackground component).
 */
export function resolveBackground(theme: ThemeBackground): string {
  const parts = (theme.backgroundValue || NIGHT_BASE)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return NIGHT_BASE;

  switch (theme.backgroundType) {
    case "solid":
    case "pattern":
      return parts[0];
    case "gradient":
    default:
      return parts.length > 1
        ? `linear-gradient(160deg, ${parts.join(", ")})`
        : parts[0];
  }
}
