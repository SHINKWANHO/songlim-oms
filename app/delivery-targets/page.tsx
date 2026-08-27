import { createClient } from "@/lib/supabase/server";
import DeliveryTargetManager from "./DeliveryTargetManager";

export default async function DeliveryTargetsPage() {
  const supabase = await createClient();

  const [
    customersResult,
    groupsResult,
    channelsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, code, name, active")
      .order("name"),

    supabase
      .from("sales_channel_groups")
      .select("id, code, name, active, sort_order")
      .order("sort_order"),

    supabase
      .from("delivery_targets")
      .select(`
        id,
        customer_id,
        group_id,
        code,
        name,
        active,
        created_at,
        updated_at,
        customers (
          id,
          code,
          name
        ),
        sales_channel_groups (
          id,
          code,
          name
        )
      `)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const error =
    customersResult.error?.message ??
    groupsResult.error?.message ??
    channelsResult.error?.message ??
    null;

  const channels = (channelsResult.data ?? []).map((channel) => ({
    ...channel,

    customers: Array.isArray(channel.customers)
      ? channel.customers[0] ?? undefined
      : channel.customers,

    sales_channel_groups: Array.isArray(
      channel.sales_channel_groups
    )
      ? channel.sales_channel_groups[0] ?? undefined
      : channel.sales_channel_groups,
  }));

  return (
    <DeliveryTargetManager
      initialCustomers={
        customersResult.data ?? []
      }
      initialGroups={
        groupsResult.data ?? []
      }
      initialChannels={channels}
      initialError={error}
    />
  );
}