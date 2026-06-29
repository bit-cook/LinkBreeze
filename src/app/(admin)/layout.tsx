import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Link as LinkIcon,
  User,
  Palette,
  Settings,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/aurora/AuroraBackground";
import { MobileTabBar } from "@/components/admin/MobileTabBar";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/links", label: "Links", icon: LinkIcon },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/theme", label: "Theme", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Route protection is handled by middleware. Here we only decide whether to
  // render the admin chrome (authed) or a bare shell (login / setup).
  if (!session) {
    return (
      <div className="min-h-screen w-full dark">
        <AuroraBackground />
        {children}
      </div>
    );
  }

  return (
    <div className="dark relative min-h-screen bg-background text-foreground">
      <AuroraBackground />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4 md:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <Image src="/logo-mark.svg" alt="LinkBreeze" width={24} height={24} />
            <span className="font-heading text-lg font-semibold">
              LinkBreeze
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-all hover:translate-x-0.5 hover:bg-violet/15 hover:text-lavender"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
            <span className="px-2.5 text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{session.username}</span>
            </span>
            <form action={logout}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="w-full justify-start gap-2"
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.svg" alt="LinkBreeze" width={24} height={24} />
              <span className="font-heading font-semibold">LinkBreeze</span>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="icon-sm" type="submit">
                <LogOut className="size-4" />
              </Button>
            </form>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
          <MobileTabBar />
        </div>
      </div>
    </div>
  );
}
