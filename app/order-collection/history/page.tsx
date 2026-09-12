"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type HistoryRow = {
  id: string;
  source_order_number: string | null;
  source_type: string;
  collected_at: string;
  processed_at: string | null;
  process_status: string;
  error_message: string | null;
  payload: unknown;
  customers:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

export default function OrderCollectionHistoryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("전체");
  const [sourceType, setSourceType] = useState("전체");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("order_sources")
        .select(`
          id,
          source_order_number,
          source_type,
          collected_at,
          processed_at,
          process_status,
          error_message,
          payload,
          customers (
            name
          )
        `)
        .order("collected_at", {
          ascending: false,
        })
        .limit(500);

      if (error) {
        console.error(
          "수집 이력 조회 오류:",
          error
        );
        return;
      }

      setRows(
        (data ?? []) as HistoryRow[]
      );
    } finally {
      setLoading(false);
    }
  }

  function getCustomerName(
    customers: HistoryRow["customers"]
  ) {
    if (!customers) {
      return "-";
    }

    if (Array.isArray(customers)) {
      return customers[0]?.name ?? "-";
    }

    return customers.name ?? "-";
  }

  function formatDateTime(value: string | null) {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleString(
      "ko-KR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  }

  function getSourceTypeName(sourceType: string) {
  const map: Record<string, string> = {
    EMART: "이마트",
    "C-CU": "CU",
    CU: "CU",
    "C-GS25": "GS25",
    GS25: "GS25",
    "C-OLIVEYOUNG": "올리브영",
    OLIVEYOUNG: "올리브영",
    "C-DAISO": "다이소",
    DAISO: "다이소",
    LOTTEMART: "롯데마트",
    HOMEPLUS: "홈플러스",
    SEVEN: "세븐일레븐",
    ONLINE: "온라인",
  };

  return map[sourceType] ?? sourceType;
}

  const sourceTypes = Array.from(
    new Set(
      rows
        .map((row) => row.source_type)
        .filter(Boolean)
    )
  );

  const filteredRows = rows.filter(
    (row) => {
      const customerName =
        getCustomerName(row.customers);

      const matchesKeyword =
        keyword.trim() === "" ||
        customerName
          .toLowerCase()
          .includes(
            keyword.toLowerCase()
          ) ||
        row.source_type
          ?.toLowerCase()
          .includes(
            keyword.toLowerCase()
          ) ||
        row.source_order_number
          ?.toLowerCase()
          .includes(
            keyword.toLowerCase()
          );

      const matchesStatus =
        status === "전체" ||
        row.process_status === status;

      const matchesSource =
        sourceType === "전체" ||
        row.source_type === sourceType;

      return (
        matchesKeyword &&
        matchesStatus &&
        matchesSource
      );
    }
  );

  const successCount =
    filteredRows.filter((row) =>
      ["완료", "성공", "처리완료"].includes(
        row.process_status
      )
    ).length;

  const errorCount =
    filteredRows.filter(
      (row) =>
        !!row.error_message ||
        ["실패", "오류"].includes(
          row.process_status
        )
    ).length;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="px-8 py-6">
          <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
            ORDER COLLECTION
          </div>

          <div className="mt-1 flex items-center justify-between">
            <div>
              <h1 className="text-[24px] font-black text-slate-900">
                수집 이력
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                판매채널별 주문 수집 및 처리 결과를 확인합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            title="전체 수집"
            value={filteredRows.length}
            unit="건"
          />

          <SummaryCard
            title="정상 처리"
            value={successCount}
            unit="건"
          />

          <SummaryCard
            title="오류"
            value={errorCount}
            unit="건"
          />
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <input
              value={keyword}
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              placeholder="화주사 / 채널 / 원주문번호 검색"
              className="h-11 rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={sourceType}
              onChange={(e) =>
                setSourceType(e.target.value)
              }
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none"
            >
              <option value="전체">
                전체 채널
              </option>

              {sourceTypes.map((item) => (
  <option
    key={item}
    value={item}
  >
    {getSourceTypeName(item)}
  </option>
))}
            </select>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none"
            >
              <option value="전체">
                전체 상태
              </option>
              <option value="수집">
                수집
              </option>
              <option value="완료">
                완료
              </option>
              <option value="오류">
                오류
              </option>
            </select>

            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setStatus("전체");
                setSourceType("전체");
              }}
              className="h-11 rounded-lg bg-slate-800 px-5 text-sm font-bold text-white hover:bg-slate-700"
            >
              초기화
            </button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold text-slate-500">
                  <th className="px-5 py-4">
                    수집일시
                  </th>
                  <th className="px-5 py-4">
                    화주사
                  </th>
                  <th className="px-5 py-4">
                    판매채널
                  </th>
                  <th className="px-5 py-4">
                    원주문번호
                  </th>
                  <th className="px-5 py-4">
                    상태
                  </th>
                  <th className="px-5 py-4">
                    처리일시
                  </th>
                  <th className="px-5 py-4">
                    오류메시지
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-sm text-slate-500"
                    >
                      수집 이력을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-sm text-slate-500"
                    >
                      수집 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 text-sm hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDateTime(
                          row.collected_at
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {getCustomerName(
                          row.customers
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
  {getSourceTypeName(row.source_type)}
</td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {row.source_order_number ??
                          "-"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            row.process_status
                          }
                          hasError={
                            !!row.error_message
                          }
                        />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDateTime(
                          row.processed_at
                        )}
                      </td>

                      <td className="max-w-[320px] px-5 py-4 text-slate-600">
                        <div className="truncate">
                          {row.error_message ??
                            "-"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  unit,
}: {
  title: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-bold text-slate-500">
        {title}
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-[28px] font-black text-slate-900">
          {value.toLocaleString()}
        </span>

        <span className="pb-1 text-sm font-semibold text-slate-500">
          {unit}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  hasError,
}: {
  status: string;
  hasError: boolean;
}) {
  if (
    hasError ||
    ["실패", "오류"].includes(status)
  ) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
        {status || "오류"}
      </span>
    );
  }

  if (
    ["완료", "성공", "처리완료"].includes(
      status
    )
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
      {status || "수집"}
    </span>
  );
}