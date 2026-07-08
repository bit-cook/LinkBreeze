import { NextRequest, NextResponse } from "next/server";
import { generateQrSvg, generateQrPng } from "@/lib/qr";
import { getSetting } from "@/server/queries";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrigin(request: NextRequest): string {
  // If BASE_URL is set, always use it — prevents host-header injection
  // (X-Forwarded-Host spoofing → QR phishing, OG/canonical spoofing).
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 QR generations per minute per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`qr:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get("slug");
  const format = (searchParams.get("format") || "svg").toLowerCase();
  const size = Math.min(Math.max(Number(searchParams.get("size")) || 256, 64), 1024);
  const download = searchParams.get("download") === "1";

  // Resolve the slug from settings if not provided.
  let slug = slugParam;
  if (!slug) {
    slug = (await getSetting("slug")) || "u";
  }
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const targetUrl = `${getOrigin(request)}/${slug}`;

  const downloadHeaders: Record<string, string> = download
    ? { "Content-Disposition": `attachment; filename="linkbreeze-${slug}.svg"` }
    : {};

  try {
    if (format === "png") {
      const png = await generateQrPng(targetUrl, size);
      return new NextResponse(new Uint8Array(png), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
          ...(download
            ? { "Content-Disposition": `attachment; filename="linkbreeze-${slug}.png"` }
            : {}),
        },
      });
    }

    // Default: SVG
    const svg = await generateQrSvg(targetUrl);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ...downloadHeaders,
      },
    });
  } catch (err) {
    console.error("[qr] error", err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
