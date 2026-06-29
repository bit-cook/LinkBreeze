"use client";

import * as React from "react";
import { Check, Save, Palette } from "lucide-react";
import { activateTheme, customizeActiveTheme } from "@/server/actions/theme";
import type { ThemeRow } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThemeManagerProps {
  themes: ThemeRow[];
  activeId: number | null;
  active: ThemeRow | null;
}

function swatchFor(theme: ThemeRow): React.CSSProperties {
  const parts = theme.backgroundValue.split(",");
  return theme.backgroundType === "solid"
    ? { background: parts[0] }
    : { background: `linear-gradient(135deg, ${theme.backgroundValue})` };
}

export function ThemeManager({ themes, activeId, active }: ThemeManagerProps) {
  const [selecting, setSelecting] = React.useState<number | null>(null);
  const [customPending, setCustomPending] = React.useState(false);
  const [linkStyle, setLinkStyle] = React.useState(active?.linkStyle ?? "glass");
  const [animationType, setAnimationType] = React.useState(active?.animationType ?? "lift");

  const handleSelect = async (id: number) => {
    setSelecting(id);
    try {
      await activateTheme(id);
      // Refresh to load the new active theme defaults.
      window.location.reload();
    } finally {
      setSelecting(null);
    }
  };

  const handleCustom = (formData: FormData) => {
    formData.set("linkStyle", linkStyle);
    formData.set("animationType", animationType);
    setCustomPending(true);
    customizeActiveTheme(formData).finally(() => setCustomPending(false));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Theme</h1>
        <p className="text-sm text-muted-foreground">
          Choose a preset or customise the active theme.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const isActive = theme.id === activeId;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className="group relative overflow-hidden rounded-xl border border-border text-left transition-all hover:ring-2 hover:ring-ring/50 data-[active=true]:ring-2 data-[active=true]:ring-primary"
              data-active={isActive}
              type="button"
            >
              <div
                className="flex h-32 items-end p-3"
                style={{ ...swatchFor(theme), color: theme.textColor }}
              >
                <span className="rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm"
                  style={{ background: "rgba(0,0,0,0.25)", color: theme.textColor }}
                >
                  {theme.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-card p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="size-3.5 text-muted-foreground" />
                  <span>{theme.linkStyle} · {theme.animationType}</span>
                </div>
                {isActive ? (
                  <Badge variant="default">
                    <Check className="size-3" /> Active
                  </Badge>
                ) : selecting === theme.id ? (
                  <span className="text-xs text-muted-foreground">Applying…</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Use</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {active ? (
        <>
          <Separator />
          <Card className="mx-auto w-full max-w-xl">
            <CardHeader>
              <CardTitle>Customise “{active.name}”</CardTitle>
              <CardDescription>
                Override colours and card style for the active theme.
              </CardDescription>
            </CardHeader>
            <form action={handleCustom}>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="backgroundValue">Background</Label>
                  <Input
                    id="backgroundValue"
                    name="backgroundValue"
                    defaultValue={active.backgroundValue}
                    placeholder="#1a1a2e,#16213e"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="primaryColor">Primary colour</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      name="primaryColor"
                      defaultValue={active.primaryColor}
                      placeholder="#533fd6"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="textColor">Text colour</Label>
                  <Input
                    id="textColor"
                    name="textColor"
                    defaultValue={active.textColor}
                    placeholder="#eaeaea"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Card style</Label>
                  <Select value={linkStyle} onValueChange={(v) => setLinkStyle(v ?? "glass")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="glass">Glass</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="sharp">Sharp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Animation</Label>
                  <Select value={animationType} onValueChange={(v) => setAnimationType(v ?? "lift")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lift">Lift</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={customPending}>
                  <Save className="size-4" />
                  {customPending ? "Saving…" : "Save customisation"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </>
      ) : null}
    </div>
  );
}
