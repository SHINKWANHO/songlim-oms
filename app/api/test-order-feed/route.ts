import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    orders: [
      {
       orderNumber: "TEST-20260911-002",
sourceOrderNumber: "TEST-20260911-002",
        orderDate: "2026-09-11",
        deliveryDate: "2026-09-12",
        storeCode: "TEST001",
        items: [
          {
            productCode: "P001",
            productName: "테스트 상품 1",
            quantity: 3,
            unitPrice: 10000,
            amount: 30000,
          },
          {
            productCode: "P002",
            productName: "테스트 상품 2",
            quantity: 2,
            unitPrice: 15000,
            amount: 30000,
          },
        ],
      },
    ],
  });
}