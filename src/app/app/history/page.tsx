import { redirect } from "next/navigation";

type HistoryPageProps = {
  searchParams: Promise<{ household?: string; filter?: string }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const search = new URLSearchParams();
  if (params.household) search.set("household", params.household);
  if (params.filter) search.set("filter", params.filter);
  const qs = search.toString();
  redirect(`/app/settings/activity${qs ? `?${qs}` : ""}`);
}
