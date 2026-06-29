import "server-only";
import { db } from "@/db";
import {
  users,
  settings,
  profile,
  links,
  themes,
  analyticsPageviews,
  analyticsClicks,
} from "@/db/schema";
import {
  eq,
  and,
  or,
  lt,
  gt,
  asc,
  desc,
  isNull,
  sql,
  inArray,
} from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileRow = typeof profile.$inferSelect;
export type LinkRow = typeof links.$inferSelect;
export type ThemeRow = typeof themes.$inferSelect;
export type UserRow = typeof users.$inferSelect;

export interface SocialLink {
  platform: string;
  url: string;
}

export interface DashboardStats {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  topLinks: Array<{ id: number; title: string; clicks: number }>;
  viewsPerDay: Array<{ date: string; views: number; clicks: number }>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<ProfileRow | null> {
  const rows = await db.select().from(profile).limit(1);
  return rows[0] ?? null;
}

export async function getActiveProfile(): Promise<ProfileRow | null> {
  return getProfile();
}

export async function updateProfile(
  data: Partial<Pick<ProfileRow, "avatarUrl" | "displayName" | "bio" | "badgeText" | "socialLinks">>,
): Promise<void> {
  const existing = await getProfile();
  if (existing) {
    await db.update(profile).set(data).where(eq(profile.id, existing.id));
  } else {
    await db.insert(profile).values({
      avatarUrl: data.avatarUrl ?? null,
      displayName: data.displayName ?? "",
      bio: data.bio ?? "",
      badgeText: data.badgeText ?? null,
      socialLinks: data.socialLinks ?? "[]",
    });
  }
}

// ─── Links ────────────────────────────────────────────────────────────────────

const nowExpr = sql`datetime('now')`;

export async function getActiveLinks(): Promise<LinkRow[]> {
  const rows = await db
    .select()
    .from(links)
    .where(
      and(
        eq(links.isActive, true),
        or(
          isNull(links.scheduleStart),
          lt(links.scheduleStart, nowExpr),
        ),
        or(
          isNull(links.scheduleEnd),
          gt(links.scheduleEnd, nowExpr),
        ),
      ),
    )
    .orderBy(asc(links.orderIndex), asc(links.id));
  return rows;
}

export async function getAllLinks(): Promise<LinkRow[]> {
  return db
    .select()
    .from(links)
    .orderBy(asc(links.orderIndex), asc(links.id));
}

export async function createLink(
  data: Pick<LinkRow, "title" | "url"> &
    Partial<
      Pick<
        LinkRow,
        | "type"
        | "description"
        | "icon"
        | "isHighlighted"
        | "isActive"
        | "scheduleStart"
        | "scheduleEnd"
      >
    >,
): Promise<LinkRow> {
  const maxOrder = await db
    .select({ m: sql<number>`max(${links.orderIndex})` })
    .from(links);
  const nextOrder = (maxOrder[0]?.m ?? -1) + 1;

  const created = await db
    .insert(links)
    .values({
      title: data.title,
      url: data.url,
      type: data.type ?? "url",
      description: data.description ?? null,
      icon: data.icon ?? null,
      isHighlighted: data.isHighlighted ?? false,
      isActive: data.isActive ?? true,
      scheduleStart: data.scheduleStart ?? null,
      scheduleEnd: data.scheduleEnd ?? null,
      orderIndex: nextOrder,
    })
    .returning();
  return created[0];
}

export async function updateLink(
  id: number,
  data: Partial<
    Pick<
      LinkRow,
      | "title"
      | "url"
      | "type"
      | "description"
      | "icon"
      | "isHighlighted"
      | "isActive"
      | "scheduleStart"
      | "scheduleEnd"
    >
  >,
): Promise<void> {
  await db.update(links).set(data).where(eq(links.id, id));
}

export async function deleteLink(id: number): Promise<void> {
  await db.delete(links).where(eq(links.id, id));
}

export async function reorderLinks(orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return;
  // Update each link's order index in sequence.
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(links)
      .set({ orderIndex: i })
      .where(eq(links.id, orderedIds[i]));
  }
}

