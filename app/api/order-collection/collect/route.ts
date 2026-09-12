import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ApiConnection = {
  id: string;
  sales_channel_id: string;
  connection_name: string;
  api_base_url: string;
  order_endpoint: string | null;
  request_method: string;
  auth_type: string;
  credential_env_key: string | null;
  provider_code: string | null;
  api_key_header: string | null;
  auth_prefix: string | null;
  additional_headers: Record<string, string> | null;
  additional_query_params: Record<string, string> | null;
  timeout_seconds: number;
  is_active: boolean;
};

type ExternalOrderItem = {
  productCode?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
};

type ExternalOrder = {
  orderNumber?: string;
  sourceOrderNumber?: string;
  orderDate?: string;
  deliveryDate?: string;
  storeCode?: string;
  items?: ExternalOrderItem[];
};

async function checkUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      message: "로그인이 필요합니다.",
    };
  }

  const { data: omsUser } = await supabase
    .from("oms_users")
    .select("role, active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!omsUser || !omsUser.active) {
    return {
      ok: false as const,
      status: 403,
      message: "사용할 수 없는 사용자입니다.",
    };
  }

  return {
    ok: true as const,
    role: omsUser.role,
  };
}

function buildUrl(
  baseUrl: string,
  endpoint: string | null,
  queryParams: Record<string, string> | null
) {
  const base = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  let fullUrl = base;

  if (endpoint) {
    fullUrl += endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;
  }

  const url = new URL(fullUrl);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function buildHeaders(connection: ApiConnection) {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (connection.additional_headers) {
    Object.entries(connection.additional_headers).forEach(
      ([key, value]) => {
        if (key && value !== undefined && value !== null) {
          headers.set(key, String(value));
        }
      }
    );
  }

  const envKey = connection.credential_env_key;

  const credential = envKey
    ? process.env[envKey]
    : undefined;

  if (
    connection.auth_type !== "NONE" &&
    !credential
  ) {
    throw new Error(
      `${envKey ?? "API 인증키"} 환경변수가 없습니다.`
    );
  }

  if (
    connection.auth_type === "API_KEY" &&
    credential
  ) {
    const headerName =
      connection.api_key_header || "X-API-Key";

    const value = connection.auth_prefix
      ? `${connection.auth_prefix} ${credential}`
      : credential;

    headers.set(headerName, value);
  }

  if (
    (connection.auth_type === "BEARER" ||
      connection.auth_type === "OAUTH2") &&
    credential
  ) {
    headers.set(
      "Authorization",
      `${
        connection.auth_prefix || "Bearer"
      } ${credential}`
    );
  }

  if (
    connection.auth_type === "BASIC" &&
    credential
  ) {
    headers.set(
      "Authorization",
      `${
        connection.auth_prefix || "Basic"
      } ${credential}`
    );
  }

  return headers;
}

function normalizeOrders(
  payload: unknown
): ExternalOrder[] {
  if (Array.isArray(payload)) {
    return payload as ExternalOrder[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const data = payload as Record<string, unknown>;

    if (Array.isArray(data.orders)) {
      return data.orders as ExternalOrder[];
    }

    if (Array.isArray(data.data)) {
      return data.data as ExternalOrder[];
    }

    return [payload as ExternalOrder];
  }

  return [];
}

export async function POST(request: Request) {
  const auth = await checkUser();

  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.message },
      { status: auth.status }
    );
  }

  const admin = createAdminClient();

  try {
    const body = await request.json();

    const salesChannelId = String(
      body.salesChannelId || ""
    ).trim();

    if (!salesChannelId) {
      return NextResponse.json(
        {
          message:
            "판매채널 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    const {
      data: channel,
      error: channelError,
    } = await admin
      .from("sales_channels")
      .select(
        `
        id,
        customer_id,
        channel_code,
        channel_name,
        channel_group,
        is_active
        `
      )
      .eq("id", salesChannelId)
      .maybeSingle();

    if (
      channelError ||
      !channel
    ) {
      return NextResponse.json(
        {
          message:
            "판매채널 정보를 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    if (!channel.is_active) {
      return NextResponse.json(
        {
          message:
            "사용 중지된 판매채널입니다.",
        },
        { status: 400 }
      );
    }

    const {
      data: connection,
      error: connectionError,
    } = await admin
      .from(
        "sales_channel_api_connections"
      )
      .select(
        `
        id,
        sales_channel_id,
        connection_name,
        api_base_url,
        order_endpoint,
        request_method,
        auth_type,
        credential_env_key,
        provider_code,
        api_key_header,
        auth_prefix,
        additional_headers,
        additional_query_params,
        timeout_seconds,
        is_active
        `
      )
      .eq(
        "sales_channel_id",
        salesChannelId
      )
      .eq("is_active", true)
      .maybeSingle<ApiConnection>();

    if (
      connectionError ||
      !connection
    ) {
      return NextResponse.json(
        {
          message:
            "해당 판매채널의 API 연결정보가 없습니다.",
        },
        { status: 404 }
      );
    }

    const url = buildUrl(
      connection.api_base_url,
      connection.order_endpoint,
      connection.additional_query_params
    );

    const headers =
      buildHeaders(connection);

    const timeoutSeconds =
      Number(connection.timeout_seconds) > 0
        ? Math.min(
            Number(
              connection.timeout_seconds
            ),
            120
          )
        : 10;

    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      timeoutSeconds * 1000
    );

    let response: Response;

    try {
      response = await fetch(url, {
        method:
          connection.request_method ||
          "GET",
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(
        `API 호출 실패: HTTP ${response.status} ${response.statusText}`
      );
    }

    const payload =
      await response.json();

    const orders =
      normalizeOrders(payload);

    if (orders.length === 0) {
      return NextResponse.json({
        message:
          "수집된 주문이 없습니다.",
        collected: 0,
        inserted: 0,
        skipped: 0,
        failed: 0,
      });
    }

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (const externalOrder of orders) {
      const sourceOrderNumber =
        String(
          externalOrder.sourceOrderNumber ||
            externalOrder.orderNumber ||
            ""
        ).trim();

      if (!sourceOrderNumber) {
        failed += 1;
        continue;
      }

      /*
       * 이미 수집된 주문인지 확인
       */
      const {
        data: existingOrder,
      } = await admin
        .from("orders")
        .select("id")
        .eq(
          "customer_id",
          channel.customer_id
        )
        .eq(
          "source_order_number",
          sourceOrderNumber
        )
        .maybeSingle();

      if (existingOrder) {
        skipped += 1;
        continue;
      }

      /*
       * 원본 데이터 저장
       */
      const {
        data: source,
        error: sourceError,
      } = await admin
        .from("order_sources")
        .insert({
          customer_id:
            channel.customer_id,

          source_order_number:
            sourceOrderNumber,

          source_type:
            connection.provider_code ||
            channel.channel_code,

          payload:
            externalOrder,

          process_status:
            "수집",
        })
        .select("id")
        .single();

      if (
        sourceError ||
        !source
      ) {
        failed += 1;
        continue;
      }

      try {
        const items =
          Array.isArray(
            externalOrder.items
          )
            ? externalOrder.items
            : [];

        const totalQty =
          items.reduce(
            (sum, item) =>
              sum +
              Number(
                item.quantity || 0
              ),
            0
          );

        const totalAmount =
          items.reduce(
            (sum, item) => {
              const qty =
                Number(
                  item.quantity || 0
                );

              const amount =
                item.amount !== undefined
                  ? Number(
                      item.amount || 0
                    )
                  : qty *
                    Number(
                      item.unitPrice || 0
                    );

              return sum + amount;
            },
            0
          );

        const orderDate =
          externalOrder.orderDate
            ? String(
                externalOrder.orderDate
              ).slice(0, 10)
            : new Date()
                .toISOString()
                .slice(0, 10);

        const deliveryDate =
          externalOrder.deliveryDate
            ? String(
                externalOrder.deliveryDate
              ).slice(0, 10)
            : null;

        /*
         * 매장 매칭
         */
        let storeId: string | null =
          null;

        if (
          externalOrder.storeCode
        ) {
          const {
            data: store,
          } = await admin
            .from("stores")
            .select("id")
            .eq(
              "customer_id",
              channel.customer_id
            )
            .eq(
              "code",
              externalOrder.storeCode
            )
            .maybeSingle();

          storeId =
            store?.id ?? null;
        }

        /*
         * 주문 생성
         */
        const {
          data: createdOrder,
          error: orderError,
        } = await admin
          .from("orders")
          .insert({
            customer_id:
              channel.customer_id,

            store_id:
              storeId,

            order_number:
              sourceOrderNumber,

            source_order_number:
              sourceOrderNumber,

            order_date:
              orderDate,

            delivery_date:
              deliveryDate,

            status:
              "수집완료",

            total_qty:
              totalQty,

            total_amount:
              totalAmount,

            raw_source_id:
              source.id,

            wms_sync_status:
              "미전송",

            sales_channel_id:
              channel.id,

            channel:
              channel.channel_name,
          })
          .select("id")
          .single();

        if (
          orderError ||
          !createdOrder
        ) {
          throw orderError;
        }

        /*
         * 주문상세 생성
         */
        for (const item of items) {
          const productCode =
            String(
              item.productCode || ""
            ).trim();

          const productName =
            String(
              item.productName ||
                productCode ||
                "상품명 없음"
            ).trim();

          const quantity =
            Number(
              item.quantity || 0
            );

          if (quantity <= 0) {
            continue;
          }

          let productId:
            | string
            | null = null;

          let customerProductId:
            | string
            | null = null;

          let matchingStatus =
            "미매칭";

          if (productCode) {
            const {
              data:
                customerProduct,
            } = await admin
              .from(
                "customer_products"
              )
              .select(
                `
                id,
                product_id
                `
              )
              .eq(
                "customer_id",
                channel.customer_id
              )
              .eq(
                "customer_product_code",
                productCode
              )
              .maybeSingle();

            if (customerProduct) {
              customerProductId =
                customerProduct.id;

              productId =
                customerProduct.product_id;

              matchingStatus =
                "매칭";
            }
          }

          const unitPrice =
            item.unitPrice !== undefined
              ? Number(
                  item.unitPrice || 0
                )
              : null;

          const lineAmount =
            item.amount !== undefined
              ? Number(
                  item.amount || 0
                )
              : unitPrice !== null
                ? unitPrice *
                  quantity
                : null;

          const {
            error: itemError,
          } = await admin
            .from("order_items")
            .insert({
              order_id:
                createdOrder.id,

              product_id:
                productId,

              customer_product_id:
                customerProductId,

              customer_product_code:
                productCode || null,

              product_name:
                productName,

              quantity,

              unit_price:
                unitPrice,

              line_amount:
                lineAmount,

              matching_status:
                matchingStatus,
            });

          if (itemError) {
            throw itemError;
          }
        }

        /*
         * 원본 처리 완료
         */
        await admin
          .from("order_sources")
          .update({
            process_status:
              "완료",

            processed_at:
              new Date().toISOString(),

            error_message:
              null,
          })
          .eq("id", source.id);

        inserted += 1;
      } catch (error) {
        failed += 1;

        const message =
          error instanceof Error
            ? error.message
            : "주문 변환 처리 중 오류가 발생했습니다.";

        await admin
          .from("order_sources")
          .update({
            process_status:
              "오류",

            processed_at:
              new Date().toISOString(),

            error_message:
              message,
          })
          .eq("id", source.id);
      }
    }

    return NextResponse.json({
      message:
        "주문수집이 완료되었습니다.",

      collected:
        orders.length,

      inserted,
      skipped,
      failed,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "판매채널 API 응답 시간이 초과되었습니다."
          : error.message
        : "주문수집 중 오류가 발생했습니다.";

    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}