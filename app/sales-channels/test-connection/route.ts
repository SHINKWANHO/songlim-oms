import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ApiConnection = {
  id: string;
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

async function checkAdmin() {
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

  if (
    !omsUser ||
    !omsUser.active ||
    omsUser.role !== "ADMIN"
  ) {
    return {
      ok: false as const,
      status: 403,
      message: "관리자 권한이 필요합니다.",
    };
  }

  return {
    ok: true as const,
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
    Object.entries(queryParams).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          url.searchParams.set(
            key,
            String(value)
          );
        }
      }
    );
  }

  return url.toString();
}

export async function POST(
  request: Request
) {
  const auth = await checkAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      {
        message: auth.message,
      },
      {
        status: auth.status,
      }
    );
  }

  const admin = createAdminClient();

  let connectionId = "";

  try {
    const body = await request.json();

    connectionId = String(
      body.connectionId || ""
    ).trim();

    if (!connectionId) {
      return NextResponse.json(
        {
          message:
            "API 연결 ID가 없습니다.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: connection,
      error,
    } = await admin
      .from(
        "sales_channel_api_connections"
      )
      .select(
        `
        id,
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
      .eq("id", connectionId)
      .maybeSingle<ApiConnection>();

    if (error || !connection) {
      return NextResponse.json(
        {
          message:
            "API 연결정보를 찾을 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    if (!connection.is_active) {
      return NextResponse.json(
        {
          message:
            "사용 중지된 API 연결입니다.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * URL 생성
     */
    const url = buildUrl(
      connection.api_base_url,
      connection.order_endpoint,
      connection.additional_query_params
    );

    /*
     * 기본 Header
     */
    const headers = new Headers();

    headers.set(
      "Accept",
      "application/json"
    );

    /*
     * 추가 Header
     */
    if (connection.additional_headers) {
      Object.entries(
        connection.additional_headers
      ).forEach(
        ([key, value]) => {
          if (
            key &&
            value !== undefined &&
            value !== null
          ) {
            headers.set(
              key,
              String(value)
            );
          }
        }
      );
    }

    /*
     * 인증 환경변수
     */
    const envKey =
      connection.credential_env_key;

    const credential =
      envKey
        ? process.env[envKey]
        : undefined;

    if (
      connection.auth_type !== "NONE" &&
      !credential
    ) {
      throw new Error(
        `${
          envKey ?? "API 인증키"
        } 환경변수가 없습니다.`
      );
    }

    /*
     * 인증방식
     */
    if (
      connection.auth_type ===
        "API_KEY" &&
      credential
    ) {
      const headerName =
        connection.api_key_header ||
        "X-API-Key";

      const credentialValue =
        connection.auth_prefix
          ? `${connection.auth_prefix} ${credential}`
          : credential;

      headers.set(
        headerName,
        credentialValue
      );
    }

    if (
      connection.auth_type ===
        "BEARER" &&
      credential
    ) {
      const prefix =
        connection.auth_prefix ||
        "Bearer";

      headers.set(
        "Authorization",
        `${prefix} ${credential}`
      );
    }

    if (
      connection.auth_type ===
        "OAUTH2" &&
      credential
    ) {
      const prefix =
        connection.auth_prefix ||
        "Bearer";

      headers.set(
        "Authorization",
        `${prefix} ${credential}`
      );
    }

    if (
      connection.auth_type ===
        "BASIC" &&
      credential
    ) {
      const prefix =
        connection.auth_prefix ||
        "Basic";

      headers.set(
        "Authorization",
        `${prefix} ${credential}`
      );
    }

    /*
     * Timeout
     */
    const timeoutSeconds =
      Number(
        connection.timeout_seconds
      ) > 0
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
      response = await fetch(
        url,
        {
          method:
            connection.request_method ||
            "GET",

          headers,

          signal:
            controller.signal,

          cache:
            "no-store",
        }
      );
    } finally {
      clearTimeout(timer);
    }

    const now =
      new Date().toISOString();

    /*
     * 연결 오류
     */
    if (!response.ok) {
      const errorMessage =
        `HTTP ${response.status} ${response.statusText}`;

      await admin
        .from(
          "sales_channel_api_connections"
        )
        .update({
          last_test_status:
            "오류",

          last_tested_at:
            now,

          last_error_message:
            errorMessage,

          updated_at:
            now,
        })
        .eq(
          "id",
          connectionId
        );

      return NextResponse.json(
        {
          message:
            `연결 테스트 실패: ${errorMessage}`,
        },
        {
          status: 502,
        }
      );
    }

    /*
     * 연결 정상
     */
    await admin
      .from(
        "sales_channel_api_connections"
      )
      .update({
        last_test_status:
          "정상",

        last_tested_at:
          now,

        last_error_message:
          null,

        updated_at:
          now,
      })
      .eq(
        "id",
        connectionId
      );

    return NextResponse.json({
      message:
        `${connection.connection_name} 연결 테스트가 정상적으로 완료되었습니다.`,

      provider:
        connection.provider_code,

      httpStatus:
        response.status,
    });
  } catch (error) {
    let message =
      "API 연결 테스트 중 오류가 발생했습니다.";

    if (error instanceof Error) {
      if (
        error.name ===
        "AbortError"
      ) {
        message =
          "API 연결 시간이 초과되었습니다.";
      } else {
        message =
          error.message;
      }
    }

    /*
     * 오류상태 DB 기록
     */
    if (connectionId) {
      const now =
        new Date().toISOString();

      await admin
        .from(
          "sales_channel_api_connections"
        )
        .update({
          last_test_status:
            "오류",

          last_tested_at:
            now,

          last_error_message:
            message,

          updated_at:
            now,
        })
        .eq(
          "id",
          connectionId
        );
    }

    return NextResponse.json(
      {
        message,
      },
      {
        status: 500,
      }
    );
  }
}