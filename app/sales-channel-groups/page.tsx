import { createClient } from "@/lib/supabase/server";
import SalesChannelGroupManager from "./SalesChannelGroupManager";

export default async function SalesChannelGroupsPage() {
  const supabase = await createClient();

  const { data: groups, error } = await supabase
    .from("sales_channel_groups")
    .select("*")
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  return (
    <SalesChannelGroupManager
      initialGroups={groups ?? []}
      initialError={error?.message ?? null}
    />
  );
}