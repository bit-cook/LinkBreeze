import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Link as LinkIcon,
  User,
  Palette,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { logout } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

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
    return <div className="min-h-screen w-full dark">{children}</div>;
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4 md:flex">
          <div className="mb-8 flex items-center gap-2 px-2">
            <Sparkles className="size-5 text-primary" />
            <span className="font-heading text-lg font-semibold">
              LinkBreeze
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              <Sparkles className="size-5 text-primary" />
              <span className="font-heading font-semibold">LinkBreeze</span>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="icon-sm" type="submit">
                <LogOut className="size-4" />
              </Button>
            </form>
          </header>

          {/* Mobile nav */}
          <nav className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
