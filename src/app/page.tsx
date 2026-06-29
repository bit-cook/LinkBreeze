import { redirect } from "next/navigation";
import { getSetting } from "@/server/queries";
import { getUserCount } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const slug = (await getSetting("slug")) || "u";
  const userCount = await getUserCount();

  // First-run: send to setup wizard. Otherwise show the public page.
  if (userCount === 0) {
    redirect("/setup");
  }
  redirect(`/${slug}`);
}
