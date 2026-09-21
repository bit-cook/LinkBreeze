import { describe, it, expect } from "vitest";
import * as crypto from "node:crypto";
import {
  parseGoogleCreds,
  buildGoogleSaveUrl,
  type GooglePassInput,
} from "../google-pass";

// Generate a real RSA keypair in-process so the RS256 signing path is
// exercised end to end without any fixture files.
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const privPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const serviceAccountJson = JSON.stringify({
  client_email: "svc@linkbreeze-test.iam.gserviceaccount.com",
  private_key: privPem.replace(/\n/g, "\\n"),
});

const input: GooglePassInput = {
  slug: "jane",
  title: "Jane Doe",
  origin: "https://links.example.com",
  backgroundColor: "#12122b",
  links: [{ title: "My site", url: "https://jane.example" }],
  savedOn: "2026-09-18",
};

function decodeJwt(jwt: string): { header: unknown; payload: unknown } {
  const [h, p] = jwt.split(".");
  const dec = (s: string) =>
    JSON.parse(Buffer.from(s, "base64url").toString("utf-8"));
  return { header: dec(h), payload: dec(p) };
}


describe("parseGoogleCreds", () => {
  it("accepts valid service-account JSON + numeric issuer id", () => {
    const creds = parseGoogleCreds(serviceAccountJson, "1234567890123456789");
    expect(creds).not.toBeNull();
    expect(creds!.clientEmail).toBe("svc@linkbreeze-test.iam.gserviceaccount.com");
    expect(creds!.privateKey).toContain("-----BEGIN");
  });

  it("rejects missing/malformed issuer ids", () => {
    expect(parseGoogleCreds(serviceAccountJson, undefined)).toBeNull();
    expect(parseGoogleCreds(serviceAccountJson, "not-a-number")).toBeNull();
    expect(parseGoogleCreds(serviceAccountJson, "12")).toBeNull();
  });

  it("rejects missing or broken JSON", () => {
    expect(parseGoogleCreds(undefined, "1234567890123456789")).toBeNull();
    expect(parseGoogleCreds("not json", "1234567890123456789")).toBeNull();
    expect(parseGoogleCreds("{}", "1234567890123456789")).toBeNull();
    expect(
      parseGoogleCreds(JSON.stringify({ client_email: "x@y" }), "1234567890123456789"),
    ).toBeNull();
  });
});

describe("buildGoogleSaveUrl", () => {
  it("returns null when creds are absent (button hides)", () => {
    expect(buildGoogleSaveUrl(null, input)).toBeNull();
  });

  it("builds a save URL with a verifiable RS256 JWT", () => {
    const creds = parseGoogleCreds(serviceAccountJson, "1234567890123456789")!;
    const url = buildGoogleSaveUrl(creds, input);
    expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);

    const jwt = url!.split("/save/")[1];
    const { header, payload } = decodeJwt(jwt);

    expect(header).toEqual({ alg: "RS256", typ: "JWT" });
    const p = payload as Record<string, unknown>;
    expect(p.iss).toBe("svc@linkbreeze-test.iam.gserviceaccount.com");
    expect(p.aud).toBe("google");
    expect(p.typ).toBe("savetowallet");

    const gp = (p.payload ?? {}) as { genericObjects?: Array<Record<string, unknown>> };
    const first = gp.genericObjects![0];
    expect(first.id).toBe("1234567890123456789.linkbreeze_jane_card");
    expect(first.classId).toBe("1234567890123456789.linkbreeze_jane");
    expect((first.cardTitle as { defaultValue?: { value?: string } }).defaultValue?.value).toBe("Jane Doe");
    expect(first.hexBackgroundColor).toBe("#12122b");
    expect(first.barcode).toMatchObject({ value: "https://links.example.com/jane" });
    const texts = first.textModulesData as Array<{ header: string }>;
    expect(texts.at(-1)!.header).toBe("Saved on");
  });

  it("signature verifies against the service-account public key", () => {
    const creds = parseGoogleCreds(serviceAccountJson, "1234567890123456789")!;
    const jwt = buildGoogleSaveUrl(creds, input)!.split("/save/")[1];
    const [h, p, s] = jwt.split(".");
    const verified = crypto.verify(
      "RSA-SHA256",
      Buffer.from(`${h}.${p}`),
      publicKey,
      Buffer.from(s, "base64url"),
    );
    expect(verified).toBe(true);
  });

  it("skips non-https logo urls (Google must be able to fetch them)", () => {
    const creds = parseGoogleCreds(serviceAccountJson, "1234567890123456789")!;
    const jwt = buildGoogleSaveUrl(creds, {
      ...input,
      logoUrl: "http://insecure.example/logo.png",
    })!.split("/save/")[1];
    const { payload } = decodeJwt(jwt);
    const gp = (payload as { payload?: { genericObjects?: Array<Record<string, unknown>> } }).payload;
    expect(gp!.genericObjects![0].logo).toBeUndefined();
  });

  it("normalizes 6-hex colors with or without #", () => {
    const creds = parseGoogleCreds(serviceAccountJson, "1234567890123456789")!;
    const jwt = buildGoogleSaveUrl(creds, {
      ...input,
      backgroundColor: "ff00aa",
    })!.split("/save/")[1];
    const { payload } = decodeJwt(jwt);
    const gp2 = (payload as { payload?: { genericObjects?: Array<Record<string, unknown>> } }).payload;
    expect(gp2!.genericObjects![0].hexBackgroundColor).toBe("#ff00aa");
  });
});
