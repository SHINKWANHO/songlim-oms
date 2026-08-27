import { createClient } from "@/lib/supabase/server";

type CollectResult = {
  success: boolean;
  channelCode: string;
  total: number;
  inserted: number;
  duplicate: number;
  failed: number;
  message: string;
};

export async function collectOrders(
  channelCode: string
): Promise<CollectResult> {
  const supabase = await createClient();

  /*
   * 1차 버전
   *
   * 현재는 실제 판매채널 API가 연결되지 않았기 때문에
   * Supabase 서버 연결 및 주문 데이터 조회를 먼저 확인합니다.
   */

  let query = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      source_order_number,
      customer_id,
      sales_channel_id,
      sales_channel_group_id,
      store_id,
      order_date,
      delivery_date,
      status,
      total_qty,
      total_amount,
      created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  /*
   * 특정 판매채널 수집 요청일 경우
   *
   * sales_channels.channel_code와 연결해서
   * 해당 채널의 주문만 조회합니다.
   */

  if (channelCode !== "ALL") {
    const { data: channel, error: channelError } =
      await supabase
        .from("sales_channels")
        .select("id, channel_code, channel_name")
        .eq("channel_code", channelCode)
        .maybeSingle();

    if (channelError) {
      throw new Error(
        `판매채널 조회 실패: ${channelError.message}`
      );
    }

    if (!channel) {
      return {
        success: false,
        channelCode,
        total: 0,
        inserted: 0,
        duplicate: 0,
        failed: 0,
        message: `판매채널 ${channelCode} 를 찾을 수 없습니다.`,
      };
    }

    query = query.eq(
      "sales_channel_id",
      channel.id
    );
  }

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(
      `주문 조회 실패: ${error.message}`
    );
  }

  const total = orders?.length ?? 0;

  return {
    success: true,
    channelCode,
    total,
    inserted: 0,
    duplicate: 0,
    failed: 0,
    message:
      channelCode === "ALL"
        ? `서버 연결 성공. 현재 주문 ${total.toLocaleString()}건을 확인했습니다.`
        : `${channelCode} 서버 연결 성공. 현재 주문 ${total.toLocaleString()}건을 확인했습니다.`,
  };
}