// ─── Themes ───────────────────────────────────────────────────────────────────

export async function getActiveTheme(): Promise<ThemeRow | null> {
  const rows = await db.select().from(themes).where(eq(themes.isActive, true)).limit(1);
  if (rows[0]) return rows[0];

  // Fall back: if no active theme, seed a default.
  const any = await db.select().from(themes).limit(1);
  if (any[0]) {
    await db.update(themes).set({ isActive: true }).where(eq(themes.id, any[0].id));
    return any[0];
  }
  // Seed a default theme if the table is empty.
  const seeded = await db
    .insert(themes)
    .values({
      name: "Midnight",
      backgroundType: "gradient",
      backgroundValue: "#1a1a2e,#16213e",
      fontFamily: "Inter",
      primaryColor: "#0f3460",
      textColor: "#eaeaea",
      linkStyle: "glass",
      animationType: "lift",
      isActive: true,
    })
    .returning();
  return seeded[0];
}

export async function getActiveThemeData(): Promise<ThemeRow | null> {
  return getActiveTheme();
}

export async function getAllThemes(): Promise<ThemeRow[]> {
  return db.select().from(themes).orderBy(asc(themes.id));
}

export async function setActiveTheme(id: number): Promise<void> {
  // better-sqlite3 is synchronous — can't use async transaction callback.
  // Two sequential updates are fine for this simple case.
  await db.update(themes).set({ isActive: false });
  await db.update(themes).set({ isActive: true }).where(eq(themes.id, id));
}

export async function updateTheme(
  id: number,
  data: Partial<
    Pick<
      ThemeRow,
      | "name"
      | "backgroundType"
      | "backgroundValue"
      | "fontFamily"
      | "primaryColor"
      | "textColor"
      | "linkStyle"
      | "animationType"
    >
  >,
): Promise<void> {
  await db.update(themes).set(data).where(eq(themes.id, id));
}

