import { createClient } from "@/lib/supabase/server";
import CustomerManager from "./CustomerManager";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", {
      ascending: true,
    });

  return (
    <CustomerManager
      initialCustomers={customers ?? []}
      initialError={error?.message ?? null}
    />
  );
}