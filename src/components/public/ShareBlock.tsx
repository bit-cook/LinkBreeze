import type { ThemeInput } from "@/lib/theme-tokens";

interface ShareBlockProps {
  slug: string;
  theme?: ThemeInput;
  /** Wallet buttons render only when the operator configured creds (env-driven). */
  appleWalletEnabled?: boolean;
  googleWalletEnabled?: boolean;
}

/**
 * Public page share/export block — pure Server Component, zero client JS
 * (same contract as SocialIcons). Renders a quiet row of utility links:
 * "Save contact" (vCard) and, when configured, Add-to-Wallet. Deliberately
 * subtle — footer-grade metadata, not a call to action.
 *
 * Wallet button visibility is server-side: the component receives the flags
 * as props so the public page decides once, at render, from env state.
 */
export function ShareBlock({
  slug,
  appleWalletEnabled = false,
  googleWalletEnabled = false,
}: ShareBlockProps) {
  return (
    <div
      className="lb-share-row flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs opacity-60 transition-opacity hover:opacity-100"
      data-lb-share
    >
      <a
        href={`/api/vcard/${slug}`}
        download
        className="lb-share-link underline-offset-2 hover:underline"
        data-lb-share-vcard
      >
        Save contact
      </a>
      {googleWalletEnabled ? (
        <a
          href={`/api/wallet/google/${slug}`}
          className="lb-share-link underline-offset-2 hover:underline"
          data-lb-share-gwallet
        >
          Add to Google Wallet
        </a>
      ) : null}
      {appleWalletEnabled ? (
        <a
          href={`/api/wallet/apple/${slug}`}
          className="lb-share-link underline-offset-2 hover:underline"
          data-lb-share-awallet
        >
          Add to Apple Wallet
        </a>
      ) : null}
    </div>
  );
}
