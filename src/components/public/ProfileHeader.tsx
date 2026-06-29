import * as React from "react";
import type { ProfileRow } from "@/server/queries";

interface ProfileHeaderProps {
  profile: ProfileRow;
  textColor: string;
}

/**
 * Pure Server Component — no client JavaScript.
 * Renders avatar, display name, bio, and optional badge.
 */
export function ProfileHeader({ profile, textColor }: ProfileHeaderProps) {
  const displayName = profile.displayName || "";
  const badge = profile.badgeText?.trim();

  return (
    <header
      style={{ color: textColor }}
      className="flex flex-col items-center text-center"
    >
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={displayName}
          width={96}
          height={96}
          className="mb-4 h-24 w-24 rounded-full object-cover"
          style={{ padding: 3, background: "var(--aurora-grad)", boxShadow: "0 0 32px rgba(124,58,237,0.35)" }}
          loading="eager"
        />
      ) : (
        <div
          className="mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold"
          style={{ padding: 3, background: "var(--aurora-grad)", boxShadow: "0 0 32px rgba(124,58,237,0.35)" }}
        >
          <span
            className="flex h-full w-full items-center justify-center rounded-full"
            style={{ background: "rgba(10,8,32,0.9)", color: textColor }}
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {badge ? (
        <span
          className="glass mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium"
          style={{ color: textColor }}
        >
          {badge}
        </span>
      ) : null}

      {displayName ? (
        <h1
          className="aurora-rise text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: textColor, fontFamily: "var(--font-clash), var(--font-sans), sans-serif" }}
        >
          {displayName}
        </h1>
      ) : null}

      {profile.bio ? (
        <p
          className="mt-2 max-w-md text-sm leading-relaxed opacity-80"
          style={{ color: textColor }}
        >
          {profile.bio}
        </p>
      ) : null}
    </header>
  );
}
