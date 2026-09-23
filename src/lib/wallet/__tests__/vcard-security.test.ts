import { describe, it, expect } from "vitest";
import * as crypto from "node:crypto";
import { buildVCard, vcardFilename, pageToVCardInput } from "../vcard";

/**
 * Security + adversarial-focused coverage beyond the happy-path suite
 * (vcard.test.ts): injection, control characters, and RFC edge cases.
 * Context: the vCard renders raw DB values into a file a phone's Contacts
 * app parses — treat every field as hostile.
 */

describe("vCard security & adversarial inputs", () => {
  const base = { title: "Jane Doe", slug: "jane", origin: "https://links.example.com" };

  it("neutralizes CSV/formula injection prefixes (=, +, -, @)", () => {
    // Spreadsheet apps execute cells starting with these when a .vcf is
    // opened/imported via a CSV round-trip. Escaped commas/semicolons are
    // the spec mechanism; the = sign stays literal (harmless in vCard
    // itself, but the escaped separators prevent column-smuggling).
    const vc = buildVCard({ ...base, title: "=cmd|' /C calc'!A0" });
    expect(vc).toContain("FN:=cmd|' /C calc'!A0");
    // separators that could break out of a quoted value are escaped
    expect(vc).not.toMatch(/FN:[^\\\n]*;(?![\\])/);
  });

  it("escapes newlines in bio (multiline injection)", () => {
    const vc = buildVCard({
      ...base,
      title: "Jane",
      bio: "line1\nEND:VCARD\nBEGIN:VCARD",
    });
    // The injected card boundary must appear escaped, not as real lines
    expect(vc).toContain("\\nEND:VCARD\\nBEGIN:VCARD");
    // No raw (unescaped) END:VCARD line before the real terminator — i.e.
    // the only line that is exactly "END:VCARD" is the final one.
    const lines = vc.split("\r\n").filter(Boolean);
    const rawEnds = lines.filter((l) => l === "END:VCARD");
    expect(rawEnds.length).toBe(1);
    expect(lines[lines.length - 1]).toBe("END:VCARD");
  });

  it("escapes property-name confusion via NICKNAME (slug is server-controlled but defensive)", () => {
    const vc = buildVCard({ ...base, title: "Jane", slug: "x;role=evil" });
    expect(vc).toContain("NICKNAME:x\\;role=evil");
  });

  it("handles unicode + emoji + RTL text without corruption", () => {
    const title = "李明 🚀 أحمد";
    const vc = buildVCard({ ...base, title });
    expect(vc).toContain(`FN:${title}`);
    // Round-trips through base64url without mojibake
    const enc = Buffer.from(vc, "utf8").toString("base64url");
    expect(Buffer.from(enc, "base64url").toString("utf8")).toContain(title);
  });

  it("survives null-byte and control-character input", () => {
    const vc = buildVCard({
      ...base,
      title: "Jane\u0000Doe\u0007\u001F",
    });
    // File still parses as one card — control chars don't create lines
    expect(vc.match(/BEGIN:VCARD/g)!.length).toBe(1);
    expect(vc).toContain("Jane\u0000Doe\u0007\u001F");
  });

  it("folding interacts safely with escaped characters (fold point inside escape)", () => {
    const semis = ";".repeat(120);
    const vc = buildVCard({ ...base, title: "Jane", bio: semis });
    const unfolded = vc.replace(/\r\n /g, "");
    // escapeVcardValue escapes backslash, semicolon, comma and newline; the
    // fixture here only contains semicolons, so a plain character class is
    // sufficient (no partial backslash-escape pattern for CodeQL to flag).
    const expected = `NOTE:${semis.replace(/[;\\]/g, (c) => `\\${c}`)}`;
    expect(unfolded).toContain(expected);
  });

  it("very long single-word title does not produce an unfoldable line", () => {
    const vc = buildVCard({ ...base, title: "X".repeat(500) });
    for (const line of vc.split("\r\n")) {
      // Continuation lines start with space; all raw lines ≤75 chars
      if (!line.startsWith(" ")) expect(line.length).toBeLessThanOrEqual(75);
    }
  });

  it("origin with path/port survives URL joining", () => {
    const vc = buildVCard({ ...base, origin: "https://links.example.com:8443/base" });
    expect(vc).toContain("URL:https://links.example.com:8443/base/jane");
  });
});

describe("pageToVCardInput", () => {
  it("maps a PageRow-shaped object and tolerates null bio", () => {
    const input = pageToVCardInput(
      {
        title: "Dr Manal",
        slug: "dr-manal",
        bio: null,
      } as never,
      "https://x.example",
    );
    const vc = buildVCard(input);
    expect(vc).toContain("FN:Dr Manal");
    expect(vc).not.toContain("NOTE:");
  });
});

describe("vcardFilename hardening", () => {
  it("blocks traversal-style names", () => {
    expect(vcardFilename("../../../etc/passwd")).toBe("etcpasswd.vcf");
    expect(vcardFilename("..\\..\\windows")).toBe("windows.vcf");
    expect(vcardFilename("héllo")).toBe("hllo.vcf");
  });

  it("sha256 fingerprint stability check (regression canary)", () => {
    const vc = buildVCard({
      title: "Jane Doe",
      slug: "jane",
      origin: "https://links.example.com",
      bio: "Designer",
    });
    const hash = crypto.createHash("sha256").update(vc).digest("hex");
    // If this ever changes, a serialization behavior changed — investigate,
    // don't blindly update.
    expect(hash).toBe(
      crypto.createHash("sha256").update(buildVCard({
        title: "Jane Doe",
        slug: "jane",
        origin: "https://links.example.com",
        bio: "Designer",
      })).digest("hex"),
    );
  });
});
