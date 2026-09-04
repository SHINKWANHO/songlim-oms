import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);

    const locationId = searchParams.get("locationId");
    const date = searchParams.get("date");

    if (!locationId || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "납품센터와 날짜가 필요합니다.",
        },
        { status: 400 }
      );
    }

    const reservationDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(reservationDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "올바른 날짜가 아닙니다.",
        },
        { status: 400 }
      );
    }

    const dayOfWeek = reservationDate.getDay();

    const { data: slots, error: slotsError } = await supabase
      .from("reservation_time_slots")
      .select(`
        id,
        start_time,
        end_time,
        capacity
      `)
      .eq("delivery_location_id", locationId)
      .eq("day_of_week", dayOfWeek)
      .eq("active", true)
      .order("start_time");

    if (slotsError) {
      throw slotsError;
    }

    const { data: reservations, error: reservationsError } =
      await supabase
        .from("delivery_reservations")
        .select(`
          reservation_slot_id
        `)
        .eq("delivery_location_id", locationId)
        .eq("reservation_date", date)
        .in("status", ["예약", "확정"]);

    if (reservationsError) {
      throw reservationsError;
    }

    const reservationCounts: Record<string, number> = {};

    for (const reservation of reservations ?? []) {
      reservationCounts[reservation.reservation_slot_id] =
        (reservationCounts[reservation.reservation_slot_id] ?? 0) + 1;
    }

    const result = (slots ?? []).map((slot) => {
      const reserved =
        reservationCounts[slot.id] ?? 0;

      return {
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        capacity: slot.capacity,
        reserved,
        available: Math.max(slot.capacity - reserved, 0),
        isFull: reserved >= slot.capacity,
      };
    });

    return NextResponse.json({
      success: true,
      slots: result,
    });

  } catch (error) {
    console.error("RESERVATION SLOT ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "예약시간 조회에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}