import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  parseAppleCreds,
  certExpiry,
  toRgbString,
  buildApplePass,
  type ApplePassInput,
} from "../apple-pass";

/**
 * Minimal ZIP reader for store-only archives (do-not-zip, which
 * passkit-generator uses). Local file headers only — no central directory
 * needed for our assertions.
 */
function zipEntries(buf: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break; // local file header
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

/**
 * Self-signed cert generated in-test: exercises the packaging/signing CODE
 * PATHS (manifest, PKCS#7, zip) but the resulting pass is NOT device-valid
 * — real-device validation is a manual runbook step (see operator docs).
 */

let certPem = "";
let keyPem = "";

beforeAll(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lb-apple-"));
  const keyPath = path.join(tmp, "key.pem");
  const certPath = path.join(tmp, "cert.pem");
  const csrPath = path.join(tmp, "req.csr");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", keyPath, "-out", certPath,
    "-days", "365", "-subj", "/CN=pass.com.linkbreeze.test/O=LinkBreeze Test",
  ]);
  keyPem = fs.readFileSync(keyPath, "utf-8");
  certPem = fs.readFileSync(certPath, "utf-8");
  void csrPath;
});

const input: ApplePassInput = {
  slug: "jane",
  title: "Jane Doe",
  origin: "https://links.example.com",
  backgroundColor: "#12122b",
  foregroundColor: "#ffffff",
  links: [{ title: "My site", url: "https://jane.example" }],
  savedOn: "2026-09-18",
};

function envWith(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  env.APPLE_WALLET_CERT_PEM = certPem;
  env.APPLE_WALLET_KEY_PEM = keyPem;
  env.APPLE_WALLET_WWDR_PEM = certPem; // self-signed chain: doubles as WWDR stand-in
  env.APPLE_WALLET_TEAM_ID = "ABC123XYZ9";
  env.APPLE_WALLET_PASS_TYPE_ID = "pass.com.linkbreeze.test";
  for (const [k, v] of Object.entries(overrides)) env[k] = v;
  return env;
}

describe("parseAppleCreds", () => {
  it("accepts a full env set", () => {
    const creds = parseAppleCreds(envWith());
    expect(creds).not.toBeNull();
    expect(creds!.teamId).toBe("ABC123XYZ9");
    expect(creds!.passTypeId).toBe("pass.com.linkbreeze.test");
  });

  it("rejects when any required value is missing", () => {
    const base = envWith();
    for (const key of [
      "APPLE_WALLET_CERT_PEM",
      "APPLE_WALLET_KEY_PEM",
      "APPLE_WALLET_WWDR_PEM",
      "APPLE_WALLET_TEAM_ID",
      "APPLE_WALLET_PASS_TYPE_ID",
    ]) {
      const env = { ...base, [key]: undefined };
      expect(parseAppleCreds(env)).toBeNull();
    }
  });

  it("rejects pass type ids without the pass. prefix", () => {
    expect(
      parseAppleCreds(envWith({ APPLE_WALLET_PASS_TYPE_ID: "com.linkbreeze.test" })),
    ).toBeNull();
  });

  it("treats passphrase as optional", () => {
    const creds = parseAppleCreds(envWith({ APPLE_WALLET_KEY_PASSPHRASE: "s3cret" }));
    expect(creds!.signerKeyPassphrase).toBe("s3cret");
    expect(parseAppleCreds(envWith())!.signerKeyPassphrase).toBeUndefined();
  });
});

describe("certExpiry", () => {
  it("parses notAfter from a PEM cert", () => {
    const expiry = certExpiry(certPem);
    expect(expiry).toBeInstanceOf(Date);
    expect(expiry!.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns null on garbage input", () => {
    expect(certExpiry("not a cert")).toBeNull();
  });
});

describe("toRgbString", () => {
  it("converts #rrggbb to Apple rgb() notation", () => {
    expect(toRgbString("#12122b", "rgb(0, 0, 0)")).toBe("rgb(18, 18, 43)");
  });
  it("accepts bare hex", () => {
    expect(toRgbString("ff00aa", "x")).toBe("rgb(255, 0, 170)");
  });
  it("falls back on invalid input", () => {
    expect(toRgbString("nope", "rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
  });
});

describe("buildApplePass", () => {
  it("produces a signed zip (PKCS#7 + manifest) and carries correct pass.json", async () => {
    const creds = parseAppleCreds(envWith())!;
    const buf = await buildApplePass(creds, input);
    expect(buf).not.toBeNull();

    const entries = zipEntries(buf!);
    expect([...entries.keys()]).toEqual(
      expect.arrayContaining(["pass.json", "manifest.json", "signature", "icon.png"]),
    );

    const parsed = JSON.parse(entries.get("pass.json")!.toString());
    expect(parsed.passTypeIdentifier).toBe("pass.com.linkbreeze.test");
    expect(parsed.teamIdentifier).toBe("ABC123XYZ9");
    expect(parsed.backgroundColor).toBe("rgb(18, 18, 43)");
    // passkit-generator emits `barcodes` (plural array)
    expect(parsed.barcodes[0].format).toBe("PKBarcodeFormatQR");
    expect(parsed.barcodes[0].message).toBe("https://links.example.com/jane");
    // storeCard style with front fields + back links snapshot
    expect(parsed.storeCard.primaryFields[0].value).toBe(
      "https://links.example.com/jane",
    );
    const backLabels = parsed.storeCard.backFields.map(
      (f: { label: string }) => f.label,
    );
    expect(backLabels).toContain("My site");

    // signature exists and is non-trivial (PKCS#7 DER)
    expect(entries.get("signature")!.length).toBeGreaterThan(100);
  });

  it("manifest hashes match the actual file contents (integrity)", async () => {
    const creds = parseAppleCreds(envWith())!;
    const buf = await buildApplePass(creds, input);
    const entries = zipEntries(buf!);
    const manifest = JSON.parse(entries.get("manifest.json")!.toString()) as Record<string, string>;
    for (const [file, hash] of Object.entries(manifest)) {
      const actual = crypto.createHash("sha1").update(entries.get(file)!).digest("hex");
      expect(actual).toBe(hash);
    }
  });

  it("returns null (not throw) when signing fails on garbage certs", async () => {
    const creds = {
      signerCert: Buffer.from("garbage"),
      signerKey: Buffer.from("garbage"),
      wwdr: Buffer.from("garbage"),
      teamId: "ABC123XYZ9",
      passTypeId: "pass.com.linkbreeze.test",
    };
    const buf = await buildApplePass(creds, input);
    expect(buf).toBeNull();
  });

  it("icon content is a real PNG (magic bytes)", async () => {
    const creds = parseAppleCreds(envWith())!;
    const buf = await buildApplePass(creds, input);
    const icon = zipEntries(buf!).get("icon.png")!;
    expect(Buffer.from(icon.subarray(0, 4))).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
  });

  it("serial numbers are unique per build", async () => {
    const creds = parseAppleCreds(envWith())!;
    const serials = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const buf = await buildApplePass(creds, input);
      const passJson = JSON.parse(zipEntries(buf!).get("pass.json")!.toString());
      serials.add(passJson.serialNumber);
    }
    expect(serials.size).toBe(3);
  });

  it("hashes are consistent for the same QR icon input", async () => {
    const { iconHash } = await import("../qr-icon");
    const h1 = await iconHash("https://links.example.com/jane", 87);
    const h2 = await iconHash("https://links.example.com/jane", 87);
    expect(h1).toBe(h2);
  });
});
