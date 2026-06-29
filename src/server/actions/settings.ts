"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { updateSetting as updateSettingQuery, getSettings } from "@/server/queries";

export type ActionResult = { success: true } | { success: false; error: string };

const settingsSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, "Slug may only contain letters, numbers, hyphens and underscores"),
  title: z.string().max(120).optional().default(""),
  description: z.string().max(300).optional().default(""),
  footerText: z.string().max(200).optional().default(""),
  activeThemeId: z.string().optional().nullable(),
});

export async function updateSettings(formData: FormData): Promise<ActionResult> {
  if (!(await getSession())) return { success: false, error: "Unauthorized" };

  const parsed = settingsSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title") || "",
    description: formData.get("description") || "",
    footerText: formData.get("footerText") || "",
    activeThemeId: formData.get("activeThemeId") || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  await updateSettingQuery("slug", d.slug);
  await updateSettingQuery("title", d.title);
  await updateSettingQuery("description", d.description);
  await updateSettingQuery("footerText", d.footerText);

  // Persist active theme if provided.
  if (d.activeThemeId) {
    const id = Number(d.activeThemeId);
    if (!Number.isNaN(id)) {
      const { setActiveTheme } = await import("@/server/queries");
      await setActiveTheme(id);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true };
}

/** Helper used by the settings page to hydrate the form. */
export async function getSettingsForForm() {
  if (!(await getSession())) return null;
  return getSettings();
}
