import { NextRequest, NextResponse } from "next/server";
import { generateQrSvg, generateQrPng } from "@/lib/qr";
import { getSetting } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrigin(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get("slug");
  const format = (searchParams.get("format") || "svg").toLowerCase();
  const size = Math.min(Math.max(Number(searchParams.get("size")) || 256, 64), 1024);

  // Resolve the slug from settings if not provided.
  let slug = slugParam;
  if (!slug) {
    slug = (await getSetting("slug")) || "u";
  }
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const targetUrl = `${getOrigin(request)}/${slug}`;

  try {
    if (format === "png") {
      const png = await generateQrPng(targetUrl, size);
      return new NextResponse(new Uint8Array(png), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
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
      },
    });
  } catch (err) {
    console.error("[qr] error", err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
