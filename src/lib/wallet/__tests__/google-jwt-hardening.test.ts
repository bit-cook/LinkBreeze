import { describe, it, expect } from "vitest";
import * as crypto from "node:crypto";
import { buildGoogleSaveUrl, type GooglePassInput } from "../google-pass";

/**
 * JWT-focused adversarial coverage (google-pass.test.ts covers happy path +
 * RS256 verify). These target the classic JWT attack surface: alg confusion,
 * none-algorithm, cross-signing, and payload tampering.
 */

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const { privateKey: attackerPrivateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const creds = {
  issuerId: "1234567890123456789",
  clientEmail: "svc@test.iam.gserviceaccount.com",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

const input: GooglePassInput = {
  slug: "jane",
  title: "Jane Doe",
  origin: "https://links.example.com",
  links: [],
  savedOn: "2026-09-18",
};

const b64u = (s: string | Buffer) =>
  Buffer.from(s).toString("base64url");

describe("Google JWT hardening", () => {
  it("alg header is exactly RS256 (never none/HS256 confusion)", () => {
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const header = JSON.parse(Buffer.from(jwt.split(".")[0], "base64url").toString());
    expect(header.alg).toBe("RS256");
    expect(header.typ).toBe("JWT");
  });

  it("signature fails to verify under the alg-none attack", () => {
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const [h, p, s] = jwt.split(".");
    // Attacker rewrites the header to alg:none, keeps payload + signature.
    // The stolen signature was computed over the ORIGINAL header — it must
    // NOT verify over the forged signing input (header is signed, so
    // swapping it breaks the signature).
    const forgedHeader = b64u(JSON.stringify({ alg: "none", typ: "JWT" }));
    const stolenSigOk = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${p}`),
      publicKey,
      Buffer.from(s, "base64url"),
    );
    const forgedOk = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${forgedHeader}.${p}`),
      publicKey,
      Buffer.from(s, "base64url"),
    );
    expect(stolenSigOk).toBe(true); // sanity: signature valid on the real input
    expect(forgedOk).toBe(false);   // header swap breaks it
  });

  it("payload tampering invalidates the signature", () => {
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const [h, p, s] = jwt.split(".");
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    payload.payload.genericObjects[0].barcode.value = "https://evil.example/steal";
    const tampered = b64u(JSON.stringify(payload));
    const ok = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${tampered}`),
      publicKey,
      Buffer.from(s, "base64url"),
    );
    expect(ok).toBe(false);
  });

  it("attacker-key signature is rejected (cross-signing)", () => {
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const [h, p, s] = jwt.split(".");
    const ok = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${p}`),
      crypto.createPublicKey(attackerPrivateKey),
      Buffer.from(s, "base64url"),
    );
    expect(ok).toBe(false);
  });

  it("issuer ID is embedded in class/object ids (namespace isolation)", () => {
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    const obj = payload.payload.genericObjects[0];
    expect(obj.id.startsWith("1234567890123456789.")).toBe(true);
    expect(obj.classId.startsWith("1234567890123456789.")).toBe(true);
  });

  it("iss claim equals the service account (never the issuer id)", () => {
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    expect(payload.iss).toBe("svc@test.iam.gserviceaccount.com");
    expect(payload.aud).toBe("google");
  });

  it("iat is recent (Google rejects tokens older than ~1h on save)", () => {
    const before = Math.floor(Date.now() / 1000);
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const after = Math.floor(Date.now() / 1000);
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.iat).toBeLessThanOrEqual(after);
  });

  it("slug with hostile characters is contained in object ids", () => {
    // Slugs are server-validated, but a hostile DB row must not be able to
    // smuggle a second object id via the slug.
    const jwt = buildGoogleSaveUrl(creds, {
      ...input,
      slug: "x-barcode-evil",
    })!.split("/save/")[1];
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    const ids = JSON.stringify(payload.payload);
    // All id-bearing fields (class id, object id, classId) — every one must
    // be issuer-prefixed, and the hostile slug must not smuggle any other
    // barcode/object outside that namespace.
    const idMatches = ids.match(/"(?:id|classId)":"[^"]+"/g) ?? [];
    expect(idMatches.length).toBe(3); // 1 class id + object id + classId
    for (const m of idMatches) {
      expect(m).toContain('"1234567890123456789.');
    }
    // exactly one barcode, still pointing at the real page URL
    const barcodes = JSON.stringify(payload.payload).match(/"barcode":/g) ?? [];
    expect(barcodes.length).toBe(1);
    const obj = payload.payload.genericObjects[0];
    expect(obj.barcode.value).toBe("https://links.example.com/x-barcode-evil");
  });
});