/** Seed a set of attractive preset themes if the table is empty. */
export async function seedThemesIfEmpty(): Promise<void> {
  const count = await db.select({ c: sql<number>`count(*)` }).from(themes);
  if ((count[0]?.c ?? 0) > 0) return;

  const presets = [
    {
      name: "Midnight",
      backgroundType: "gradient",
      backgroundValue: "#1a1a2e,#16213e",
      fontFamily: "Inter",
      primaryColor: "#533fd6",
      textColor: "#eaeaea",
      linkStyle: "glass",
      animationType: "lift",
      isActive: true,
    },
    {
      name: "Sunset",
      backgroundType: "gradient",
      backgroundValue: "#ff6a00,#ee0979",
      fontFamily: "Inter",
      primaryColor: "#ffffff",
      textColor: "#fff7f0",
      linkStyle: "rounded",
      animationType: "scale",
      isActive: false,
    },
    {
      name: "Ocean",
      backgroundType: "gradient",
      backgroundValue: "#2193b0,#6dd5ed",
      fontFamily: "Inter",
      primaryColor: "#003344",
      textColor: "#f0fbff",
      linkStyle: "glass",
      animationType: "lift",
      isActive: false,
    },
    {
      name: "Mono",
      backgroundType: "solid",
      backgroundValue: "#0a0a0a",
      fontFamily: "Inter",
      primaryColor: "#ffffff",
      textColor: "#fafafa",
      linkStyle: "rounded",
      animationType: "none",
      isActive: false,
    },
    {
      name: "Forest",
      backgroundType: "gradient",
      backgroundValue: "#134e5e,#71b280",
      fontFamily: "Inter",
      primaryColor: "#0c2b33",
      textColor: "#f1fff4",
      linkStyle: "glass",
      animationType: "lift",
      isActive: false,
    },
  ];

  await db.insert(themes).values(presets);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function updateSetting(key: string, value: string): Promise<void> {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing[0]) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserCount(): Promise<number> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(users);
  return rows[0]?.c ?? 0;
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(
  username: string,
  passwordHash: string,
): Promise<UserRow> {
  const created = await db.insert(users).values({ username, passwordHash }).returning();
  return created[0];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function recordPageview(
  visitorHash: string,
  referrer: string | null,
  deviceType: string | null,
  country: string | null,
): Promise<void> {
  await db.insert(analyticsPageviews).values({
    visitorHash,
    referrer: referrer ?? null,
    deviceType: deviceType ?? null,
    country: country ?? null,
  });
}

export async function recordClick(
  linkId: number,
  visitorHash: string,
  referrer: string | null,
): Promise<void> {
  await db.insert(analyticsClicks).values({
    linkId,
    visitorHash,
    referrer: referrer ?? null,
  });
  await db
    .update(links)
    .set({ clicksCount: sql`${links.clicksCount} + 1` })
    .where(eq(links.id, linkId));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const sevenDaysAgo = sql`datetime('now', '-7 days')`;

  // Total views in last 7 days
  const viewRows = await db
    .select({ c: sql<number>`count(*)` })
    .from(analyticsPageviews)
    .where(gt(analyticsPageviews.createdAt, sevenDaysAgo));
  const totalViews = viewRows[0]?.c ?? 0;

  // Total clicks in last 7 days
  const clickRows = await db
    .select({ c: sql<number>`count(*)` })
    .from(analyticsClicks)
    .where(gt(analyticsClicks.createdAt, sevenDaysAgo));
  const totalClicks = clickRows[0]?.c ?? 0;

  // Top links by clicks in last 7 days
  const topLinkRows = await db
    .select({
      id: analyticsClicks.linkId,
      title: links.title,
      clicks: sql<number>`count(*)`,
    })
    .from(analyticsClicks)
    .innerJoin(links, eq(links.id, analyticsClicks.linkId))
    .where(gt(analyticsClicks.createdAt, sevenDaysAgo))
    .groupBy(analyticsClicks.linkId)
    .orderBy(desc(sql`count(*)`))
    .limit(5);
  const topLinks = topLinkRows.map((r) => ({
    id: r.id,
    title: r.title,
    clicks: Number(r.clicks),
  }));

  // Views per day for the last 7 days
  const viewsPerDayRows = await db
    .select({
      date: sql<string>`date(${analyticsPageviews.createdAt})`,
      views: sql<number>`count(*)`,
    })
    .from(analyticsPageviews)
    .where(gt(analyticsPageviews.createdAt, sevenDaysAgo))
    .groupBy(sql`date(${analyticsPageviews.createdAt})`)
    .orderBy(asc(sql`date(${analyticsPageviews.createdAt})`));

  const clicksPerDayRows = await db
    .select({
      date: sql<string>`date(${analyticsClicks.createdAt})`,
      clicks: sql<number>`count(*)`,
    })
    .from(analyticsClicks)
    .where(gt(analyticsClicks.createdAt, sevenDaysAgo))
    .groupBy(sql`date(${analyticsClicks.createdAt})`)
    .orderBy(asc(sql`date(${analyticsClicks.createdAt})`));

  // Merge into a 7-day series with zero-fill.
  const clicksMap = new Map<string, number>();
  for (const r of clicksPerDayRows) clicksMap.set(r.date, Number(r.clicks));

  const dateSeries: Array<{ date: string; views: number; clicks: number }> = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const views = viewsPerDayRows.find((r) => r.date === key);
    dateSeries.push({
      date: key,
      views: views ? Number(views.views) : 0,
      clicks: clicksMap.get(key) ?? 0,
    });
  }

  const ctr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;

  return {
    totalViews,
    totalClicks,
    ctr,
    topLinks,
    viewsPerDay: dateSeries,
  };
}

// Keep `inArray` import used (for potential future batch queries)
void inArray;
