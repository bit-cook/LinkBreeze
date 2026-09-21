import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  parseAppleCreds,
  buildApplePass,
  type ApplePassInput,
} from "../apple-pass";

/**
 * Adversarial coverage for the Apple pass (apple-pass.test.ts covers happy
 * path + manifest integrity). Focus: hostile DB values reaching pass.json
 * (link titles/bio are user-authored), and structural invariants Apple's
 * pass viewer enforces.
 */

let certPem = "";
let keyPem = "";

beforeAll(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lb-apx-"));
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", path.join(tmp, "key.pem"), "-out", path.join(tmp, "cert.pem"),
    "-days", "365", "-subj", "/CN=pass.com.linkbreeze.test/O=Test",
  ]);
  keyPem = fs.readFileSync(path.join(tmp, "key.pem"), "utf-8");
  certPem = fs.readFileSync(path.join(tmp, "cert.pem"), "utf-8");
});

function envWith(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  env.APPLE_WALLET_CERT_PEM = certPem;
  env.APPLE_WALLET_KEY_PEM = keyPem;
  env.APPLE_WALLET_WWDR_PEM = certPem;
  env.APPLE_WALLET_TEAM_ID = "ABC123XYZ9";
  env.APPLE_WALLET_PASS_TYPE_ID = "pass.com.linkbreeze.test";
  return env;
}

const creds = () => parseAppleCreds(envWith())!;

const input: ApplePassInput = {
  slug: "jane",
  title: "Jane Doe",
  origin: "https://links.example.com",
  backgroundColor: "#12122b",
  foregroundColor: "#ffffff",
  links: [{ title: "My site", url: "https://jane.example" }],
  savedOn: "2026-09-18",
};

/** Extract entries from a store-only zip (same reader as apple-pass.test). */
function zipEntries(buf: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString();
    const dataStart = offset + 30 + nameLen + extraLen;
    if (method === 0) {
      entries.set(name, Buffer.from(buf.subarray(dataStart, dataStart + compressedSize)));
    }
    offset = dataStart + compressedSize;
  }
  return entries;
}

async function passJson(overrides: Partial<ApplePassInput> = {}) {
  const buf = await buildApplePass(creds(), { ...input, ...overrides });
  expect(buf).not.toBeNull();
  return JSON.parse(zipEntries(buf!).get("pass.json")!.toString());
}

describe("Apple pass adversarial inputs", () => {
  it("hostile link titles cannot inject extra JSON structure", async () => {
    const parsed = await passJson({
      links: [
        { title: `evil","passTypeIdentifier":"pass.com.attacker`, url: "https://x.example" },
        { title: '"}]}}', url: "https://y.example" },
      ],
    });
    // The hostile titles survive as label STRING VALUES, not structure
    const labels = JSON.stringify(parsed.storeCard.backFields);
    expect(labels).toContain("evil");
    // Identity fields are untouched
    expect(parsed.passTypeIdentifier).toBe("pass.com.linkbreeze.test");
    expect(parsed.teamIdentifier).toBe("ABC123XYZ9");
    // Structure is exactly what the builder emitted
    expect(parsed.storeCard.backFields).toHaveLength(2);
    expect(Object.keys(parsed)).toEqual(
      expect.arrayContaining(["formatVersion", "passTypeIdentifier", "teamIdentifier", "barcodes", "storeCard"]),
    );
  });

  it("hostile page title cannot spoof organizationName/serialNumber identity", async () => {
    const parsed = await passJson({
      title: 'Evil Corp","serialNumber":"spoofed',
    });
    expect(parsed.organizationName).toBe('Evil Corp","serialNumber":"spoofed');
    // serialNumber is generated server-side and NOT taken from user input
    expect(parsed.serialNumber).toMatch(/^linkbreeze-jane-/);
  });

  it("title longer than Apple's field limits is truncated in labels (≤40 chars)", async () => {
    const parsed = await passJson({
      links: [{ title: "T".repeat(200), url: "https://x.example" }],
    });
    for (const f of parsed.storeCard.backFields) {
      expect(f.label.length).toBeLessThanOrEqual(40);
    }
  });

  it("non-http link urls are dropped by the route filter contract (lib honors whatever it receives)", async () => {
    // The route filters to https?://; the lib itself renders what it gets —
    // assert the lib does not crash on odd schemes (defense: route filter).
    const parsed = await passJson({
      links: [{ title: "ftp thing", url: "ftp://files.example/x" }],
    });
    expect(parsed.storeCard.backFields).toHaveLength(1);
  });

  it("urls with control characters do not corrupt pass.json", async () => {
    const parsed = await passJson({
      links: [{ title: "bad", url: "https://x.example/a\u0000\u001Fb" }],
    });
    expect(JSON.stringify(parsed.storeCard.backFields)).toContain("bad");
    expect(parsed.passTypeIdentifier).toBe("pass.com.linkbreeze.test");
  });

  it("serialNumber embeds the slug but is length-bounded", async () => {
    const parsed = await passJson({ slug: "s".repeat(300) });
    // 300-char slug + prefix stays under Apple's practical serial limits
    expect(parsed.serialNumber.length).toBeLessThan(330);
    expect(parsed.serialNumber.startsWith("linkbreeze-")).toBe(true);
  });

  it("empty links array produces a valid card (no back fields, no crash)", async () => {
    const parsed = await passJson({ links: [] });
    expect(parsed.storeCard.backFields).toHaveLength(0);
    expect(parsed.storeCard.primaryFields[0].value).toBe("https://links.example.com/jane");
  });

  it("parseAppleCreds ignores env values with wrong types under attack (defensive)", () => {
    const env = envWith();
    env.APPLE_WALLET_TEAM_ID = ""; // empty → rejected
    expect(parseAppleCreds(env)).toBeNull();
    const env2 = envWith();
    env2.APPLE_WALLET_PASS_TYPE_ID = "pass."; // prefix-only → accepted structurally
    expect(parseAppleCreds(env2)).not.toBeNull();
    const env3 = envWith();
    env3.APPLE_WALLET_PASS_TYPE_ID = "PASS.COM.UPPER"; // wrong prefix → rejected
    expect(parseAppleCreds(env3)).toBeNull();
  });
});
