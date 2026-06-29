/**
 * LinkBreeze Demo Seed Script
 * Run with: DEMO_MODE=true npx tsx src/scripts/seed-demo.ts
 * Populates a fresh database with demo data for the read-only demo instance.
 */
import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "linkbreeze.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Seeding demo data...");

  // ─── Admin user ─────────────────────────────────
  const existingCount = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.users)
    .get();
  if ((existingCount?.c ?? 0) > 0) {
    console.log("Database already has data. Skipping seed.");
    process.exit(0);
  }

  const passwordHash = bcrypt.hashSync("demo1234", 12);
  db.insert(schema.users).values({
    username: "demo",
    passwordHash,
  }).run();
  console.log("✓ Admin user created (demo / demo1234)");

  // ─── Settings ──────────────────────────────────
  const settings: Record<string, string> = {
    slug: "alex",
    title: "Alex Rivera — Links",
    description: "Content creator · Photographer · Always creating",
    footerText: "© 2026 Alex Rivera",
  };
  for (const [key, value] of Object.entries(settings)) {
    db.insert(schema.settings).values({ key, value }).run();
  }
  console.log("✓ Settings created");

  // ─── Profile ───────────────────────────────────
  const socialLinks = JSON.stringify([
    { platform: "instagram", url: "https://instagram.com/alexrivera" },
    { platform: "youtube", url: "https://youtube.com/@alexrivera" },
    { platform: "tiktok", url: "https://tiktok.com/@alexrivera" },
    { platform: "twitter", url: "https://x.com/alexrivera" },
  ]);

  db.insert(schema.profile).values({
    avatarUrl: null,
    displayName: "Alex Rivera",
    bio: "Content creator · Photographer · Always creating",
    badgeText: "Creator",
    socialLinks,
  }).run();
  console.log("✓ Profile created");

  // ─── Links ─────────────────────────────────────
  const links = [
    { title: "Watch my latest video", url: "https://youtube.com/watch?v=demo", description: "I traveled to Iceland and this happened...", type: "url", isHighlighted: true, orderIndex: 0 },
    { title: "My photography portfolio", url: "https://alexrivera.photos", description: "Landscape & street photography", type: "url", isHighlighted: false, orderIndex: 1 },
    { title: "Follow me on Instagram", url: "https://instagram.com/alexrivera", description: "@alexrivera · 125k followers", type: "url", isHighlighted: false, orderIndex: 2 },
    { title: "Join my newsletter", url: "https://alexrivera.com/newsletter", description: "Weekly creative tips — free", type: "url", isHighlighted: false, orderIndex: 3 },
    { title: "Shop my camera gear", url: "https://amazon.com/shop/alexrivera", description: "Everything I use to shoot", type: "url", isHighlighted: false, orderIndex: 4 },
    { title: "Contact me", url: "mailto:hello@alexrivera.com", description: "Business inquiries welcome", type: "email", isHighlighted: false, orderIndex: 5 },
  ];
  for (const link of links) {
    db.insert(schema.links).values({
      ...link,
      isActive: true,
      clicksCount: Math.floor(Math.random() * 500) + 50,
    }).run();
  }
  console.log(`✓ ${links.length} links created`);

  // ─── Themes ────────────────────────────────────
  const themes = [
    { name: "Midnight", backgroundType: "aurora", backgroundValue: "#0f0c29,#1a1a2e,#16213e", fontFamily: "Inter", primaryColor: "#a78bfa", textColor: "#eaeaea", linkStyle: "glass", animationType: "lift", isActive: true },
    { name: "Sunset", backgroundType: "gradient", backgroundValue: "#ff6a00,#ee0979", fontFamily: "Inter", primaryColor: "#ffffff", textColor: "#fff7f0", linkStyle: "rounded", animationType: "scale", isActive: false },
    { name: "Ocean", backgroundType: "gradient", backgroundValue: "#2193b0,#6dd5ed", fontFamily: "Inter", primaryColor: "#003344", textColor: "#f0fbff", linkStyle: "glass", animationType: "lift", isActive: false },
    { name: "Mono", backgroundType: "solid", backgroundValue: "#0a0a0a", fontFamily: "Inter", primaryColor: "#ffffff", textColor: "#fafafa", linkStyle: "rounded", animationType: "none", isActive: false },
    { name: "Forest", backgroundType: "gradient", backgroundValue: "#134e5e,#71b280", fontFamily: "Inter", primaryColor: "#0c2b33", textColor: "#f1fff4", linkStyle: "glass", animationType: "lift", isActive: false },
  ];
  for (const theme of themes) {
    db.insert(schema.themes).values(theme).run();
  }
  console.log(`✓ ${themes.length} themes created`);

  // ─── Fake analytics (last 7 days) ──────────────
  const now = Date.now();
  const referrers = [null, "https://instagram.com", "https://tiktok.com", "https://youtube.com", null, "https://google.com", null];
  const devices = ["mobile", "mobile", "desktop", "mobile", "tablet"];

  for (let day = 6; day >= 0; day--) {
    const date = new Date(now - day * 86400000);
    const viewsCount = Math.floor(Math.random() * 80) + 30;
    for (let v = 0; v < viewsCount; v++) {
      const hash = Math.random().toString(36).substring(2, 18);
      db.insert(schema.analyticsPageviews).values({
        visitorHash: hash,
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
        deviceType: devices[Math.floor(Math.random() * devices.length)],
        country: null,
      }).run();
    }
  }
  console.log("✓ Analytics data generated (7 days)");

  // Clicks on links
  const allLinks = db.select().from(schema.links).all();
  for (let day = 6; day >= 0; day--) {
    for (const link of allLinks) {
      const clickCount = Math.floor(Math.random() * 20) + 2;
      for (let c = 0; c < clickCount; c++) {
        const hash = Math.random().toString(36).substring(2, 18);
        db.insert(schema.analyticsClicks).values({
          linkId: link.id,
          visitorHash: hash,
          referrer: referrers[Math.floor(Math.random() * referrers.length)],
        }).run();
      }
    }
  }
  console.log("✓ Click analytics generated");

  console.log("\n✅ Demo seed complete!");
  console.log("   Admin: demo / demo1234");
  console.log("   Public page: /alex");
}

seed().catch(console.error);
