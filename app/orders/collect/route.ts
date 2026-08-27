import { NextResponse } from "next/server";
import { collectOrders } from "@/lib/supabase/collector";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const channelCode = body.channelCode || "ALL";

    const result = await collectOrders(channelCode);

    return NextResponse.json({
      ...result,
      success: true,
    });
  } catch (error) {
    console.error("OMS ORDER COLLECTION ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "주문수집 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}