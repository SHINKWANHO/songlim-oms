import { createClient } from "@/lib/supabase/server";
import CustomerProductManager from "./CustomerProductManager";

export default async function CustomerProductsPage() {
  const supabase = await createClient();

  const customersResult = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  const productsResult = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  const mappingsResult = await supabase
    .from("customer_products")
    .select(`
      *,
      customers (
        id,
        code,
        name,
        channel,
        active
      ),
      products (
        id,
        product_code,
        name,
        specification,
        unit,
        active
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  console.log("CUSTOMERS:", customersResult.data);
  console.log("CUSTOMERS ERROR:", customersResult.error);

  console.log("PRODUCTS:", productsResult.data);
  console.log("PRODUCTS ERROR:", productsResult.error);

  console.log("MAPPINGS:", mappingsResult.data);
  console.log("MAPPINGS ERROR:", mappingsResult.error);

  return (
    <CustomerProductManager
      initialCustomers={
        customersResult.data ?? []
      }
      initialProducts={
        productsResult.data ?? []
      }
      initialMappings={
        mappingsResult.data ?? []
      }
      initialError={
        customersResult.error?.message ??
        productsResult.error?.message ??
        mappingsResult.error?.message ??
        null
      }
    />
  );
}