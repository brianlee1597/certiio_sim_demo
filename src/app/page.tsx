import { currentSession } from "@/server/auth";
import { Login } from "@/components/login";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await currentSession("admin");
  if (!session) return <Login />;
  return <Dashboard initialTab={(await searchParams).tab || "pipeline"} />;
}
