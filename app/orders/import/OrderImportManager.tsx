"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPE
========================================================= */

type Customer = {
  id: string;
  code: string;
  name: string;
};

type ChannelGroup = {
  id: string;
  code: string;
  name: string;
};

type SalesChannel = {
  id: string;
  customer_id: string;
  code: string;
  name: string;
  group_id: string | null;
};

type ImportHistory = {
  id: string;
  customer_id: string | null;
  sales_channel_group_id: string | null;
  sales_channel_id: string | null;
  import_method: string;
  import_status: string;
  source_order_number: string | null;
  source_order_date: string | null;
  total_count: number;
  success_count: number;
  duplicate_count: number;
  error_count: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

/* =========================================================
   CONSTANT
========================================================= */

const IMPORT_METHODS = [
  {
    value: "EXCEL",
    label: "Excel",
  },
  {
    value: "CSV",
    label: "CSV",
  },
  {
    value: "API",
    label: "API",
  },
  {
    value: "MANUAL",
    label: "수동",
  },
];

const IMPORT_STATUS = [
  "READY",
  "PROCESSING",
  "COMPLETED",
  "PARTIAL",
  "ERROR",
];

/* =========================================================
   COMPONENT
========================================================= */

export default function OrderImportManager() {
  const supabase = createClient();

  /* =======================================================
     MASTER
  ======================================================= */

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);

  /* =======================================================
     FORM
  ======================================================= */

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [selectedChannel, setSelectedChannel] =
    useState("");

  const [importMethod, setImportMethod] =
    useState("EXCEL");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  /* =======================================================
     DATA
  ======================================================= */

  const [history, setHistory] =
    useState<ImportHistory[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /* =======================================================
     INITIAL
  ======================================================= */

  useEffect(() => {
    void loadMasterData();
    void loadHistory();
  }, []);

  /* =======================================================
     MASTER DATA
  ======================================================= */

  async function loadMasterData() {
    const [
      customerResult,
      groupResult,
      channelResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select("id, code, name")
        .eq("active", true)
        .order("name"),

      supabase
        .from("sales_channel_groups")
        .select("id, code, name")
        .eq("active", true)
        .order("sort_order"),

      supabase
        .from("delivery_targets")
        .select(
          "id, customer_id, code, name, group_id"
        )
        .eq("active", true)
        .order("name"),
    ]);

    if (customerResult.error) {
      console.error(
        "CUSTOMER LOAD ERROR",
        customerResult.error
      );
    } else {
      setCustomers(
        (customerResult.data as Customer[]) || []
      );
    }

    if (groupResult.error) {
      console.error(
        "GROUP LOAD ERROR",
        groupResult.error
      );
    } else {
      setGroups(
        (groupResult.data as ChannelGroup[]) || []
      );
    }

    if (channelResult.error) {
      console.error(
        "CHANNEL LOAD ERROR",
        channelResult.error
      );
    } else {
      setChannels(
        (channelResult.data as SalesChannel[]) || []
      );
    }
  }

  /* =======================================================
     HISTORY
  ======================================================= */

  async function loadHistory() {
    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("order_imports")
        .select(`
          id,
          customer_id,
          sales_channel_group_id,
          sales_channel_id,
          import_method,
          import_status,
          source_order_number,
          source_order_date,
          total_count,
          success_count,
          duplicate_count,
          error_count,
          error_message,
          started_at,
          completed_at,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        })
        .limit(200);

      if (error) {
        console.error(
          "IMPORT HISTORY ERROR",
          error
        );

        setHistory([]);
        return;
      }

      setHistory(
        (data as ImportHistory[]) || []
      );
    } catch (error) {
      console.error(
        "IMPORT HISTORY EXCEPTION",
        error
      );

      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     CHANNEL FILTER
  ======================================================= */

  const customerChannels = useMemo(() => {
    if (!selectedCustomer) {
      return [];
    }

    return channels.filter(
      (channel) =>
        channel.customer_id ===
        selectedCustomer
    );
  }, [
    channels,
    selectedCustomer,
  ]);

  /* =======================================================
     CUSTOMER CHANGE
  ======================================================= */

  function handleCustomerChange(
    value: string
  ) {
    setSelectedCustomer(value);
    setSelectedChannel("");
  }

  /* =======================================================
     CHANNEL NAME
  ======================================================= */

  function getChannelName(
    id: string | null
  ) {
    if (!id) {
      return "-";
    }

    return (
      channels.find(
        (channel) => channel.id === id
      )?.name ?? "-"
    );
  }

  /* =======================================================
     CUSTOMER NAME
  ======================================================= */

  function getCustomerName(
    id: string | null
  ) {
    if (!id) {
      return "-";
    }

    return (
      customers.find(
        (customer) => customer.id === id
      )?.name ?? "-"
    );
  }

  /* =======================================================
     STATUS
  ======================================================= */

  function getStatusLabel(
    status: string
  ) {
    switch (status) {
      case "READY":
        return "대기";

      case "PROCESSING":
        return "수집중";

      case "COMPLETED":
        return "완료";

      case "PARTIAL":
        return "부분완료";

      case "ERROR":
        return "오류";

      default:
        return status;
    }
  }

  function getStatusBackground(
    status: string
  ) {
    switch (status) {
      case "COMPLETED":
        return "#dcfce7";

      case "PROCESSING":
        return "#dbeafe";

      case "PARTIAL":
        return "#fef3c7";

      case "ERROR":
        return "#fee2e2";

      default:
        return "#f1f5f9";
    }
  }

  function getStatusColor(
    status: string
  ) {
    switch (status) {
      case "COMPLETED":
        return "#166534";

      case "PROCESSING":
        return "#1d4ed8";

      case "PARTIAL":
        return "#a16207";

      case "ERROR":
        return "#b91c1c";

      default:
        return "#64748b";
    }
  }

  /* =======================================================
     FILE CHANGE
  ======================================================= */

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0] ?? null;

    setSelectedFile(file);
    setMessage("");
  }

  /* =======================================================
     EXCEL / CSV PARSE
  ======================================================= */

  async function parseFile(
    file: File
  ) {
    if (!/\.csv$/i.test(file.name)) {
      throw new Error(
        "현재는 CSV 파일만 지원합니다. XLSX 파일은 CSV 형식으로 저장한 후 다시 시도하세요."
      );
    }

    const text = await file.text();
    const records: string[][] = [];
    let record: string[] = [];
    let value = "";
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const next = text[index + 1];

      if (character === '"' && quoted && next === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        record.push(value);
        value = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && next === "\n") index += 1;
        record.push(value);
        records.push(record);
        record = [];
        value = "";
      } else {
        value += character;
      }
    }

    if (value || record.length) {
      record.push(value);
      records.push(record);
    }

    const [headers = [], ...data] = records;
    return data
      .filter((row) => row.some((cell) => cell.trim() !== ""))
      .map((row) =>
        headers.reduce<Record<string, unknown>>((result, header, index) => {
          result[header.trim()] = row[index] ?? "";
          return result;
        }, {})
      );
  }

  /* =======================================================
     IMPORT
  ======================================================= */

  async function startImport() {
    setMessage("");

    if (!selectedCustomer) {
      alert("화주를 선택하세요.");
      return;
    }

    if (!selectedChannel) {
      alert("판매채널을 선택하세요.");
      return;
    }

    if (
      importMethod === "EXCEL" ||
      importMethod === "CSV"
    ) {
      if (!selectedFile) {
        alert(
          "수집할 파일을 선택하세요."
        );

        return;
      }
    }

    const channel =
      channels.find(
        (item) =>
          item.id ===
          selectedChannel
      );

    if (!channel) {
      alert(
        "판매채널 정보를 찾을 수 없습니다."
      );

      return;
    }

    setUploading(true);

    let importId: string | null =
      null;

    try {
      /* ---------------------------------------------------
         1. 파일 읽기
      --------------------------------------------------- */

      let rows:
        Record<string, unknown>[] =
        [];

      if (
        importMethod === "EXCEL" ||
        importMethod === "CSV"
      ) {
        rows =
          await parseFile(
            selectedFile!
          );
      }

      const totalCount =
        rows.length;

      /* ---------------------------------------------------
         2. IMPORT HISTORY INSERT
      --------------------------------------------------- */

      const {
        data: importRecord,
        error: importError,
      } = await supabase
        .from("order_imports")
        .insert({
          customer_id:
            selectedCustomer,

          sales_channel_group_id:
            channel.group_id,

          sales_channel_id:
            selectedChannel,

          import_method:
            importMethod,

          import_status:
            "PROCESSING",

          total_count:
            totalCount,

          started_at:
            new Date().toISOString(),

          raw_data: {
            file_name:
              selectedFile?.name ??
              null,
          },
        })
        .select("id")
        .single();

      if (importError) {
        throw new Error(
          `수집 이력 저장 실패: ${importError.message}`
        );
      }

      importId =
        importRecord.id;

      /* ---------------------------------------------------
         3. 현재는 원본 데이터 저장 단계
         
         실제 채널별 API/엑셀 컬럼 매핑은
         다음 단계에서 연결
      --------------------------------------------------- */

      const successCount =
        rows.length;

      const duplicateCount =
        0;

      const errorCount =
        0;

      /* ---------------------------------------------------
         4. IMPORT UPDATE
      --------------------------------------------------- */

      const {
        error: updateError,
      } = await supabase
        .from("order_imports")
        .update({
          import_status:
            "COMPLETED",

          total_count:
            totalCount,

          success_count:
            successCount,

          duplicate_count:
            duplicateCount,

          error_count:
            errorCount,

          raw_data: {
            file_name:
              selectedFile?.name ??
              null,

            rows,
          },

          completed_at:
            new Date().toISOString(),
        })
        .eq("id", importId);

      if (updateError) {
        throw new Error(
          `수집 결과 저장 실패: ${updateError.message}`
        );
      }

      setMessage(
        `${successCount.toLocaleString()}건의 주문 원본 데이터가 수집되었습니다.`
      );

      setSelectedFile(null);

      const fileInput =
        document.getElementById(
          "order-import-file"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      await loadHistory();
    } catch (error) {
      console.error(
        "ORDER IMPORT ERROR",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "주문 수집 중 오류가 발생했습니다.";

      setMessage(
        errorMessage
      );

      if (importId) {
        await supabase
          .from("order_imports")
          .update({
            import_status:
              "ERROR",

            error_count: 1,

            error_message:
              errorMessage,

            completed_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            importId
          );
      }

      await loadHistory();
    } finally {
      setUploading(false);
    }
  }

  /* =======================================================
     RESET
  ======================================================= */

  function resetForm() {
    setSelectedCustomer("");
    setSelectedChannel("");
    setImportMethod("EXCEL");
    setSelectedFile(null);
    setMessage("");

    const fileInput =
      document.getElementById(
        "order-import-file"
      ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      style={{
        padding: "30px",
        background:
          "#f8fafc",
        minHeight:
          "100vh",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: 800,
            color: "#111827",
          }}
        >
          주문수집
        </h1>

        <p
          style={{
            marginTop: "8px",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          B2B 판매채널의 주문을
          OMS로 수집합니다.
        </p>
      </div>

      {/* =================================================
          IMPORT FORM
      ================================================= */}

      <section
        style={cardStyle}
      >
        <h2
          style={sectionTitleStyle}
        >
          주문 수집 실행
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, 1fr)",
            gap: "18px",
            marginTop: "22px",
          }}
        >
          <Field label="화주" required>
            <select
              value={
                selectedCustomer
              }
              onChange={(e) =>
                handleCustomerChange(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                화주를 선택하세요
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={
                      customer.id
                    }
                    value={
                      customer.id
                    }
                  >
                    {customer.name}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field
            label="판매채널"
            required
          >
            <select
              value={
                selectedChannel
              }
              onChange={(e) =>
                setSelectedChannel(
                  e.target.value
                )
              }
              disabled={
                !selectedCustomer
              }
              style={inputStyle}
            >
              <option value="">
                판매채널을
                선택하세요
              </option>

              {customerChannels.map(
                (channel) => (
                  <option
                    key={
                      channel.id
                    }
                    value={
                      channel.id
                    }
                  >
                    {channel.name}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field
            label="수집방식"
            required
          >
            <select
              value={
                importMethod
              }
              onChange={(e) =>
                setImportMethod(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              {IMPORT_METHODS.map(
                (method) => (
                  <option
                    key={
                      method.value
                    }
                    value={
                      method.value
                    }
                  >
                    {
                      method.label
                    }
                  </option>
                )
              )}
            </select>
          </Field>

          <Field
            label="파일"
          >
            <input
              id="order-import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={
                handleFileChange
              }
              disabled={
                importMethod ===
                  "API" ||
                importMethod ===
                  "MANUAL"
              }
              style={{
                ...inputStyle,
                padding:
                  "8px 10px",
              }}
            />
          </Field>
        </div>

        {selectedFile && (
          <div
            style={{
              marginTop: "18px",
              padding:
                "12px 15px",
              background:
                "#f8fafc",
              border:
                "1px solid #e5e7eb",
              borderRadius:
                "8px",
              fontSize: "14px",
            }}
          >
            선택 파일:{" "}
            <strong>
              {
                selectedFile.name
              }
            </strong>
          </div>
        )}

        {message && (
          <div
            style={{
              marginTop: "18px",
              padding:
                "14px 18px",
              borderRadius:
                "8px",
              background:
                message.includes(
                  "수집되었습니다"
                )
                  ? "#dcfce7"
                  : "#fee2e2",
              color:
                message.includes(
                  "수집되었습니다"
                )
                  ? "#166534"
                  : "#b91c1c",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            marginTop: "25px",
            display: "flex",
            justifyContent:
              "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={
              resetForm
            }
            disabled={
              uploading
            }
            style={
              resetButtonStyle
            }
          >
            초기화
          </button>

          <button
            type="button"
            onClick={
              startImport
            }
            disabled={
              uploading
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                uploading
                  ? 0.6
                  : 1,
            }}
          >
            {uploading
              ? "수집 중..."
              : "주문 수집"}
          </button>
        </div>
      </section>

      {/* =================================================
          HISTORY
      ================================================= */}

      <section
        style={cardStyle}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
          }}
        >
          <div>
            <h2
              style={
                sectionTitleStyle
              }
            >
              수집 이력
            </h2>

            <p
              style={{
                marginTop:
                  "6px",
                marginBottom: 0,
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              최근 주문 수집
              이력을
              확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadHistory()
            }
            style={
              resetButtonStyle
            }
          >
            새로고침
          </button>
        </div>

        <div
          style={{
            marginTop:
              "20px",
            overflowX:
              "auto",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "10px",
          }}
        >
          <table
            style={{
              width:
                "100%",
              minWidth:
                "1200px",
              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f8fafc",
                }}
              >
                <th
                  style={
                    thStyle
                  }
                >
                  수집일시
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  화주
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  판매채널
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  방식
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  상태
                </th>

                <th
                  style={{
                    ...thStyle,
                    textAlign:
                      "right",
                  }}
                >
                  전체
                </th>

                <th
                  style={{
                    ...thStyle,
                    textAlign:
                      "right",
                  }}
                >
                  성공
                </th>

                <th
                  style={{
                    ...thStyle,
                    textAlign:
                      "right",
                  }}
                >
                  중복
                </th>

                <th
                  style={{
                    ...thStyle,
                    textAlign:
                      "right",
                  }}
                >
                  오류
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  오류내용
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding:
                        "60px",
                      textAlign:
                        "center",
                      color:
                        "#94a3b8",
                    }}
                  >
                    불러오는
                    중...
                  </td>
                </tr>
              ) : history.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding:
                        "60px",
                      textAlign:
                        "center",
                      color:
                        "#94a3b8",
                    }}
                  >
                    수집 이력이
                    없습니다.
                  </td>
                </tr>
              ) : (
                history.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      style={{
                        borderTop:
                          "1px solid #f1f5f9",
                      }}
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        {new Date(
                          item.created_at
                        ).toLocaleString(
                          "ko-KR"
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {getCustomerName(
                          item.customer_id
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {getChannelName(
                          item.sales_channel_id
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          IMPORT_METHODS.find(
                            (
                              method
                            ) =>
                              method.value ===
                              item.import_method
                          )
                            ?.label ??
                          item.import_method
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <span
                          style={{
                            display:
                              "inline-block",
                            padding:
                              "5px 10px",
                            borderRadius:
                              "999px",
                            background:
                              getStatusBackground(
                                item.import_status
                              ),
                            color:
                              getStatusColor(
                                item.import_status
                              ),
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                          }}
                        >
                          {getStatusLabel(
                            item.import_status
                          )}
                        </span>
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        {Number(
                          item.total_count
                        ).toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                          color:
                            "#15803d",
                          fontWeight:
                            700,
                        }}
                      >
                        {Number(
                          item.success_count
                        ).toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        {Number(
                          item.duplicate_count
                        ).toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                          color:
                            item.error_count >
                            0
                              ? "#b91c1c"
                              : "#334155",
                          fontWeight:
                            item.error_count >
                            0
                              ? 700
                              : 400,
                        }}
                      >
                        {Number(
                          item.error_count
                        ).toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          maxWidth:
                            "300px",
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                        }}
                        title={
                          item.error_message ??
                          ""
                        }
                      >
                        {item.error_message ??
                          "-"}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: 700,
          color: "#374151",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              marginLeft: "4px",
              color: "#ef4444",
            }}
          >
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   STYLE
========================================================= */

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "30px",
  marginBottom: "25px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 800,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  padding: "13px 14px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "13px 14px",
  fontSize: "14px",
  color: "#334155",
  whiteSpace: "nowrap",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "8px",
  padding: "12px 25px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const resetButtonStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "11px 22px",
  background: "#ffffff",
  color: "#374151",
  fontWeight: 700,
  cursor: "pointer",
};