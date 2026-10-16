import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return <Dashboard initialTab={(await searchParams).tab || "pipeline"} />;
}
