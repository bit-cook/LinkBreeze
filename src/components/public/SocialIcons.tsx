import * as React from "react";
import {
  getSocialIconSvg,
  normalizeSocialUrl,
  getPlatformLabel,
  type SocialPlatform,
} from "@/lib/social-icons";
import type { SocialLink } from "@/server/queries";

interface SocialIconsProps {
  socialLinks: SocialLink[];
  textColor: string;
}

/**
 * Pure Server Component — zero client JavaScript.
 * Renders a horizontal row of social platform icon links.
 */
export function SocialIcons({ socialLinks, textColor }: SocialIconsProps) {
  if (!socialLinks || socialLinks.length === 0) return null;

  return (
    <nav
      aria-label="Social links"
      className="flex flex-wrap items-center justify-center gap-3"
    >
      {socialLinks.map((item, i) => {
        const platform = (item.platform as SocialPlatform) || "email";
        const href = normalizeSocialUrl(platform, item.url || "");
        if (!href) return null;
        const svg = getSocialIconSvg(platform);
        const label = getPlatformLabel(platform);

        const anchorHtml = `<a
          href="${href.replace(/"/g, "&quot;")}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${label}"
          style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:9999px;background:rgba(255,255,255,0.06);color:${textColor};border:1px solid rgba(167,139,250,0.16);transition:transform .15s ease,background .15s ease,border-color .15s ease;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)"
          onmouseover="this.style.transform='translateY(-2px)';this.style.background='rgba(167,139,250,0.16)';this.style.borderColor='rgba(167,139,250,0.4)'"
          onmouseout="this.style.transform='none';this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(167,139,250,0.16)'"
        >${svg}</a>`;

        return (
          <span
            key={`${platform}-${i}`}
            dangerouslySetInnerHTML={{ __html: anchorHtml }}
          />
        );
      })}
    </nav>
  );
}
