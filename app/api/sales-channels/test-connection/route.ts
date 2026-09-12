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

function joinUrl(
  baseUrl: string,
  endpoint: string | null
) {
  const base = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  if (!endpoint) {
    return base;
  }

  return `${base}${
    endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`
  }`;
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
          message: "API 연결 ID가 없습니다.",
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
      .from("sales_channel_api_connections")
      .select(
        `
        id,
        connection_name,
        api_base_url,
        order_endpoint,
        request_method,
        auth_type,
        credential_env_key,
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

    const url = joinUrl(
      connection.api_base_url,
      connection.order_endpoint
    );

    const headers = new Headers({
      Accept: "application/json",
    });

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
        `${envKey ?? "API 인증키"} 환경변수가 없습니다.`
      );
    }

    if (
      connection.auth_type === "API_KEY" &&
      credential
    ) {
      headers.set(
        "X-API-Key",
        credential
      );
    }

    if (
      (
        connection.auth_type === "BEARER" ||
        connection.auth_type === "OAUTH2"
      ) &&
      credential
    ) {
      headers.set(
        "Authorization",
        `Bearer ${credential}`
      );
    }

    if (
      connection.auth_type === "BASIC" &&
      credential
    ) {
      headers.set(
        "Authorization",
        `Basic ${credential}`
      );
    }

    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      10000
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
          signal: controller.signal,
          cache: "no-store",
        }
      );
    } finally {
      clearTimeout(timer);
    }

    const now =
      new Date().toISOString();

    if (!response.ok) {
      const errorMessage =
        `HTTP ${response.status} ${response.statusText}`;

      await admin
        .from(
          "sales_channel_api_connections"
        )
        .update({
          last_test_status: "오류",
          last_tested_at: now,
          last_error_message:
            errorMessage,
          updated_at: now,
        })
        .eq("id", connectionId);

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

    await admin
      .from(
        "sales_channel_api_connections"
      )
      .update({
        last_test_status: "정상",
        last_tested_at: now,
        last_error_message: null,
        updated_at: now,
      })
      .eq("id", connectionId);

    return NextResponse.json({
      message:
        `${connection.connection_name} 연결 테스트가 정상적으로 완료되었습니다.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "API 연결 시간이 초과되었습니다."
          : error.message
        : "API 연결 테스트 중 오류가 발생했습니다.";

    if (connectionId) {
      const now =
        new Date().toISOString();

      await admin
        .from(
          "sales_channel_api_connections"
        )
        .update({
          last_test_status: "오류",
          last_tested_at: now,
          last_error_message: message,
          updated_at: now,
        })
        .eq("id", connectionId);
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