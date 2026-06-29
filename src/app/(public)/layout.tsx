import * as React from "react";

/**
 * Minimal layout for public link pages. The root layout already provides
 * <html>/<body>, so this is intentionally a thin wrapper that resets margins
 * and allows full-bleed theming.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen w-full">{children}</div>;
}
