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
          style={{ border: "2px solid rgba(255,255,255,0.15)" }}
          loading="eager"
        />
      ) : (
        <div
          className="mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      {badge ? (
        <span
          className="mb-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium"
          style={{ background: "rgba(255,255,255,0.12)", color: textColor }}
        >
          {badge}
        </span>
      ) : null}

      {displayName ? (
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: textColor }}>
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
