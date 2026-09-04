import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json();

    const {
      customerId,
      salesChannelId,
      deliveryTargetId,
      deliveryLocationId,
      slotId,
      reservationQty,
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

    if (!slotId) {
      return NextResponse.json(
        {
          success: false,
          message: "예약시간을 선택해주세요.",
        },
        { status: 400 }
      );
    }

    if (!reservationQty || reservationQty <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "예약수량을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const { data: slot, error: slotError } = await supabase
      .from("delivery_reservation_slots")
      .select("*")
      .eq("id", slotId)
      .eq("active", true)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        {
          success: false,
          message: "예약 가능한 시간대를 찾을 수 없습니다.",
        },
        { status: 400 }
      );
    }

    const availableQty =
      slot.capacity - slot.reserved_qty;

    if (reservationQty > availableQty) {
      return NextResponse.json(
        {
          success: false,
          message:
            `예약 가능한 수량이 부족합니다. ` +
            `잔여 ${availableQty}${slot.unit === "PALLET" ? "파렛트" : "개"}입니다.`,
        },
        { status: 400 }
      );
    }

    const { data: reservation, error: reservationError } =
      await supabase
        .from("delivery_reservations")
        .insert({
          customer_id: customerId,
          sales_channel_id: salesChannelId || null,
          delivery_target_id: deliveryTargetId,
          delivery_location_id: deliveryLocationId,
          slot_id: slotId,
          reservation_date: slot.reservation_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          reservation_qty: reservationQty,
          unit: slot.unit,
          status: "RESERVED",
          memo: memo || null,
        })
        .select()
        .single();

    if (reservationError) {
      throw reservationError;
    }

    const { error: updateError } = await supabase
      .from("delivery_reservation_slots")
      .update({
        reserved_qty:
          slot.reserved_qty + reservationQty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slotId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: "납품예약이 등록되었습니다.",
      reservation,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "납품예약 등록 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}