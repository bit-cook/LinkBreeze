"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, ExternalLink } from "lucide-react";
import { updateSettings } from "@/server/actions/settings";
import type { ThemeRow } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SettingsFormProps {
  slug: string;
  title: string;
  description: string;
  footerText: string;
  themes: ThemeRow[];
  activeThemeId: number | null;
}

export function SettingsForm({
  slug,
  title,
  description,
  footerText,
  themes,
  activeThemeId,
}: SettingsFormProps) {
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = React.useState<string>(
    activeThemeId ? String(activeThemeId) : "",
  );

  const handleSubmit = (formData: FormData) => {
    if (selectedTheme) {
      formData.set("activeThemeId", selectedTheme);
    }
    startTransition(async () => {
      await updateSettings(formData);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page</CardTitle>
        <CardDescription>
          Configure the public URL slug, page title and SEO metadata.
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Page slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="slug"
                name="slug"
                defaultValue={slug}
                required
                pattern="[a-zA-Z0-9_-]+"
                maxLength={64}
                className="max-w-48"
              />
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="View public page"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Your public page lives at <code>/{slug || "u"}</code>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Page title (SEO)</Label>
            <Input
              id="title"
              name="title"
              defaultValue={title}
              maxLength={120}
              placeholder="Jane Doe — Links"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">SEO description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={description}
              maxLength={300}
              placeholder="All my links in one place"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="footerText">Footer text (optional)</Label>
            <Input
              id="footerText"
              name="footerText"
              defaultValue={footerText}
              maxLength={200}
              placeholder="© 2026 Jane Doe"
            />
          </div>

          {themes.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label>Active theme</Label>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => {
                  const isActive =
                    selectedTheme === String(t.id) ||
                    (!selectedTheme && t.id === activeThemeId);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTheme(String(t.id))}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
                      style={
                        isActive
                          ? { borderColor: "var(--primary)", background: "color-mix(in oklch, var(--primary) 10%, transparent)" }
                          : undefined
                      }
                    >
                      {isActive ? <Badge variant="default">{t.name}</Badge> : t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="gap-3">
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Saving…" : "Save settings"}
          </Button>
          {saved ? (
            <span className="text-sm text-muted-foreground">Saved!</span>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  );
}
