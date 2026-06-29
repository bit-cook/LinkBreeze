"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  setActiveTheme,
  updateTheme,
  getActiveTheme,
} from "@/server/queries";

export type ActionResult = { success: true } | { success: false; error: string };

const customSchema = z.object({
  backgroundValue: z.string().max(200).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "Invalid color")
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "Invalid color")
    .optional(),
  linkStyle: z.enum(["rounded", "sharp", "glass"]).optional(),
  animationType: z.enum(["lift", "scale", "none"]).optional(),
});

export async function activateTheme(id: number): Promise<ActionResult> {
  if (!(await getSession())) return { success: false, error: "Unauthorized" };
  if (typeof id !== "number" || Number.isNaN(id)) {
    return { success: false, error: "Invalid theme id" };
  }
  await setActiveTheme(id);
  revalidatePath("/theme");
  revalidatePath("/");
  return { success: true };
}

export async function customizeActiveTheme(formData: FormData): Promise<ActionResult> {
  if (!(await getSession())) return { success: false, error: "Unauthorized" };

  const parsed = customSchema.safeParse({
    backgroundValue: formData.get("backgroundValue") || undefined,
    primaryColor: formData.get("primaryColor") || undefined,
    textColor: formData.get("textColor") || undefined,
    linkStyle: formData.get("linkStyle") || undefined,
    animationType: formData.get("animationType") || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const active = await getActiveTheme();
  if (!active) return { success: false, error: "No active theme" };

  const updates: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) updates[key] = value as string;
  }
  if (Object.keys(updates).length > 0) {
    await updateTheme(active.id, updates);
  }

  revalidatePath("/theme");
  revalidatePath("/");
  return { success: true };
}
