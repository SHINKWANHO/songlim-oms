"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPE
========================================================= */

type Order = {
  id: string;

  order_no: string | null;
  order_number?: string | null;
  source_order_number?: string | null;

  customer_id: string | null;

  channel: string | null;
  sales_channel_id?: string | null;
  sales_channel_group_id?: string | null;

  order_date: string | null;
  delivery_date?: string | null;

  status: string | null;

  total_qty?: number | null;
  total_amount?: number | null;

  memo?: string | null;

  shipment_requested: boolean | null;
  shipment_requested_at?: string | null;

  confirmed_at?: string | null;

  created_at: string;
};

type Customer = {
  id: string;
  code: string | null;
  name: string;
};

type OrderItem = {
  order_id: string;
  quantity: number | null;
};

/* =========================================================
   STATUS
========================================================= */

const STATUS = [
  "전체",
  "수집완료",
  "접수",
  "확인",
  "확정",
  "취소",
] as const;

/* =========================================================
   PAGE
========================================================= */

export default function OrdersPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [items, setItems] =
    useState<OrderItem[]>([]);

  const [status, setStatus] =
    useState("전체");

  const [channelFilter, setChannelFilter] =
    useState("전체");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [bulkProcessing, setBulkProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     데이터 조회
  ======================================================= */

  const loadData = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          ordersResult,
          customersResult,
          itemsResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("customers")
            .select("id, code, name")
            .order("name"),

          supabase
            .from("order_items")
            .select(
              "order_id, quantity"
            ),
        ]);

        if (ordersResult.error) {
          throw ordersResult.error;
        }

        if (customersResult.error) {
          throw customersResult.error;
        }

        if (itemsResult.error) {
          throw itemsResult.error;
        }

        setOrders(
          (ordersResult.data || []) as Order[]
        );

        setCustomers(
          (customersResult.data ||
            []) as Customer[]
        );

        setItems(
          (itemsResult.data ||
            []) as OrderItem[]
        );
      } catch (err) {
        console.error(
          "주문관리 데이터 조회 오류:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "주문 데이터를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =======================================================
     거래처 MAP
  ======================================================= */

  const customerMap = useMemo(() => {
    return new Map(
      customers.map((customer) => [
        customer.id,
        customer,
      ])
    );
  }, [customers]);

  /* =======================================================
     상품 집계 MAP
  ======================================================= */

  const itemMap = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        quantity: number;
      }
    >();

    items.forEach((item) => {
      const current =
        map.get(item.order_id) || {
          count: 0,
          quantity: 0,
        };

      map.set(item.order_id, {
        count: current.count + 1,
        quantity:
          current.quantity +
          Number(item.quantity || 0),
      });
    });

    return map;
  }, [items]);

  /* =======================================================
     상태별 건수
  ======================================================= */

  const statusCounts = useMemo(() => {
    return {
      전체: orders.length,

      수집완료: orders.filter(
        (order) =>
          order.status === "수집완료"
      ).length,

      접수: orders.filter(
        (order) =>
          order.status === "접수"
      ).length,

      확인: orders.filter(
        (order) =>
          order.status === "확인"
      ).length,

      확정: orders.filter(
        (order) =>
          order.status === "확정"
      ).length,

      취소: orders.filter(
        (order) =>
          order.status === "취소"
      ).length,
    };
  }, [orders]);

  /* =======================================================
     판매채널 목록
  ======================================================= */

  const channelOptions = useMemo(() => {
    const values = orders
      .map((order) =>
        order.channel?.trim()
      )
      .filter(
        (value): value is string =>
          !!value
      );

    return [
      "전체",
      ...Array.from(
        new Set(values)
      ).sort(),
    ];
  }, [orders]);

  /* =======================================================
     검색 / 필터
  ======================================================= */

  const filteredOrders = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return orders.filter((order) => {
      const customer =
        order.customer_id
          ? customerMap.get(
              order.customer_id
            )
          : null;

      const matchesStatus =
        status === "전체" ||
        order.status === status;

      if (!matchesStatus) {
        return false;
      }

      const matchesChannel =
        channelFilter === "전체" ||
        order.channel ===
          channelFilter;

      if (!matchesChannel) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const values = [
        order.order_number,
        order.order_no,
        order.source_order_number,
        customer?.name,
        customer?.code,
        order.channel,
      ];

      return values.some((value) =>
        value
          ?.toLowerCase()
          .includes(keyword)
      );
    });
  }, [
    orders,
    customerMap,
    search,
    status,
    channelFilter,
  ]);

  /* =======================================================
     일괄처리 가능 여부

     수집완료 → 접수
     접수 → 확인
     확인 → 확정
     확정 → 출고요청
  ======================================================= */

  function isBulkProcessable(
    order: Order
  ) {
    if (
      order.status === "수집완료"
    ) {
      return true;
    }

    if (order.status === "접수") {
      return true;
    }

    if (order.status === "확인") {
      return true;
    }

    if (
      order.status === "확정" &&
      order.shipment_requested !== true
    ) {
      return true;
    }

    return false;
  }

  /* =======================================================
     선택 가능한 주문
  ======================================================= */

  const filteredSelectableIds =
    useMemo(() => {
      return filteredOrders
        .filter(isBulkProcessable)
        .map((order) => order.id);
    }, [filteredOrders]);

  const allFilteredSelected =
    filteredSelectableIds.length > 0 &&
    filteredSelectableIds.every(
      (id) =>
        selectedIds.includes(id)
    );

  function handleSelectAll(
    checked: boolean
  ) {
    if (checked) {
      setSelectedIds(
        filteredSelectableIds
      );
    } else {
      setSelectedIds([]);
    }
  }

  function handleSelectOrder(
    id: string,
    checked: boolean
  ) {
    if (checked) {
      setSelectedIds((prev) =>
        prev.includes(id)
          ? prev
          : [...prev, id]
      );
    } else {
      setSelectedIds((prev) =>
        prev.filter(
          (item) => item !== id
        )
      );
    }
  }

  /* =======================================================
     일괄처리
  ======================================================= */

  async function handleBulkProcess() {
    if (bulkProcessing) {
      return;
    }

    if (selectedIds.length === 0) {
      alert(
        "일괄처리할 주문을 선택하세요."
      );
      return;
    }

    const selectedOrders =
      orders.filter((order) =>
        selectedIds.includes(order.id)
      );

    const processableOrders =
      selectedOrders.filter(
        isBulkProcessable
      );

    if (
      processableOrders.length === 0
    ) {
      alert(
        "일괄처리할 수 있는 주문이 없습니다."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `선택한 ${processableOrders.length.toLocaleString()}건의 주문을 다음 단계로 처리하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    setBulkProcessing(true);
    setError("");

    let successCount = 0;
    let failCount = 0;

    try {
      for (
        const order of processableOrders
      ) {
        try {
          const currentStatus =
            order.status;

          const now =
            new Date().toISOString();

          /* 수집완료 → 접수 */

          if (
            currentStatus ===
            "수집완료"
          ) {
            const { error } =
              await supabase
                .from("orders")
                .update({
                  status: "접수",
                })
                .eq("id", order.id)
                .eq(
                  "status",
                  "수집완료"
                );

            if (error) {
              failCount++;
              console.error(
                "접수 처리 실패:",
                order.id,
                error
              );
            } else {
              successCount++;
            }

            continue;
          }

          /* 접수 → 확인 */

          if (
            currentStatus === "접수"
          ) {
            const { error } =
              await supabase
                .from("orders")
                .update({
                  status: "확인",
                })
                .eq("id", order.id)
                .eq(
                  "status",
                  "접수"
                );

            if (error) {
              failCount++;
              console.error(
                "확인 처리 실패:",
                order.id,
                error
              );
            } else {
              successCount++;
            }

            continue;
          }

          /* 확인 → 확정 */

          if (
            currentStatus === "확인"
          ) {
            const { error } =
              await supabase
                .from("orders")
                .update({
                  status: "확정",
                  confirmed_at:
                    now,
                })
                .eq("id", order.id)
                .eq(
                  "status",
                  "확인"
                );

            if (error) {
              failCount++;
              console.error(
                "확정 처리 실패:",
                order.id,
                error
              );
            } else {
              successCount++;
            }

            continue;
          }

          /* 확정 → 출고요청 */

          if (
            currentStatus === "확정" &&
            order.shipment_requested !==
              true
          ) {
            const { error } =
              await supabase
                .from("orders")
                .update({
                  shipment_requested:
                    true,
                  shipment_requested_at:
                    now,
                })
                .eq("id", order.id)
                .eq(
                  "status",
                  "확정"
                );

            if (error) {
              failCount++;
              console.error(
                "출고요청 처리 실패:",
                order.id,
                error
              );
            } else {
              successCount++;
            }
          }
        } catch (orderError) {
          console.error(
            "개별 주문 처리 오류:",
            order.id,
            orderError
          );

          failCount++;
        }
      }

      await loadData();

      setSelectedIds([]);

      alert(
        `일괄처리가 완료되었습니다.\n\n성공: ${successCount.toLocaleString()}건\n실패: ${failCount.toLocaleString()}건`
      );
    } catch (err) {
      console.error(
        "일괄처리 오류:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "주문 일괄처리 중 오류가 발생했습니다."
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        color: "#111827",
        fontFamily:
          '"Malgun Gothic", "Noto Sans KR", Arial, sans-serif',
      }}
    >
      <section
        style={{
          padding: "34px 42px",
        }}
      >
        {/* HEADER */}

        <header
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              SONGLIM LOGISTICS
            </div>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              주문 관리
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              B2B 주문 접수 및 확정 관리
            </p>
          </div>

          <Link
            href="/orders/register"
            style={{
              background: "#2563eb",
              color: "#ffffff",
              textDecoration:
                "none",
              padding:
                "13px 20px",
              borderRadius: "9px",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            + 주문 등록
          </Link>
        </header>

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "16px 20px",
              background: "#fee2e2",
              border:
                "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "10px",
            }}
          >
            <strong>
              주문 처리 오류
            </strong>

            <div
              style={{
                marginTop: "5px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* STATUS SUMMARY */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(6, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          {STATUS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setStatus(item);
                setSelectedIds([]);
              }}
              style={{
                textAlign: "left",
                border:
                  status === item
                    ? "2px solid #2563eb"
                    : "1px solid #e5e7eb",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                {item}
              </div>

              <div
                style={{
                  marginTop: "8px",
                  fontSize: "25px",
                  fontWeight: 800,
                  color:
                    status === item
                      ? "#2563eb"
                      : "#111827",
                }}
              >
                {statusCounts[
                  item
                ].toLocaleString()}
              </div>

              <div
                style={{
                  marginTop: "4px",
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                주문
              </div>
            </button>
          ))}
        </section>

        {/* SEARCH */}

        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "18px",
            marginBottom: "18px",
            display: "flex",
            gap: "10px",
          }}
        >
          <select
            value={channelFilter}
            onChange={(e) => {
              setChannelFilter(
                e.target.value
              );
              setSelectedIds([]);
            }}
            style={{
              width: "180px",
              height: "44px",
              border:
                "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "0 12px",
              fontSize: "14px",
              background: "#ffffff",
              outline: "none",
            }}
          >
            {channelOptions.map(
              (channel) => (
                <option
                  key={channel}
                  value={channel}
                >
                  {channel === "전체"
                    ? "전체 판매채널"
                    : channel}
                </option>
              )
            )}
          </select>

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="주문번호, 원주문번호, 화주사, 판매채널 검색"
            style={{
              flex: 1,
              height: "44px",
              border:
                "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "0 14px",
              fontSize: "14px",
              outline: "none",
            }}
          />

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("전체");
              setChannelFilter(
                "전체"
              );
              setSelectedIds([]);
            }}
            style={{
              padding: "0 20px",
              border:
                "1px solid #d1d5db",
              background: "#ffffff",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            초기화
          </button>
        </section>

        {/* ORDER TABLE */}

        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom:
                "1px solid #e5e7eb",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong
                style={{
                  fontSize: "18px",
                }}
              >
                주문 목록
              </strong>

              <span
                style={{
                  marginLeft: "10px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                총{" "}
                {filteredOrders.length.toLocaleString()}
                건
              </span>

              {selectedIds.length > 0 && (
                <span
                  style={{
                    marginLeft: "10px",
                    color: "#2563eb",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {selectedIds.length.toLocaleString()}
                  건 선택
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={
                  handleBulkProcess
                }
                disabled={
                  bulkProcessing ||
                  selectedIds.length === 0
                }
                style={{
                  border: "none",
                  background:
                    selectedIds.length >
                      0 &&
                    !bulkProcessing
                      ? "#2563eb"
                      : "#cbd5e1",
                  color: "#ffffff",
                  borderRadius: "8px",
                  padding: "9px 15px",
                  cursor:
                    selectedIds.length >
                      0 &&
                    !bulkProcessing
                      ? "pointer"
                      : "default",
                  fontWeight: 700,
                  fontSize: "13px",
                }}
              >
                {bulkProcessing
                  ? "일괄처리 중..."
                  : `선택 주문 일괄처리${
                      selectedIds.length >
                      0
                        ? ` (${selectedIds.length})`
                        : ""
                    }`}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedIds([]);
                  void loadData();
                }}
                disabled={
                  loading ||
                  bulkProcessing
                }
                style={{
                  border:
                    "1px solid #d1d5db",
                  background: "#ffffff",
                  borderRadius: "8px",
                  padding: "8px 13px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                새로고침
              </button>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding: "70px",
                textAlign: "center",
                color: "#94a3b8",
              }}
            >
              주문 데이터를 불러오는
              중입니다.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "1320px",
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
                      style={{
                        ...thStyle,
                        width: "55px",
                        textAlign:
                          "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          allFilteredSelected
                        }
                        onChange={(e) =>
                          handleSelectAll(
                            e.target
                              .checked
                          )
                        }
                        disabled={
                          bulkProcessing ||
                          filteredSelectableIds.length ===
                            0
                        }
                      />
                    </th>

                    <th style={thStyle}>
                      주문번호
                    </th>

                    <th style={thStyle}>
                      원주문번호
                    </th>

                    <th style={thStyle}>
                      주문일
                    </th>

                    <th style={thStyle}>
                      납품일
                    </th>

                    <th style={thStyle}>
                      화주사
                    </th>

                    <th style={thStyle}>
                      판매채널
                    </th>

                    <th style={thStyle}>
                      상품
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      수량
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      주문금액
                    </th>

                    <th style={thStyle}>
                      주문상태
                    </th>

                    <th style={thStyle}>
                      출고요청
                    </th>

                    <th style={thStyle}>
                      상세
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map(
                    (order) => {
                      const customer =
                        order.customer_id
                          ? customerMap.get(
                              order.customer_id
                            )
                          : null;

                      const info =
                        itemMap.get(
                          order.id
                        ) || {
                          count: 0,
                          quantity: 0,
                        };

                      const currentStatus =
                        order.status ||
                        "수집완료";

                      const selectable =
                        isBulkProcessable(
                          order
                        );

                      const displayOrderNumber =
                        order.order_number ||
                        order.order_no ||
                        order.source_order_number ||
                        "-";

                      return (
                        <tr
                          key={
                            order.id
                          }
                        >
                          <td
                            style={{
                              ...tdStyle,
                              width:
                                "55px",
                              textAlign:
                                "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(
                                order.id
                              )}
                              disabled={
                                !selectable ||
                                bulkProcessing
                              }
                              onChange={(
                                e
                              ) =>
                                handleSelectOrder(
                                  order.id,
                                  e.target
                                    .checked
                                )
                              }
                            />
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              displayOrderNumber
                            }
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              color:
                                "#475569",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {order.source_order_number ||
                              "-"}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {formatDate(
                              order.order_date
                            )}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {formatDate(
                              order.delivery_date ||
                                null
                            )}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            <div>
                              {customer?.name ||
                                "-"}
                            </div>

                            {customer?.code && (
                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  color:
                                    "#94a3b8",
                                  fontSize:
                                    "11px",
                                }}
                              >
                                {
                                  customer.code
                                }
                              </div>
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {getChannelName(
                              order.channel
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {info.count.toLocaleString()}
                            종
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                              fontWeight:
                                700,
                            }}
                          >
                            {Number(
                              order.total_qty ??
                                info.quantity
                            ).toLocaleString()}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                              fontWeight:
                                700,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {Number(
                              order.total_amount ||
                                0
                            ).toLocaleString()}
                            원
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <StatusBadge
                              status={
                                currentStatus
                              }
                            />
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {order.shipment_requested ===
                            true ? (
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "6px 10px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    "#dcfce7",
                                  color:
                                    "#15803d",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                요청완료
                              </span>
                            ) : (
                              <span
                                style={{
                                  color:
                                    "#94a3b8",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                미요청
                              </span>
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            <Link
                              href={`/orders/${order.id}`}
                              style={{
                                color:
                                  "#2563eb",
                                textDecoration:
                                  "none",
                                fontWeight:
                                  700,
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              상세 →
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )}

                  {filteredOrders.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={13}
                        style={{
                          padding:
                            "70px",
                          textAlign:
                            "center",
                          color:
                            "#94a3b8",
                        }}
                      >
                        {orders.length ===
                        0
                          ? "등록된 주문이 없습니다."
                          : "검색 조건에 맞는 주문이 없습니다."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const value =
    status || "수집완료";

  let background =
    "#e0f2fe";

  let color =
    "#0369a1";

  if (value === "접수") {
    background =
      "#eff6ff";
    color =
      "#2563eb";
  }

  if (value === "확인") {
    background =
      "#fef3c7";
    color =
      "#b45309";
  }

  if (value === "확정") {
    background =
      "#dcfce7";
    color =
      "#15803d";
  }

  if (value === "취소") {
    background =
      "#fee2e2";
    color =
      "#b91c1c";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 11px",
        borderRadius: "999px",
        background,
        color,
        fontSize: "12px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </span>
  );
}

/* =========================================================
   CHANNEL
========================================================= */

function getChannelName(
  channel: string | null
) {
  if (!channel) {
    return "-";
  }

  const channels: Record<
    string,
    string
  > = {
    oliveyoung: "올리브영",
    OLIVEYOUNG: "올리브영",

    daiso: "다이소",
    DAISO: "다이소",

    emart: "이마트",
    EMART: "이마트",

    lottemart: "롯데마트",
    LOTTEMART: "롯데마트",

    homeplus: "홈플러스",
    HOMEPLUS: "홈플러스",

    gs25: "GS25",
    GS25: "GS25",

    cu: "CU",
    CU: "CU",

    seven: "세븐일레븐",
    SEVEN: "세븐일레븐",

    online: "온라인",
    ONLINE: "온라인",
  };

  return channels[channel] || channel;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "ko-KR"
  );
}

/* =========================================================
   TABLE STYLE
========================================================= */

const thStyle = {
  padding: "14px 16px",
  textAlign: "left" as const,
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
  borderBottom:
    "1px solid #e5e7eb",
  whiteSpace:
    "nowrap" as const,
};

const tdStyle = {
  padding: "15px 16px",
  fontSize: "13px",
  borderBottom:
    "1px solid #f1f5f9",
};