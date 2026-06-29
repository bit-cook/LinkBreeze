"use client";

import * as React from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { updateProfile } from "@/server/actions/profile";
import { SUPPORTED_PLATFORMS, getPlatformLabel, type SocialPlatform } from "@/lib/social-icons";
import type { SocialLink } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";

interface ProfileFormProps {
  profile: {
    displayName: string;
    bio: string;
    badgeText: string;
    avatarUrl: string;
    socialLinks: SocialLink[];
  } | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [socialLinks, setSocialLinks] = React.useState<SocialLink[]>(
    profile?.socialLinks ?? [],
  );
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);

  const addSocial = () => {
    setSocialLinks((prev) => [...prev, { platform: "instagram", url: "" }]);
  };

  const updateSocial = (index: number, field: keyof SocialLink, value: string) => {
    setSocialLinks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const removeSocial = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (formData: FormData) => {
    const cleaned = socialLinks.filter((s) => s.url.trim().length > 0);
    formData.set("socialLinks", JSON.stringify(cleaned));

    startTransition(async () => {
      await updateProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          This information appears on your public page.
        </p>
      </div>

      <form action={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Your public identity</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="size-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">
                  {(profile?.displayName || "?").charAt(0)}
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  defaultValue={profile?.avatarUrl ?? ""}
                  placeholder="https://…/avatar.png"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile?.displayName ?? ""}
                required
                maxLength={80}
                placeholder="Jane Doe"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Input
                id="bio"
                name="bio"
                defaultValue={profile?.bio ?? ""}
                maxLength={300}
                placeholder="A short description"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="badgeText">Badge text (optional)</Label>
              <Input
                id="badgeText"
                name="badgeText"
                defaultValue={profile?.badgeText ?? ""}
                maxLength={40}
                placeholder="✨ Available for work"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
            <CardDescription>
              Icons appear above your link cards. Add the platforms you use.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {socialLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No social links added yet.</p>
            ) : (
              socialLinks.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={item.platform}
                    onValueChange={(v) => updateSocial(i, "platform", v ?? "instagram")}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {getPlatformLabel(p as SocialPlatform)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={item.url}
                    onChange={(e) => updateSocial(i, "url", e.target.value)}
                    placeholder="https://…"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => removeSocial(i)}
                    className="text-destructive"
                    aria-label="Remove social link"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
            <Separator className="my-1" />
            <Button variant="outline" type="button" onClick={addSocial} className="w-fit">
              <Plus className="size-4" />
              Add social link
            </Button>
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Saving…" : "Save profile"}
            </Button>
            {saved ? (
              <span className="text-sm text-muted-foreground">Saved!</span>
            ) : null}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
