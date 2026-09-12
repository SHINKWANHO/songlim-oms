"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ErrorRow = {
  id: string;
  customer_id: string;
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

export default function OrderCollectionErrorsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [sourceType, setSourceType] = useState("전체");

  const [selectedRow, setSelectedRow] =
    useState<ErrorRow | null>(null);

  useEffect(() => {
    loadErrors();
  }, []);

  async function loadErrors() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("order_sources")
        .select(`
          id,
          customer_id,
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
        .or(
          "error_message.not.is.null,process_status.eq.실패,process_status.eq.오류"
        )
        .order("collected_at", {
          ascending: false,
        })
        .limit(500);

      if (error) {
        console.error("수집오류 조회 실패:", error);
        setRows([]);
        return;
      }

      setRows((data ?? []) as ErrorRow[]);
    } finally {
      setLoading(false);
    }
  }

  function getCustomerName(
    customers: ErrorRow["customers"]
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

    return new Date(value).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const sourceTypes = Array.from(
    new Set(
      rows
        .map((row) => row.source_type)
        .filter(Boolean)
    )
  );

  const filteredRows = rows.filter((row) => {
    const customerName =
      getCustomerName(row.customers);

    const searchText =
      keyword.trim().toLowerCase();

    const matchesKeyword =
      searchText === "" ||
      customerName
        .toLowerCase()
        .includes(searchText) ||
      row.source_type
        ?.toLowerCase()
        .includes(searchText) ||
      row.source_order_number
        ?.toLowerCase()
        .includes(searchText) ||
      row.error_message
        ?.toLowerCase()
        .includes(searchText);

    const matchesSource =
      sourceType === "전체" ||
      row.source_type === sourceType;

    return matchesKeyword && matchesSource;
  });

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="px-8 py-6">

          <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
            ORDER COLLECTION ERROR
          </div>

          <div className="mt-1 flex items-center justify-between">

            <div>
              <h1 className="text-[24px] font-black text-slate-900">
                수집 오류
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                주문수집 과정에서 발생한 오류를 확인합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={loadErrors}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              새로고침
            </button>

          </div>
        </div>
      </header>

      <div className="p-8">

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          <SummaryCard
            title="전체 오류"
            value={filteredRows.length}
          />

          <SummaryCard
            title="처리 실패"
            value={
              filteredRows.filter(
                (row) =>
                  row.process_status === "실패"
              ).length
            }
          />

          <SummaryCard
            title="오류 메시지"
            value={
              filteredRows.filter(
                (row) =>
                  !!row.error_message
              ).length
            }
          />

        </div>

        {/* SEARCH */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">

            <input
              value={keyword}
              onChange={(e) =>
                setKeyword(e.target.value)
              }
              placeholder="화주사 / 판매채널 / 주문번호 / 오류내용 검색"
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
                전체 판매채널
              </option>

              {sourceTypes.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setKeyword("");
                setSourceType("전체");
              }}
              className="h-11 rounded-lg bg-slate-800 px-5 text-sm font-bold text-white hover:bg-slate-700"
            >
              초기화
            </button>

          </div>
        </section>

        {/* TABLE */}
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px] border-collapse">

              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold text-slate-500">

                  <th className="px-5 py-4">
                    발생일시
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
                    오류내용
                  </th>

                  <th className="px-5 py-4 text-center">
                    상세
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
                      수집 오류를 불러오는 중입니다.
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center"
                    >
                      <div className="text-base font-bold text-slate-700">
                        발생한 수집 오류가 없습니다.
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        정상적으로 주문이 수집되고 있습니다.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 text-sm hover:bg-red-50/30"
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
                        {row.source_type}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {row.source_order_number ??
                          "-"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                          {row.process_status}
                        </span>
                      </td>

                      <td className="max-w-[360px] px-5 py-4">
                        <div
                          className="truncate font-medium text-red-600"
                          title={
                            row.error_message ??
                            ""
                          }
                        >
                          {row.error_message ??
                            "처리 실패"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRow(row)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          상세보기
                        </button>

                      </td>

                    </tr>
                  ))
                )}

              </tbody>
            </table>

          </div>
        </section>
      </div>

      {/* ERROR DETAIL MODAL */}
      {selectedRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6">

          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div>
                <div className="text-xs font-bold text-red-500">
                  COLLECTION ERROR
                </div>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  수집 오류 상세
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRow(null)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-500 hover:bg-slate-200"
              >
                ×
              </button>

            </div>

            <div className="space-y-5 p-6">

              <DetailRow
                title="화주사"
                value={getCustomerName(
                  selectedRow.customers
                )}
              />

              <DetailRow
                title="판매채널"
                value={
                  selectedRow.source_type
                }
              />

              <DetailRow
                title="원주문번호"
                value={
                  selectedRow.source_order_number ??
                  "-"
                }
              />

              <DetailRow
                title="발생일시"
                value={formatDateTime(
                  selectedRow.collected_at
                )}
              />

              <DetailRow
                title="처리상태"
                value={
                  selectedRow.process_status
                }
              />

              <div>
                <div className="mb-2 text-xs font-bold text-slate-500">
                  오류 메시지
                </div>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {selectedRow.error_message ??
                    "오류 메시지가 없습니다."}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-bold text-slate-500">
                  원본 수집 데이터
                </div>

                <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-xs leading-6 text-slate-200">
                  {JSON.stringify(
                    selectedRow.payload,
                    null,
                    2
                  )}
                </pre>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">

      <div className="text-xs font-bold text-slate-500">
        {title}
      </div>

      <div className="mt-2 flex items-end gap-1">

        <span className="text-[28px] font-black text-red-600">
          {value.toLocaleString()}
        </span>

        <span className="pb-1 text-sm font-semibold text-slate-500">
          건
        </span>

      </div>
    </div>
  );
}

function DetailRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] border-b border-slate-100 pb-3">

      <div className="text-xs font-bold text-slate-500">
        {title}
      </div>

      <div className="text-sm font-semibold text-slate-800">
        {value}
      </div>

    </div>
  );
}