import type { PageRow } from "@/server/queries";

/**
 * vCard 4.0 generation for a public page.
 *
 * Pure module — no DB import, no filesystem access. The route handler
 * resolves the PageRow and passes it in, so tests can call this with
 * literal fixtures.
 *
 * vCard 4.0 spec: RFC 6350. Lines are CRLF-terminated per spec; long
 * lines are folded at 75 octets. Most contact apps tolerate LF, but
 * spec-correct CRLF costs nothing and avoids Outlook quirks.
 */

/** Escape per RFC 6350 §3.4: backslash, comma, semicolon, newline. */
function escapeVcardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line longer than 75 octets per RFC 6350 §3.2
 * (continuation lines start with a single space). Operates on UTF-8
 * code units carefully: split on characters, never cut a multi-byte
 * char — JS strings are UTF-16 so we fold conservatively on characters
 * (worst case a line is under 75*4 octets before folding, fine for
 * every parser we care about).
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

export interface VCardInput {
  /** Page title — maps to FN (formatted name). Required by spec. */
  title: string;
  /** Page slug — maps to NICKNAME and builds the URL. */
  slug: string;
  /** Absolute origin, e.g. https://links.example.com (no trailing slash). */
  origin: string;
  /** Optional bio — maps to NOTE. */
  bio?: string | null;
  /** Optional org name — maps to ORG. */
  organization?: string | null;
}

export function buildVCard(input: VCardInput): string {
  const fn = input.title.trim() || input.slug;
  const url = `${input.origin}/${input.slug}`;

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    // N is required by RFC 6350 cardinality; a single displayName can't be
    // split reliably into family/given, so a single-component name is the
    // honest encoding.
    `N:${escapeVcardValue(fn)}`,
    `FN:${escapeVcardValue(fn)}`,
    `NICKNAME:${escapeVcardValue(input.slug)}`,
    `URL:${url}`,
    `ORG:${escapeVcardValue(input.organization || "LinkBreeze")}`,
  ];

  if (input.bio && input.bio.trim()) {
    lines.push(`NOTE:${escapeVcardValue(input.bio.trim())}`);
  }

  lines.push("END:VCARD");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Filename-safe vCard attachment name for a page. */
export function vcardFilename(slug: string): string {
  const safe = slug.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 60) || "contact";
  return `${safe}.vcf`;
}

/** Type guard so route handlers only pass real page rows into the builder. */
export function pageToVCardInput(page: PageRow, origin: string): VCardInput {
  return {
    title: page.title || "",
    slug: page.slug,
    origin,
    bio: page.bio,
    organization: null,
  };
}
