import * as React from "react";
import { getAllThemes, getActiveTheme, seedThemesIfEmpty } from "@/server/queries";
import { ThemeManager } from "./theme-manager";

export const dynamic = "force-dynamic";

export default async function ThemePage() {
  // Ensure presets exist, then load.
  await seedThemesIfEmpty();
  const [themes, active] = await Promise.all([getAllThemes(), getActiveTheme()]);

  return <ThemeManager themes={themes} activeId={active?.id ?? null} active={active} />;
}
