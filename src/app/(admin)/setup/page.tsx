import * as React from "react";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getUserCount } from "@/server/queries";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const count = await getUserCount();

  // If an admin already exists, setup is no longer available.
  if (count > 0) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="size-6 text-primary" />
          </div>
          <h1 className="font-heading text-xl font-semibold">Create your admin account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up LinkBreeze in seconds. You only need to do this once.
          </p>
        </div>
        <SetupForm defaultUsername={process.env.ADMIN_USERNAME || ""} />
      </div>
    </div>
  );
}
