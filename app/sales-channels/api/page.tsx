"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type SalesChannel = {
  id: string;
  customer_id: string | null;
  channel_group: string | null;
  channel_code: string;
  channel_name: string;
  is_active: boolean;
};

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
  last_test_status: string;
  last_tested_at: string | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
};

const AUTH_TYPES = [
  "NONE",
  "API_KEY",
  "BEARER",
  "BASIC",
  "OAUTH2",
];

const REQUEST_METHODS = [
  "GET",
  "POST",
];

export default function ApiConnectionPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [channels, setChannels] =
    useState<SalesChannel[]>([]);

  const [connections, setConnections] =
    useState<ApiConnection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("전체");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [
    formSalesChannelId,
    setFormSalesChannelId,
  ] = useState("");

  const [
    formConnectionName,
    setFormConnectionName,
  ] = useState("");

  const [
    formBaseUrl,
    setFormBaseUrl,
  ] = useState("");

  const [
    formOrderEndpoint,
    setFormOrderEndpoint,
  ] = useState("");

  const [
    formMethod,
    setFormMethod,
  ] = useState("GET");

  const [
    formAuthType,
    setFormAuthType,
  ] = useState("NONE");

  const [
    formCredentialEnvKey,
    setFormCredentialEnvKey,
  ] = useState("");

  const [
  formProviderCode,
  setFormProviderCode,
] = useState("");

const [
  formApiKeyHeader,
  setFormApiKeyHeader,
] = useState("");

const [
  formAuthPrefix,
  setFormAuthPrefix,
] = useState("");

const [
  formAdditionalHeaders,
  setFormAdditionalHeaders,
] = useState("");

const [
  formAdditionalQueryParams,
  setFormAdditionalQueryParams,
] = useState("");

