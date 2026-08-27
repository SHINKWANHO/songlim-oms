import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type WmsOrderRequest = {
  orderIds: string[];
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = (await request.json()) as WmsOrderRequest;

    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds.filter(
          (id): id is string =>
            typeof id === "string" && id.length > 0
        )
      : [];

    if (orderIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "WMS로 전송할 주문이 없습니다.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       1. 주문 조회
    ===================================================== */

    const { data: orders, error: orderError } =
      await supabase
        .from("orders")
        .select(`
          id,
          customer_id,
          store_id,
          sales_channel_group_id,
          sales_channel_id,
          order_number,
          source_order_number,
          order_date,
          delivery_date,
          status,
          total_qty,
          total_amount,
          wms_sync_status
        `)
        .in("id", orderIds);

    if (orderError) {
      console.error("WMS ORDER LOAD ERROR", orderError);

      return NextResponse.json(
        {
          success: false,
          message: orderError.message,
        },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "전송할 주문을 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    /* =====================================================
       2. 이미 전송완료 주문 제외
    ===================================================== */

    const targetOrders = orders.filter(
      (order) => order.wms_sync_status !== "전송완료"
    );

    if (targetOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "이미 WMS 전송완료된 주문입니다.",
        results: [],
      });
    }

    /* =====================================================
       3. 주문상품 조회
    ===================================================== */

    const targetOrderIds = targetOrders.map(
      (order) => order.id
    );

    const { data: orderItems, error: itemError } =
      await supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          line_amount
        `)
        .in("order_id", targetOrderIds);

    if (itemError) {
      console.error("WMS ORDER ITEM LOAD ERROR", itemError);

      return NextResponse.json(
        {
          success: false,
          message: itemError.message,
        },
        { status: 500 }
      );
    }

    /* =====================================================
       4. WMS 전송중 상태 변경
    ===================================================== */

    const { error: sendingError } = await supabase
      .from("orders")
      .update({
        wms_sync_status: "전송중",
        wms_sync_message: "WMS 전송 요청 준비",
      })
      .in("id", targetOrderIds);

    if (sendingError) {
      console.error(
        "WMS STATUS UPDATE ERROR",
        sendingError
      );

      return NextResponse.json(
        {
          success: false,
          message: sendingError.message,
        },
        { status: 500 }
      );
    }

    /* =====================================================
       5. WMS 전송 데이터 생성
    ===================================================== */

    const payload = targetOrders.map((order) => ({
      orderId: order.id,

      orderNumber: order.order_number,

      sourceOrderNumber:
        order.source_order_number,

      customerId: order.customer_id,

      storeId: order.store_id,

      salesChannelGroupId:
        order.sales_channel_group_id,

      salesChannelId:
        order.sales_channel_id,

      orderDate: order.order_date,

      deliveryDate:
        order.delivery_date,

      status: order.status,

      totalQty: order.total_qty,

      totalAmount:
        order.total_amount,

      items: (orderItems ?? [])
        .filter(
          (item) =>
            item.order_id === order.id
        )
        .map((item) => ({
          orderItemId: item.id,

          productId:
            item.product_id,

          productName:
            item.product_name,

          quantity:
            item.quantity,

          unitPrice:
            item.unit_price,

          lineAmount:
            item.line_amount,
        })),
    }));

    console.log(
      "========== WMS REQUEST PAYLOAD =========="
    );

    console.log(
      JSON.stringify(
        payload,
        null,
        2
      )
    );

    /* =====================================================
       6. 실제 WMS API 호출 위치
    ===================================================== */

    /*
      아직 실제 WMS API 주소와 인증정보가
      확정되지 않았으므로 외부 호출은 하지 않습니다.

      실제 연동 시 이 위치에서:

      const response = await fetch(
        process.env.WMS_API_URL!,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${process.env.WMS_API_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      를 호출합니다.
    */

    /* =====================================================
       7. 현재는 테스트 성공 처리
    ===================================================== */

    const results = [];

    for (const order of targetOrders) {
      const testWmsOrderId =
        `WMS-${order.order_number}`;

      const { error: updateError } =
        await supabase
          .from("orders")
          .update({
            wms_sync_status: "전송완료",

            wms_synced_at:
              new Date().toISOString(),

            wms_sync_message:
              "WMS API 연동 준비 완료",

            wms_order_id:
              testWmsOrderId,
          })
          .eq("id", order.id);

      if (updateError) {
        console.error(
          "WMS RESULT UPDATE ERROR",
          updateError
        );

        results.push({
          orderId: order.id,
          orderNumber:
            order.order_number,
          success: false,
          message:
            updateError.message,
        });

        continue;
      }

      results.push({
        orderId: order.id,
        orderNumber:
          order.order_number,
        success: true,
        wmsOrderId:
          testWmsOrderId,
      });
    }

    return NextResponse.json({
      success: true,

      message:
        `${results.filter((item) => item.success).length}건의 WMS 전송 처리가 완료되었습니다.`,

      results,
    });
  } catch (error) {
    console.error(
      "WMS API ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "WMS 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}