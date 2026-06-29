import * as React from "react";
import { getSettings, getAllThemes, getActiveTheme } from "@/server/queries";
import { SettingsForm } from "./settings-form";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, themes, active] = await Promise.all([
    getSettings(),
    getAllThemes(),
    getActiveTheme(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Page configuration, SEO and account security.
        </p>
      </div>
      <SettingsForm
        slug={settings.slug || "u"}
        title={settings.title || ""}
        description={settings.description || ""}
        footerText={settings.footerText || ""}
        themes={themes}
        activeThemeId={active?.id ?? null}
      />
      <ChangePasswordForm />
    </div>
  );
}
