import * as React from "react";
import { QrCode, Download } from "lucide-react";
import { getSettings, getAllThemes, getActiveTheme } from "@/server/queries";
import { SettingsForm } from "./settings-form";
import { ChangePasswordForm } from "./change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, themes, active] = await Promise.all([
    getSettings(),
    getAllThemes(),
    getActiveTheme(),
  ]);

  const slug = settings.slug || "u";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Page configuration, SEO and account security.
        </p>
      </div>
      <SettingsForm
        slug={slug}
        title={settings.title || ""}
        description={settings.description || ""}
        footerText={settings.footerText || ""}
        themes={themes}
        activeThemeId={active?.id ?? null}
      />

      {/* QR Code section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            QR Code
          </CardTitle>
          <CardDescription>
            Scan to open your page. Download for print or digital use.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="rounded-xl border border-border bg-white p-4">
            <img
              src={`/api/qr?slug=${encodeURIComponent(slug)}&format=svg`}
              alt="QR code"
              width={200}
              height={200}
            />
          </div>
          <div className="flex gap-3">
            <a
              href={`/api/qr?slug=${encodeURIComponent(slug)}&format=svg&download=1`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Download className="size-4" />
              SVG
            </a>
            <a
              href={`/api/qr?slug=${encodeURIComponent(slug)}&format=png&download=1`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Download className="size-4" />
              PNG
            </a>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}
