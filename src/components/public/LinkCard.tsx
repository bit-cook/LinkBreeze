import * as React from "react";
import type { ProfileRow, LinkRow } from "@/server/queries";

interface LinkCardProps {
  link: LinkRow;
  profile: Pick<ProfileRow, "displayName">;
  theme: {
    textColor: string;
    primaryColor: string;
    linkStyle: string;
    animationType: string;
  };
}

/**
 * Pure Server Component — zero client JavaScript.
 *
 * The anchor is emitted as a raw HTML string via dangerouslySetInnerHTML so
 * that the inline `onclick` (using navigator.sendBeacon) survives into the
 * static HTML untouched. This keeps the public page 100% client-JS-free while
 * still tracking outbound clicks.
 */
export function LinkCard({ link, theme }: LinkCardProps) {
  const radius =
    theme.linkStyle === "sharp" ? "4px" : theme.linkStyle === "glass" ? "14px" : "12px";

  const cardBg =
    theme.linkStyle === "glass"
      ? "rgba(255,255,255,0.07)"
      : "rgba(255,255,255,0.04)";

  const border = link.isHighlighted
    ? `2px solid ${theme.primaryColor}`
    : "1px solid rgba(255,255,255,0.12)";

  const transition =
    theme.animationType === "none"
      ? "none"
      : theme.animationType === "scale"
        ? "transform .18s ease, box-shadow .18s ease"
        : "transform .18s ease, box-shadow .18s ease";

  const hoverTransform =
    theme.animationType === "scale"
      ? "scale(1.03)"
      : theme.animationType === "lift"
        ? "translateY(-3px)"
        : "none";

  // Inline click tracking — fires a beacon to /api/track without JS bundle.
  const clickHandler = `navigator.sendBeacon('/api/track', JSON.stringify({type:'click',linkId:${link.id}}))`;

  // Escape attribute values for safe injection.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const title = esc(link.title);
  const description = link.description ? esc(link.description) : "";
  const href = esc(link.url);
  const highlightDot = link.isHighlighted
    ? `<span aria-hidden="true" style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:${theme.primaryColor};margin-right:8px;flex-shrink:0"></span>`
    : "";

  const descHtml = description
    ? `<p style="font-size:12px;opacity:.7;margin:2px 0 0">${description}</p>`
    : "";

  // Non-http links (mailto:, tel:, sms:) should not open in new tab
  const isExternalUrl = href.startsWith("http://") || href.startsWith("https://");
  const targetAttr = isExternalUrl ? `target="_blank" rel="noopener noreferrer nofollow"` : "";

  const html = `<a
    href="${href}"
    ${targetAttr}
    onclick="${clickHandler}"
    style="
      display:flex;align-items:center;text-decoration:none;
      width:100%;box-sizing:border-box;padding:14px 18px;margin:0 0 12px;
      background:${cardBg};border:${border};border-radius:${radius};
      color:${theme.textColor};transition:${transition};
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    "
    onmouseover="this.style.transform='${hoverTransform}';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.35)'"
    onmouseout="this.style.transform='none';this.style.boxShadow='none'"
  >
    <span style="display:flex;flex-direction:column;flex:1;min-width:0">
      <span style="display:flex;align-items:center;font-weight:600;font-size:15px">${highlightDot}${title}</span>
      ${descHtml}
    </span>
    <span aria-hidden="true" style="margin-left:10px;opacity:.5;font-size:18px">&#8599;</span>
  </a>`;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