const [
  formTimeoutSeconds,
  setFormTimeoutSeconds,
] = useState("10");

  const [
    formActive,
    setFormActive,
  ] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        channelResult,
        connectionResult,
      ] = await Promise.all([
        supabase
          .from("sales_channels")
          .select(
            `
              id,
              customer_id,
              channel_group,
              channel_code,
              channel_name,
              is_active
            `
          )
          .order("channel_name"),

        supabase
          .from(
            "sales_channel_api_connections"
          )
          .select("*")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (channelResult.error) {
        throw channelResult.error;
      }

      if (connectionResult.error) {
        throw connectionResult.error;
      }

      setChannels(
        (channelResult.data ??
          []) as SalesChannel[]
      );

      setConnections(
        (connectionResult.data ??
          []) as ApiConnection[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "API 연결정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  function getChannel(
    salesChannelId: string
  ) {
    return channels.find(
      (channel) =>
        channel.id === salesChannelId
    );
  }

  function resetForm() {
    setEditingId(null);
    setFormSalesChannelId("");
    setFormConnectionName("");
    setFormBaseUrl("");
    setFormOrderEndpoint("");
    setFormMethod("GET");
    setFormAuthType("NONE");
setFormCredentialEnvKey("");

setFormProviderCode("");
setFormApiKeyHeader("");
setFormAuthPrefix("");
setFormAdditionalHeaders("");
setFormAdditionalQueryParams("");
setFormTimeoutSeconds("10");

setFormActive(true);
    setMessage("");
    setError("");
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function editConnection(
    connection: ApiConnection
  ) {
    setEditingId(connection.id);

    setFormSalesChannelId(
      connection.sales_channel_id
    );

    setFormConnectionName(
      connection.connection_name
    );

    setFormBaseUrl(
      connection.api_base_url
    );

    setFormOrderEndpoint(
      connection.order_endpoint ?? ""
    );

    setFormMethod(
      connection.request_method
    );

    setFormAuthType(
      connection.auth_type
    );

    setFormCredentialEnvKey(
      connection.credential_env_key ??
        ""
    );
    setFormProviderCode(
  connection.provider_code ?? ""
);

setFormApiKeyHeader(
  connection.api_key_header ?? ""
);

setFormAuthPrefix(
  connection.auth_prefix ?? ""
);

setFormAdditionalHeaders(
  connection.additional_headers
    ? JSON.stringify(
        connection.additional_headers,
        null,
        2
      )
    : ""
);

setFormAdditionalQueryParams(
  connection.additional_query_params
    ? JSON.stringify(
        connection.additional_query_params,
        null,
        2
      )
    : ""
);

setFormTimeoutSeconds(
  String(
    connection.timeout_seconds ?? 10
  )
);
    setFormActive(
      connection.is_active
    );

    setShowForm(true);
    setMessage("");
    setError("");
  }

  async function saveConnection() {
    if (!formSalesChannelId) {
      setError(
        "판매채널을 선택해주세요."
      );
      return;
    }

    if (
      !formConnectionName.trim()
    ) {
      setError(
        "연결명을 입력해주세요."
      );
      return;
    }

    if (!formBaseUrl.trim()) {
      setError(
        "API Base URL을 입력해주세요."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        sales_channel_id:
          formSalesChannelId,

        connection_name:
          formConnectionName.trim(),

        api_base_url:
          formBaseUrl.trim(),

        order_endpoint:
          formOrderEndpoint.trim() ||
          null,

        request_method:
          formMethod,

        auth_type:
          formAuthType,

        credential_env_key:
          formCredentialEnvKey.trim() ||
          null,
          provider_code:
  formProviderCode.trim() ||
  null,

api_key_header:
  formApiKeyHeader.trim() ||
  null,

auth_prefix:
  formAuthPrefix.trim() ||
  null,

additional_headers:
  formAdditionalHeaders.trim()
    ? JSON.parse(
        formAdditionalHeaders
      )
    : {},

additional_query_params:
  formAdditionalQueryParams.trim()
    ? JSON.parse(
        formAdditionalQueryParams
      )
    : {},

timeout_seconds:
  Number(
    formTimeoutSeconds
  ) || 10,

        is_active:
          formActive,

        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from(
              "sales_channel_api_connections"
            )
            .update(payload)
            .eq("id", editingId);

        if (error) {
          throw error;
        }

        setMessage(
          "API 연결정보를 수정했습니다."
        );
      } else {
        const { error } =
          await supabase
            .from(
              "sales_channel_api_connections"
            )
            .insert(payload);

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "해당 판매채널에는 이미 API 연결정보가 등록되어 있습니다."
            );
          }

          throw error;
        }

        setMessage(
          "API 연결정보를 등록했습니다."
        );
      }

      await loadData();

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteConnection(
    connection: ApiConnection
  ) {
    const channel =
      getChannel(
        connection.sales_channel_id
      );

    const confirmed =
      window.confirm(
        `${
          channel?.channel_name ??
          connection.connection_name
        } API 연결정보를 삭제하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "sales_channel_api_connections"
        )
        .delete()
        .eq("id", connection.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "API 연결정보를 삭제했습니다."
    );

    await loadData();
  }

  async function testConnection(
    connection: ApiConnection
  ) {
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/sales-channels/test-connection",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            connectionId:
              connection.id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ??
            "API 연결 테스트에 실패했습니다."
        );
      }

      setMessage(
        result.message ??
          "API 연결 테스트가 완료되었습니다."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "API 연결 테스트에 실패했습니다."
      );

      await loadData();
    }
  }

  const filteredConnections =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return connections.filter(
        (connection) => {
          const channel =
            getChannel(
              connection.sales_channel_id
            );

          const matchesStatus =
            statusFilter === "전체" ||
            connection.last_test_status ===
              statusFilter;

          if (!keyword) {
            return matchesStatus;
          }

          const text = [
            connection.connection_name,
            connection.api_base_url,
            connection.order_endpoint ??
              "",
            channel?.channel_name ?? "",
            channel?.channel_code ?? "",
            channel?.channel_group ?? "",
          ]
            .join(" ")
            .toLowerCase();

          return (
            matchesStatus &&
            text.includes(keyword)
          );
        }
      );
    }, [
      connections,
      channels,
      search,
      statusFilter,
    ]);

  const connectedCount =
    connections.filter(
      (item) =>
        item.last_test_status ===
        "정상"
    ).length;

  const errorCount =
    connections.filter(
      (item) =>
        item.last_test_status ===
        "오류"
    ).length;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">

        <div className="px-8 py-6">

          <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
            SALES CHANNEL API
          </div>

          <div className="mt-1 flex items-center justify-between gap-4">

            <div>
              <h1 className="text-[24px] font-black text-slate-900">
                API 연결관리
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                판매채널별 주문수집 API 연결정보를 관리합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewForm}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white -shadow-sm hover:bg-blue-700"
            >
              + API 연결 등록
            </button>

          </div>
        </div>

      </header>


      <div className="p-8">

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}


        {/* SUMMARY */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <SummaryCard
            title="등록 API"
            value={
              connections.length
            }
            description="판매채널 API 연결"
          />

          <SummaryCard
            title="정상 연결"
            value={
              connectedCount
            }
            description="최근 테스트 정상"
          />

          <SummaryCard
            title="연결 오류"
            value={errorCount}
            description="확인이 필요한 API"
          />

        </section>


        {/* FILTER */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_auto]">

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="판매채널, 채널코드, API URL 검색"
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none"
            >
              <option value="전체">
                전체 연결상태
              </option>

              <option value="미확인">
                미확인
              </option>

              <option value="정상">
                정상
              </option>

              <option value="오류">
                오류
              </option>
            </select>

            <button
              type="button"
              onClick={loadData}
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              새로고침
            </button>

          </div>

        </section>


        {/* FORM */}
        {showForm && (
          <section className="mt-5 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">

            <div className="flex items-start justify-between">

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingId
                    ? "API 연결 수정"
                    : "API 연결 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  판매채널의 주문수집 API 정보를 입력합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(
                    false
                  );
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 font-bold text-slate-500 hover:bg-slate-200"
              >
                ×
              </button>

            </div>


            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

              <Field
                title="판매채널"
                required
              >
                <select
                  value={
                    formSalesChannelId
                  }
                  onChange={(e) =>
                    setFormSalesChannelId(
                      e.target.value
                    )
                  }
                  className="form-input"
                >
                  <option value="">
                    판매채널 선택
                  </option>

                  {channels.map(
                    (channel) => (
                      <option
                        key={
                          channel.id
                        }
                        value={
                          channel.id
                        }
                      >
                        [
                        {
                          channel.channel_group
                        }
                        ]{" "}
                        {
                          channel.channel_name
                        }{" "}
                        (
                        {
                          channel.channel_code
                        }
                        )
                      </option>
                    )
                  )}

                </select>
              </Field>


              <Field
                title="연결명"
                required
              >
                <input
                  value={
                    formConnectionName
                  }
                  onChange={(e) =>
                    setFormConnectionName(
                      e.target.value
                    )
                  }
                  placeholder="예: 이마트 주문 API"
                  className="form-input"
                />
              </Field>


              <Field
                title="API Base URL"
                required
              >
                <input
                  value={
                    formBaseUrl
                  }
                  onChange={(e) =>
                    setFormBaseUrl(
                      e.target.value
                    )
                  }
                  placeholder="https://api.example.com"
                  className="form-input"
                />
              </Field>


              <Field title="주문조회 Endpoint">

                <input
                  value={
                    formOrderEndpoint
                  }
                  onChange={(e) =>
                    setFormOrderEndpoint(
                      e.target.value
                    )
                  }
                  placeholder="/orders"
                  className="form-input"
                />

              </Field>


              <Field title="요청 방식">

                <select
                  value={
                    formMethod
                  }
                  onChange={(e) =>
                    setFormMethod(
                      e.target.value
                    )
                  }
                  className="form-input"
                >
                  {REQUEST_METHODS.map(
                    (method) => (
                      <option
                        key={method}
                        value={method}
                      >
                        {method}
                      </option>
                    )
                  )}
                </select>

              </Field>


              <Field title="인증방식">

                <select
                  value={
                    formAuthType
                  }
                  onChange={(e) =>
                    setFormAuthType(
                      e.target.value
                    )
                  }
                  className="form-input"
                >

                  {AUTH_TYPES.map(
                    (auth) => (
                      <option
                        key={auth}
                        value={auth}
                      >
                        {auth}
                      </option>
                    )
                  )}

                </select>

              </Field>


              <Field title="Credential 환경변수">

                <input
                  value={
                    formCredentialEnvKey
                  }
                  onChange={(e) =>
                    setFormCredentialEnvKey(
                      e.target.value
                    )
                  }
                  placeholder="예: EMART_API_KEY"
                  className="form-input"
                />

                <p className="mt-2 text-xs text-slate-400">
                  실제 API Key를 입력하지 말고 .env.local 또는 Vercel에 등록한 환경변수 이름만 입력합니다.
                </p>

              </Field>
               <Field title="Provider Code">
  <input
    value={formProviderCode}
    onChange={(e) =>
      setFormProviderCode(
        e.target.value.toUpperCase()
      )
    }
    placeholder="예: EMART, OLIVEYOUNG, GS25"
    className="form-input"
  />

  <p className="mt-2 text-xs text-slate-400">
    판매채널 API 구분용 코드입니다.
  </p>
</Field>


<Field title="API Key Header">
  <input
    value={formApiKeyHeader}
    onChange={(e) =>
      setFormApiKeyHeader(
        e.target.value
      )
    }
    placeholder="예: X-API-Key"
    className="form-input"
  />

  <p className="mt-2 text-xs text-slate-400">
    API_KEY 인증방식에서 사용할 헤더명입니다.
  </p>
</Field>


<Field title="Auth Prefix">
  <input
    value={formAuthPrefix}
    onChange={(e) =>
      setFormAuthPrefix(
        e.target.value
      )
    }
    placeholder="예: Bearer"
    className="form-input"
  />

  <p className="mt-2 text-xs text-slate-400">
    인증값 앞에 붙는 문자열입니다.
  </p>
</Field>


<Field title="Timeout">
  <div className="flex items-center gap-2">
    <input
      type="number"
      min="1"
      max="120"
      value={formTimeoutSeconds}
      onChange={(e) =>
        setFormTimeoutSeconds(
          e.target.value
        )
      }
      className="form-input"
    />

    <span className="whitespace-nowrap text-sm font-bold text-slate-500">
      초
    </span>
  </div>
</Field>


<Field title="추가 Header">
  <textarea
    value={formAdditionalHeaders}
    onChange={(e) =>
      setFormAdditionalHeaders(
        e.target.value
      )
    }
    placeholder={`{
  "X-Client-Id": "example"
}`}
    className="min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500"
  />

  <p className="mt-2 text-xs text-slate-400">
    JSON 형식으로 입력합니다. 실제 비밀번호나 API Key는 입력하지 않습니다.
  </p>
</Field>


<Field title="추가 Query Parameter">
  <textarea
    value={formAdditionalQueryParams}
    onChange={(e) =>
      setFormAdditionalQueryParams(
        e.target.value
      )
    }
    placeholder={`{
  "pageSize": "100"
}`}
    className="min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-blue-500"
  />

  <p className="mt-2 text-xs text-slate-400">
    주문조회 시 공통으로 전달할 Query Parameter를 JSON 형식으로 입력합니다.
  </p>
</Field>

              <Field title="사용여부">

                <label className="flex h-11 items-center gap-3">

                  <input
                    type="checkbox"
                    checked={
                      formActive
                    }
                    onChange={(e) =>
                      setFormActive(
                        e.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                  <span className="text-sm font-bold text-slate-700">
                    API 연결 사용
                  </span>

                </label>

              </Field>

            </div>


            <div className="mt-6 flex justify-end gap-2">

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(
                    false
                  );
                }}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600"
              >
                취소
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={
                  saveConnection
                }
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "저장중..."
                  : editingId
                  ? "수정"
                  : "등록"}
              </button>

            </div>

          </section>
        )}


        {/* TABLE */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1250px] border-collapse">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black text-slate-500">

                  <th className="px-5 py-4">
                    판매채널
                  </th>

                  <th className="px-5 py-4">
                    그룹
                  </th>

                  <th className="px-5 py-4">
                    연결명
                  </th>

                  <th className="px-5 py-4">
                    인증
                  </th>

                  <th className="px-5 py-4">
                    API 주소
                  </th>

                  <th className="px-5 py-4">
                    사용
                  </th>

                  <th className="px-5 py-4">
                    연결상태
                  </th>

                  <th className="px-5 py-4">
                    최근확인
                  </th>

                  <th className="px-5 py-4 text-center">
                    관리
                  </th>

                </tr>

              </thead>


              <tbody>

                {loading ? (
                  <tr>

                    <td
                      colSpan={9}
                      className="px-5 py-16 text-center text-sm text-slate-500"
                    >
                      API 연결정보를 불러오는 중입니다.
                    </td>

                  </tr>
                ) : filteredConnections.length ===
                  0 ? (
                  <tr>

                    <td
                      colSpan={9}
                      className="px-5 py-16 text-center"
                    >
                      <div className="font-bold text-slate-700">
                        등록된 API 연결정보가 없습니다.
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        API 연결 등록 버튼을 눌러 판매채널 API를 추가해주세요.
                      </div>
                    </td>

                  </tr>
                ) : (
                  filteredConnections.map(
                    (connection) => {
                      const channel =
                        getChannel(
                          connection.sales_channel_id
                        );

                      return (
                        <tr
                          key={
                            connection.id
                          }
                          className="border-b border-slate-100 text-sm hover:bg-slate-50"
                        >

                          <td className="px-5 py-4 font-black text-slate-800">
                            {
                              channel?.channel_name ??
                              "-"
                            }
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {
                              channel?.channel_group ??
                              "-"
                            }
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-700">
                            {
                              connection.connection_name
                            }
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                              {
                                connection.auth_type
                              }
                            </span>
                          </td>

                          <td className="max-w-[300px] px-5 py-4">
                            <div
                              className="truncate text-xs text-slate-600"
                              title={
                                connection.api_base_url
                              }
                            >
                              {
                                connection.api_base_url
                              }
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {connection.is_active
                              ? "사용"
                              : "미사용"}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                connection.last_test_status
                              }
                            />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                            {
                              connection.last_tested_at
                                ? new Date(
                                    connection.last_tested_at
                                  ).toLocaleString(
                                    "ko-KR"
                                  )
                                : "-"
                            }
                          </td>

                          <td className="px-5 py-4">

                            <div className="flex justify-center gap-1">

                              <button
                                type="button"
                                onClick={() =>
                                  testConnection(
                                    connection
                                  )
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                              >
                                연결테스트
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  editConnection(
                                    connection
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600"
                              >
                                수정
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteConnection(
                                    connection
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600"
                              >
                                삭제
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>


      <style jsx>{`
        .form-input {
          width: 100%;
          height: 44px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0 14px;
          font-size: 14px;
          outline: none;
          background: white;
        }

        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px
            rgba(59, 130, 246, 0.1);
        }
      `}</style>

    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="text-sm font-bold text-slate-500">
        {title}
      </div>

      <div className="mt-3 text-[30px] font-black leading-none text-slate-900">
        {value.toLocaleString()}
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {description}
      </div>

    </div>
  );
}

function Field({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>

      <label className="mb-2 block text-sm font-black text-slate-700">
        {title}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}

    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  if (status === "정상") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
        정상
      </span>
    );
  }

  if (status === "오류") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
        오류
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
      미확인
    </span>
  );
}