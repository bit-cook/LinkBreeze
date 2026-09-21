import * as crypto from "node:crypto";
import QRCode from "qrcode";

/**
 * Pass icon renderer — pure module (node:crypto + qrcode only).
 *
 * Apple requires icon.png (1x/2x/3x) in every pass or the pass may open on
 * a Mac but silently fail on an iPhone. We render the page URL as a QR and
 * composite it onto a solid background so the icon doubles as a scannable
 * fallback. Uses the same `qrcode` dependency the app already ships for
 * /api/qr (checked lockfile: qrcode ^1.5.4).
 */

/** Solid dark square with the QR centered — pass.json icon requirements. */
export function renderPassIcon(payload: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#12122bff", light: "#ffffffff" },
  });
}

/** Exposed for tests: confirm deterministic rendering for the same input. */
export function iconHash(payload: string, size: number): Promise<string> {
  return renderPassIcon(payload, size).then(
    (buf) => crypto.createHash("sha256").update(buf).digest("hex"),
  );
}
