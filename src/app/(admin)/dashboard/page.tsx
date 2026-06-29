import * as React from "react";
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Link as LinkIcon,
} from "lucide-react";
import { getDashboardStats, getAllLinks } from "@/server/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ViewsChart } from "./views-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, links] = await Promise.all([
    getDashboardStats(),
    getAllLinks(),
  ]);

  const activeCount = links.filter((l) => l.isActive).length;

  const cards = [
    {
      label: "Views (7d)",
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
      hint: "Page views over the last 7 days",
    },
    {
      label: "Clicks (7d)",
      value: stats.totalClicks.toLocaleString(),
      icon: MousePointerClick,
      hint: "Link clicks over the last 7 days",
    },
    {
      label: "Click-through rate",
      value: `${stats.ctr}%`,
      icon: TrendingUp,
      hint: "Clicks ÷ views",
    },
    {
      label: "Active links",
      value: activeCount.toString(),
      icon: LinkIcon,
      hint: `${links.length} total`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Analytics for the last 7 days
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{c.label}</CardDescription>
                <span className="flex size-8 items-center justify-center rounded-lg bg-violet/15 text-lavender">
                  <c.icon className="size-4" />
                </span>
              </div>
              <CardTitle className="text-3xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Views over time</CardTitle>
            <CardDescription>Daily views and clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <ViewsChart data={stats.viewsPerDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top links</CardTitle>
            <CardDescription>Most clicked (7d)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clicks yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {stats.topLinks.map((link, i) => {
                  const max = stats.topLinks[0]?.clicks || 1;
                  const pct = Math.round((link.clicks / max) * 100);
                  return (
                    <li key={link.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 truncate">
                          <Badge variant="secondary" className="font-mono">
                            {i + 1}
                          </Badge>
                          <span className="truncate">{link.title}</span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {link.clicks}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--aurora-grad)] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
