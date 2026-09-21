import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  parseGoogleCreds,
} from "@/lib/wallet/google-pass";
import {
  parseAppleCreds,
  certExpiry,
} from "@/lib/wallet/apple-pass";

interface WalletStatus {
  key: "google" | "apple";
  configured: boolean;
  detail: string;
  /** ISO date or null — shown as a warning when < 30 days out. */
  certExpiryIso?: string | null;
}

type WalletT = {
  (key: "walletCertValid" | "walletCertExpiring" | "walletCertExpired", values?: Record<string, string | number>): string;
};

function formatExpiry(iso: string, t: WalletT): { text: string; warning: boolean } {
  const expiry = new Date(iso);
  const days = Math.floor((expiry.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: t("walletCertExpired", { days: Math.abs(days) }), warning: true };
  if (days < 30) return { text: t("walletCertExpiring", { days }), warning: true };
  return { text: t("walletCertValid", { date: iso.slice(0, 10) }), warning: false };
}

/**
 * Server component — credential STATUS ONLY (never renders secret values).
 * Wallet creds are env-driven; this card tells the operator what's live
 * and warns before a silently-expiring Apple signing cert kills pass
 * generation (the #1 support trap: "nothing happens").
 */
export async function WalletStatusCard() {
  const t = await getTranslations("settings.integration");

  const googleConfigured = !!parseGoogleCreds(
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON,
    process.env.GOOGLE_WALLET_ISSUER_ID,
  );

  const appleCreds = parseAppleCreds(process.env);
  const appleCertExpiry = appleCreds ? certExpiry(appleCreds.signerCert.toString()) : null;

  const statuses: WalletStatus[] = [
    {
      key: "google",
      configured: googleConfigured,
      detail: googleConfigured
        ? t("walletGoogleOn")
        : t("walletGoogleOff"),
    },
    {
      key: "apple",
      configured: !!appleCreds,
      detail: appleCreds
        ? (appleCertExpiry
            ? formatExpiry(appleCertExpiry.toISOString(), t).text
            : t("walletAppleOn"))
        : t("walletAppleOff"),
      certExpiryIso: appleCertExpiry?.toISOString() ?? null,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-5" />
          {t("walletCardTitle")}
        </CardTitle>
        <CardDescription>{t("walletCardDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {statuses.map((s) => {
            const expiry =
              s.certExpiryIso && s.configured
                ? formatExpiry(s.certExpiryIso, t)
                : null;
            return (
              <li key={s.key} className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium">
                    {s.key === "google" ? t("walletGoogleName") : t("walletAppleName")}
                  </span>{" "}
                  <span className="text-muted-foreground">{s.detail}</span>
                  {expiry?.warning ? (
                    <p role="alert" className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {expiry.text}
                    </p>
                  ) : null}
                </div>
                <span
                  className={
                    s.configured
                      ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }
                >
                  {s.configured ? t("walletStatusOn") : t("walletStatusOff")}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
