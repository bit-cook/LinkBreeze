import "server-only";
import * as QRCode from "qrcode";

/**
 * Generate an inline SVG string for the given URL using the `qrcode` library.
 */
export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f0f1a",
      light: "#ffffff",
    },
  });
}

/**
 * Generate a PNG buffer for the given URL at the requested pixel size.
 */
export async function generateQrPng(
  url: string,
  size = 256,
): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    margin: 1,
    errorCorrectionLevel: "M",
    width: size,
    color: {
      dark: "#0f0f1a",
      light: "#ffffff",
    },
  });
  return buffer;
}
