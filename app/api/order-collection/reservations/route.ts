import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();

    const {
      customerId,
      deliveryTargetId,
      deliveryLocationId,
      salesChannelId,
      storeId,
      reservationDate,
      reservationSlotId,
      memo,
    } = body;

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: "화주사를 선택해주세요.",
        },
        { status: 400 }
      );
    }

    if (!deliveryTargetId) {
      return NextResponse.json(
        {
          success: false,
          message: "납품처를 선택해주세요.",
        },
        { status: 400 }
      );
    }

    if (!deliveryLocationId) {
      return NextResponse.json(
        {
          success: false,
          message: "납품센터를 선택해주세요.",
        },
        { status: 400 }
      );
    }

    if (!reservationDate) {
      return NextResponse.json(
        {
          success: false,
          message: "납품일자를 선택해주세요.",
        },
        { status: 400 }
      );
    }

    if (!reservationSlotId) {
      return NextResponse.json(
        {
          success: false,
          message: "예약시간을 선택해주세요.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "create_delivery_reservation",
      {
        p_customer_id: customerId,
        p_delivery_target_id: deliveryTargetId,
        p_delivery_location_id: deliveryLocationId,
        p_sales_channel_id: salesChannelId || null,
        p_store_id: storeId || null,
        p_reservation_date: reservationDate,
        p_reservation_slot_id: reservationSlotId,
        p_memo: memo || null,
      }
    );

    if (error) {
      console.error("RESERVATION INSERT ERROR", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      reservationId: data,
      message: "납품예약이 등록되었습니다.",
    });

  } catch (error) {
    console.error("RESERVATION API ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "납품예약 등록에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}