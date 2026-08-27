import { createClient } from "@/lib/supabase/server";
import ProductManager from "./ProductManager";
import type { ComponentType } from "react";

const ProductManagerComponent = ProductManager as unknown as ComponentType<{
  initialProducts: NonNullable<Awaited<ReturnType<typeof createClient>>> extends never
    ? never
    : unknown[];
  initialError: string | null;
}>;


export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  return (
    <ProductManagerComponent
      initialProducts={products ?? []}
      initialError={error?.message ?? null}
    />
  );
}