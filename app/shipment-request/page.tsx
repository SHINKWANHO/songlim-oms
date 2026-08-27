"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_no: string | null;
  customer_id: string | null;
  channel: string | null;
  order_date: string | null;
  status: string | null;
  confirmed_at: string | null;
  shipment_requested: boolean | null;
  shipment_requested_at: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  code: string | null;
  name: string;
};

type OrderItem = {
  order_id: string;
  quantity: number;
};

export default function ShipmentRequestPage() {
  const supabase = createClient();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [items, setItems] =
    useState<OrderItem[]>([]);

  const [filter, setFilter] =
    useState<"all" | "requested" | "waiting">(
      "waiting"
    );

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState<string | null>(null);

  const [bulkProcessing, setBulkProcessing] =
    useState(false);

  /* =====================================================
     일괄처리 선택 주문
  ===================================================== */

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [error, setError] =
    useState("");

  /* =====================================================
     최초 조회
  ===================================================== */

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     전체 데이터 조회
  ===================================================== */

  async function loadData() {
    setLoading(true);
    setError("");

    const [
      ordersResult,
      customersResult,
      itemsResult,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(
          `
          id,
          order_no,
          customer_id,
          channel,
          order_date,
          status,
          confirmed_at,
          shipment_requested,
          shipment_requested_at,
          created_at
          `
        )
        .eq(
          "status",
          "확정"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        ),

      supabase
        .from("customers")
        .select(
          "id, code, name"
        )
        .order("name"),

      supabase
        .from("order_items")
        .select(
          "order_id, quantity"
        ),
    ]);

    if (ordersResult.error) {
      setError(
        ordersResult.error.message
      );
    }

    if (customersResult.error) {
      setError(
        customersResult.error.message
      );
    }

    if (itemsResult.error) {
      setError(
        itemsResult.error.message
      );
    }

    setOrders(
      ordersResult.data || []
    );

    setCustomers(
      customersResult.data || []
    );

    setItems(
      itemsResult.data || []
    );

    /*
     * 새로고침 후 실제 존재하는 주문만
     * 선택 상태에 남김
     */
    setSelectedIds(
      (current) =>
        current.filter((id) =>
          (ordersResult.data || []).some(
            (order) =>
              order.id === id
          )
        )
    );

    setLoading(false);
  }

  /* =====================================================
     거래처 Map
  ===================================================== */

  const customerMap =
    new Map(
      customers.map(
        (customer) => [
          customer.id,
          customer,
        ]
      )
    );

  /* =====================================================
     수량 Map
  ===================================================== */

  const quantityMap =
    new Map<string, number>();

  items.forEach((item) => {
    const current =
      quantityMap.get(
        item.order_id
      ) || 0;

    quantityMap.set(
      item.order_id,
      current +
        Number(
          item.quantity || 0
        )
    );
  });

  /* =====================================================
     필터
  ===================================================== */

  const filteredOrders =
    orders.filter(
      (order) => {
        const customer =
          order.customer_id
            ? customerMap.get(
                order.customer_id
              )
            : null;

        const matchesFilter =
          filter === "all"
            ? true
            : filter === "requested"
            ? !!order.shipment_requested
            : !order.shipment_requested;

        const keyword =
          search
            .trim()
            .toLowerCase();

        if (!keyword) {
          return matchesFilter;
        }

        const matchesSearch =
          order.order_no
            ?.toLowerCase()
            .includes(keyword) ||
          customer?.name
            ?.toLowerCase()
            .includes(keyword) ||
          customer?.code
            ?.toLowerCase()
            .includes(keyword);

        return (
          matchesFilter &&
          !!matchesSearch
        );
      }
    );

  /* =====================================================
     선택 가능한 주문

     출고요청:
     → shipment_requested = false

     요청취소:
     → shipment_requested = true
  ===================================================== */

  const waitingOrders =
    filteredOrders.filter(
      (order) =>
        !order.shipment_requested
    );

  const requestedOrders =
    filteredOrders.filter(
      (order) =>
        !!order.shipment_requested
    );

  const selectedWaitingIds =
    selectedIds.filter((id) =>
      waitingOrders.some(
        (order) =>
          order.id === id
      )
    );

  const selectedRequestedIds =
    selectedIds.filter((id) =>
      requestedOrders.some(
        (order) =>
          order.id === id
      )
    );

  const allWaitingSelected =
    waitingOrders.length > 0 &&
    waitingOrders.every(
      (order) =>
        selectedIds.includes(
          order.id
        )
    );

  const allRequestedSelected =
    requestedOrders.length > 0 &&
    requestedOrders.every(
      (order) =>
        selectedIds.includes(
          order.id
        )
    );

  /* =====================================================
     선택 토글
  ===================================================== */

  function toggleSelect(
    orderId: string
  ) {
    if (bulkProcessing) {
      return;
    }

    setSelectedIds(
      (current) =>
        current.includes(orderId)
          ? current.filter(
              (id) =>
                id !== orderId
            )
          : [
              ...current,
              orderId,
            ]
    );
  }

  /* =====================================================
     전체 선택
  ===================================================== */

  function toggleSelectAll() {
    if (bulkProcessing) {
      return;
    }

    /*
     * 현재 필터 기준으로
     * 요청대기 주문과 요청완료 주문을 구분
     */
    const selectableOrders =
      filter === "requested"
        ? requestedOrders
        : filter === "waiting"
        ? waitingOrders
        : filteredOrders;

    if (
      selectableOrders.length ===
      0
    ) {
      return;
    }

    const allSelected =
      selectableOrders.every(
        (order) =>
          selectedIds.includes(
            order.id
          )
      );

    if (allSelected) {
      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              !selectableOrders.some(
                (order) =>
                  order.id === id
              )
          )
      );
    } else {
      setSelectedIds(
        (current) => {
          const ids = new Set(
            current
          );

          selectableOrders.forEach(
            (order) => {
              ids.add(order.id);
            }
          );

          return Array.from(ids);
        }
      );
    }
  }

  /* =====================================================
     전체 선택 상태
  ===================================================== */

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every(
      (order) =>
        selectedIds.includes(
          order.id
        )
    );

  /* =====================================================
     선택 해제
  ===================================================== */

  function clearSelection() {
    if (bulkProcessing) {
      return;
    }

    setSelectedIds([]);
  }

  /* =====================================================
     일괄 출고요청
  ===================================================== */

  async function bulkRequestShipment() {
    const targetIds =
      selectedWaitingIds;

    if (
      targetIds.length === 0
    ) {
      alert(
        "출고요청할 주문을 선택해주세요."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `선택한 ${targetIds.length}건을 출고요청 처리하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    setBulkProcessing(true);
    setError("");

    try {
      const now =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          shipment_requested:
            true,
          shipment_requested_at:
            now,
          updated_at:
            now,
        })
        .in(
          "id",
          targetIds
        )
        .eq(
          "status",
          "확정"
        )
        .eq(
          "shipment_requested",
          false
        );

      console.log(
        "일괄 출고요청 UPDATE 결과:",
        updateError
      );

      if (updateError) {
        setError(
          `일괄 출고요청 실패: ${updateError.message}`
        );

        return;
      }

      /*
       * DB를 다시 조회해서
       * 실제 저장된 값으로 화면 동기화
       */
      await loadData();

      setSelectedIds([]);

      alert(
        `${targetIds.length}건의 출고요청 처리가 완료되었습니다.`
      );
    } catch (err) {
      console.error(
        "일괄 출고요청 오류:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "일괄 출고요청 처리 중 오류가 발생했습니다."
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  /* =====================================================
     일괄 출고요청 취소
  ===================================================== */

  async function bulkCancelShipment() {
    const targetIds =
      selectedRequestedIds;

    if (
      targetIds.length === 0
    ) {
      alert(
        "출고요청을 취소할 주문을 선택해주세요."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `선택한 ${targetIds.length}건의 출고요청을 취소하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    setBulkProcessing(true);
    setError("");

    try {
      const now =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          shipment_requested:
            false,
          shipment_requested_at:
            null,
          updated_at:
            now,
        })
        .in(
          "id",
          targetIds
        )
        .eq(
          "status",
          "확정"
        )
        .eq(
          "shipment_requested",
          true
        );

      console.log(
        "일괄 출고요청 취소 UPDATE 결과:",
        updateError
      );

      if (updateError) {
        setError(
          `일괄 출고요청 취소 실패: ${updateError.message}`
        );

        return;
      }

      await loadData();

      setSelectedIds([]);

      alert(
        `${targetIds.length}건의 출고요청 취소가 완료되었습니다.`
      );
    } catch (err) {
      console.error(
        "일괄 출고요청 취소 오류:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "일괄 출고요청 취소 중 오류가 발생했습니다."
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  /* =====================================================
     개별 출고요청
  ===================================================== */

  async function requestShipment(
    orderId: string
  ) {
    const confirmed =
      window.confirm(
        "이 주문을 출고요청 처리하시겠습니까?"
      );

    if (!confirmed) {
      return;
    }

    setSavingId(orderId);
    setError("");

    const now =
      new Date().toISOString();

    const { error } =
      await supabase
        .from("orders")
        .update({
          shipment_requested:
            true,
          shipment_requested_at:
            now,
          updated_at: now,
        })
        .eq(
          "id",
          orderId
        )
        .eq(
          "status",
          "확정"
        );

    if (error) {
      setError(
        error.message
      );
    } else {
      setOrders(
        (current) =>
          current.map(
            (order) =>
              order.id ===
              orderId
                ? {
                    ...order,
                    shipment_requested:
                      true,
                    shipment_requested_at:
                      now,
                  }
                : order
          )
      );

      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              id !== orderId
          )
      );
    }

    setSavingId(null);
  }

  /* =====================================================
     개별 출고요청 취소
  ===================================================== */

  async function cancelShipmentRequest(
    orderId: string
  ) {
    const confirmed =
      window.confirm(
        "출고요청을 취소하시겠습니까?"
      );

    if (!confirmed) {
      return;
    }

    setSavingId(orderId);
    setError("");

    const now =
      new Date().toISOString();

    const { error } =
      await supabase
        .from("orders")
        .update({
          shipment_requested:
            false,
          shipment_requested_at:
            null,
          updated_at:
            now,
        })
        .eq(
          "id",
          orderId
        )
        .eq(
          "status",
          "확정"
        );

    if (error) {
      setError(
        error.message
      );
    } else {
      setOrders(
        (current) =>
          current.map(
            (order) =>
              order.id ===
              orderId
                ? {
                    ...order,
                    shipment_requested:
                      false,
                    shipment_requested_at:
                      null,
                  }
                : order
          )
      );

      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              id !== orderId
          )
      );
    }

    setSavingId(null);
  }

  /* =====================================================
     SUMMARY COUNT
  ===================================================== */

  const waitingCount =
    orders.filter(
      (order) =>
        !order.shipment_requested
    ).length;

  const requestedCount =
    orders.filter(
      (order) =>
        !!order.shipment_requested
    ).length;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        color: "#111827",
        fontFamily:
          '"Malgun Gothic", "Noto Sans KR", Arial, sans-serif',
        display: "flex",
      }}
    >
      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "#111827",
          color: "#ffffff",
          padding: "28px 18px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding:
              "0 12px 28px",
            borderBottom:
              "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              fontWeight: 700,
              letterSpacing:
                "1.5px",
            }}
          >
            SONGLIM LOGISTICS
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "23px",
              fontWeight: 800,
            }}
          >
            송림물류 OMS
          </div>
        </div>

        <nav
          style={{
            marginTop: "24px",
            display: "flex",
            flexDirection:
              "column",
            gap: "6px",
          }}
        >
          <Menu
            href="/"
            label="대시보드"
            icon="▦"
          />

          <Menu
            href="/customers"
            label="거래처 관리"
            icon="▣"
          />

          <Menu
            href="/products"
            label="상품 관리"
            icon="□"
          />

          <Menu
            href="/collection"
            label="주문 수집"
            icon="↓"
          />

          <Menu
            href="/orders"
            label="주문 관리"
            icon="≡"
          />

          <Menu
            href="/shipment-request"
            label="출고 요청"
            icon="→"
            active
          />
        </nav>
      </aside>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <section
        style={{
          flex: 1,
          minWidth: 0,
          padding:
            "34px 42px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "28px",
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
                margin:
                  "6px 0 0",
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              출고 요청
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              확정 주문의 출고요청 관리
            </p>
          </div>

          <Link
            href="/orders"
            style={{
              padding:
                "12px 18px",
              background:
                "#ffffff",
              border:
                "1px solid #d1d5db",
              borderRadius:
                "9px",
              color:
                "#374151",
              textDecoration:
                "none",
              fontSize:
                "14px",
              fontWeight:
                700,
            }}
          >
            주문 관리
          </Link>
        </header>

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginBottom:
                "20px",
              padding:
                "16px 20px",
              background:
                "#fee2e2",
              border:
                "1px solid #fecaca",
              borderRadius:
                "10px",
              color:
                "#b91c1c",
            }}
          >
            <strong>
              오류
            </strong>

            <div
              style={{
                marginTop:
                  "5px",
                fontSize:
                  "13px",
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* =====================================================
            SUMMARY
        ===================================================== */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap:
              "16px",
            marginBottom:
              "20px",
          }}
        >
          <SummaryCard
            title="확정 주문"
            value={
              orders.length
            }
            description="출고요청 대상"
          />

          <SummaryCard
            title="출고요청 대기"
            value={
              waitingCount
            }
            description="아직 요청하지 않은 주문"
          />

          <SummaryCard
            title="출고요청 완료"
            value={
              requestedCount
            }
            description="WMS 전달 대상"
          />
        </div>

        {/* =====================================================
            FILTER
        ===================================================== */}

        <section
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "14px",
            padding:
              "16px",
            marginBottom:
              "18px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              gap:
                "8px",
              marginBottom:
                "14px",
            }}
          >
            <FilterButton
              active={
                filter ===
                "waiting"
              }
              onClick={() => {
                setFilter(
                  "waiting"
                );
                setSelectedIds([]);
              }}
            >
              요청 대기{" "}
              {waitingCount}
            </FilterButton>

            <FilterButton
              active={
                filter ===
                "requested"
              }
              onClick={() => {
                setFilter(
                  "requested"
                );
                setSelectedIds([]);
              }}
            >
              요청 완료{" "}
              {requestedCount}
            </FilterButton>

            <FilterButton
              active={
                filter ===
                "all"
              }
              onClick={() => {
                setFilter(
                  "all"
                );
                setSelectedIds([]);
              }}
            >
              전체
            </FilterButton>
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(
                e.target.value
              );
            }}
            placeholder="주문번호 또는 거래처 검색"
            style={{
              width:
                "100%",
              height:
                "44px",
              border:
                "1px solid #d1d5db",
              borderRadius:
                "8px",
              padding:
                "0 14px",
              fontSize:
                "14px",
              outline:
                "none",
            }}
          />
        </section>

        {/* =====================================================
            TABLE
        ===================================================== */}

        <section
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "14px",
            overflow:
              "hidden",
          }}
        >
          <div
            style={{
              padding:
                "20px 24px",
              borderBottom:
                "1px solid #e5e7eb",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "18px",
                  fontWeight:
                    800,
                }}
              >
                출고요청 목록
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color:
                    "#64748b",
                  fontSize:
                    "13px",
                }}
              >
                확정된 주문만 표시됩니다.
              </p>
            </div>

            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  "13px",
              }}
            >
              {filteredOrders.length}
              건
            </div>
          </div>

          {/* ===================================================
              BULK TOOLBAR

              기존 화면에 기능만 추가
          =================================================== */}

          <div
            style={{
              padding:
                "12px 24px",
              borderBottom:
                "1px solid #e5e7eb",
              background:
                "#fafafa",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "12px",
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "10px",
              }}
            >
              <button
                type="button"
                onClick={
                  toggleSelectAll
                }
                disabled={
                  bulkProcessing ||
                  filteredOrders.length ===
                    0
                }
                style={{
                  border:
                    "1px solid #d1d5db",
                  background:
                    allFilteredSelected
                      ? "#eff6ff"
                      : "#ffffff",
                  color:
                    allFilteredSelected
                      ? "#2563eb"
                      : "#374151",
                  borderRadius:
                    "7px",
                  padding:
                    "8px 12px",
                  cursor:
                    "pointer",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                }}
              >
                {allFilteredSelected
                  ? "전체 선택 해제"
                  : "전체 선택"}
              </button>

              <span
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "13px",
                }}
              >
                선택{" "}
                <strong
                  style={{
                    color:
                      "#2563eb",
                  }}
                >
                  {selectedIds.length}
                </strong>
                건
              </span>

              {selectedIds.length >
                0 && (
                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  disabled={
                    bulkProcessing
                  }
                  style={{
                    border:
                      "none",
                    background:
                      "transparent",
                    color:
                      "#64748b",
                    cursor:
                      "pointer",
                    fontSize:
                      "12px",
                    fontWeight:
                      700,
                  }}
                >
                  선택 해제
                </button>
              )}
            </div>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
              }}
            >
              <button
                type="button"
                onClick={
                  bulkRequestShipment
                }
                disabled={
                  bulkProcessing ||
                  selectedWaitingIds.length ===
                    0
                }
                style={{
                  border:
                    "none",
                  background:
                    bulkProcessing ||
                    selectedWaitingIds.length ===
                      0
                      ? "#cbd5e1"
                      : "#2563eb",
                  color:
                    "#ffffff",
                  borderRadius:
                    "7px",
                  padding:
                    "9px 14px",
                  cursor:
                    bulkProcessing ||
                    selectedWaitingIds.length ===
                      0
                      ? "default"
                      : "pointer",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                }}
              >
                {bulkProcessing
                  ? "처리중..."
                  : `선택 출고요청${
                      selectedWaitingIds.length >
                      0
                        ? ` ${selectedWaitingIds.length}건`
                        : ""
                    }`}
              </button>

              <button
                type="button"
                onClick={
                  bulkCancelShipment
                }
                disabled={
                  bulkProcessing ||
                  selectedRequestedIds.length ===
                    0
                }
                style={{
                  border:
                    "1px solid #fecaca",
                  background:
                    bulkProcessing ||
                    selectedRequestedIds.length ===
                      0
                      ? "#f3f4f6"
                      : "#ffffff",
                  color:
                    bulkProcessing ||
                    selectedRequestedIds.length ===
                      0
                      ? "#9ca3af"
                      : "#dc2626",
                  borderRadius:
                    "7px",
                  padding:
                    "9px 14px",
                  cursor:
                    bulkProcessing ||
                    selectedRequestedIds.length ===
                      0
                      ? "default"
                      : "pointer",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                }}
              >
                선택 요청취소
                {selectedRequestedIds.length >
                  0
                  ? ` ${selectedRequestedIds.length}건`
                  : ""}
              </button>
            </div>
          </div>

          {loading ? (
            <div
              style={{
                padding:
                  "70px",
                textAlign:
                  "center",
                color:
                  "#94a3b8",
              }}
            >
              데이터를 불러오는 중입니다.
            </div>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width:
                    "100%",
                  borderCollapse:
                    "collapse",
                  minWidth:
                    "1050px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "#f8fafc",
                    }}
                  >
                    {/* 선택 */}

                    <th
                      style={{
                        ...thStyle,
                        width:
                          "50px",
                        textAlign:
                          "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          allFilteredSelected
                        }
                        onChange={
                          toggleSelectAll
                        }
                        disabled={
                          filteredOrders.length ===
                            0 ||
                          bulkProcessing
                        }
                      />
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      주문번호
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      주문일
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      거래처
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      채널
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      주문수량
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      확정일
                    </th>

                    <th
                      style={
                        thStyle
                      }
                    >
                      출고요청
                    </th>

                    <th
                      style={{
                        ...thStyle,
                        textAlign:
                          "center",
                      }}
                    >
                      관리
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

                      const quantity =
                        quantityMap.get(
                          order.id
                        ) || 0;

                      const selected =
                        selectedIds.includes(
                          order.id
                        );

                      const saving =
                        savingId ===
                        order.id;

                      return (
                        <tr
                          key={
                            order.id
                          }
                        >
                          {/* 선택 */}

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                selected
                              }
                              onChange={() =>
                                toggleSelect(
                                  order.id
                                )
                              }
                              disabled={
                                bulkProcessing ||
                                saving
                              }
                            />
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {order.order_no ||
                              "-"}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatDate(
                              order.order_date
                            )}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              fontWeight:
                                700,
                            }}
                          >
                            {customer?.name ||
                              "-"}
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
                            style={{
                              ...tdStyle,
                              textAlign:
                                "right",
                              fontWeight:
                                700,
                            }}
                          >
                            {quantity.toLocaleString()}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {formatDateTime(
                              order.confirmed_at
                            )}
                          </td>

                          <td
                            style={
                              tdStyle
                            }
                          >
                            {order.shipment_requested ? (
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "6px 11px",
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
                                  display:
                                    "inline-block",
                                  padding:
                                    "6px 11px",
                                  borderRadius:
                                    "999px",
                                  background:
                                    "#fef3c7",
                                  color:
                                    "#b45309",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                요청대기
                              </span>
                            )}
                          </td>

                          <td
                            style={{
                              ...tdStyle,
                              textAlign:
                                "center",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                gap:
                                  "6px",
                                justifyContent:
                                  "center",
                              }}
                            >
                              <Link
                                href={`/orders/${order.id}`}
                                style={{
                                  padding:
                                    "7px 10px",
                                  border:
                                    "1px solid #d1d5db",
                                  borderRadius:
                                    "7px",
                                  color:
                                    "#374151",
                                  textDecoration:
                                    "none",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    700,
                                }}
                              >
                                상세
                              </Link>

                              {order.shipment_requested ? (
                                <button
                                  type="button"
                                  disabled={
                                    saving ||
                                    bulkProcessing
                                  }
                                  onClick={() =>
                                    cancelShipmentRequest(
                                      order.id
                                    )
                                  }
                                  style={{
                                    padding:
                                      "7px 10px",
                                    border:
                                      "1px solid #fecaca",
                                    background:
                                      "#fff",
                                    borderRadius:
                                      "7px",
                                    color:
                                      "#dc2626",
                                    cursor:
                                      "pointer",
                                    fontSize:
                                      "12px",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {saving
                                    ? "처리중..."
                                    : "요청취소"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={
                                    saving ||
                                    bulkProcessing
                                  }
                                  onClick={() =>
                                    requestShipment(
                                      order.id
                                    )
                                  }
                                  style={{
                                    padding:
                                      "7px 10px",
                                    border:
                                      "none",
                                    background:
                                      "#2563eb",
                                    borderRadius:
                                      "7px",
                                    color:
                                      "#fff",
                                    cursor:
                                      "pointer",
                                    fontSize:
                                      "12px",
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {saving
                                    ? "처리중..."
                                    : "출고요청"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}

                  {filteredOrders.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding:
                            "70px",
                          textAlign:
                            "center",
                          color:
                            "#94a3b8",
                        }}
                      >
                        출고요청 대상 주문이 없습니다.
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
   COMPONENTS
========================================================= */

function Menu({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display:
          "flex",
        alignItems:
          "center",
        gap:
          "13px",
        padding:
          "13px 14px",
        borderRadius:
          "10px",
        color:
          active
            ? "#ffffff"
            : "#cbd5e1",
        background:
          active
            ? "#2563eb"
            : "transparent",
        textDecoration:
          "none",
        fontSize:
          "15px",
        fontWeight:
          active
            ? 700
            : 500,
      }}
    >
      <span
        style={{
          width:
            "20px",
          textAlign:
            "center",
        }}
      >
        {icon}
      </span>

      {label}
    </Link>
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
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e5e7eb",
        borderRadius:
          "14px",
        padding:
          "22px",
      }}
    >
      <div
        style={{
          color:
            "#64748b",
          fontSize:
            "13px",
          fontWeight:
            700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop:
            "9px",
          fontSize:
            "30px",
          fontWeight:
            800,
        }}
      >
        {value.toLocaleString()}
      </div>

      <div
        style={{
          marginTop:
            "4px",
          color:
            "#94a3b8",
          fontSize:
            "12px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border:
          "none",
        borderRadius:
          "8px",
        padding:
          "10px 16px",
        background:
          active
            ? "#2563eb"
            : "#f1f5f9",
        color:
          active
            ? "#ffffff"
            : "#475569",
        cursor:
          "pointer",
        fontWeight:
          700,
      }}
    >
      {children}
    </button>
  );
}

/* =========================================================
   FUNCTIONS
========================================================= */

function getChannelName(
  channel:
    | string
    | null
) {
  const channels: Record<
    string,
    string
  > = {
    oliveyoung:
      "올리브영",
    daiso:
      "다이소",
    convenience:
      "편의점",
    discount:
      "할인점",
    supermarket:
      "대형마트",
    online:
      "온라인",
  };

  return channel
    ? channels[
        channel
      ] || channel
    : "-";
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "ko-KR"
  );
}

function formatDateTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleString(
    "ko-KR",
    {
      year:
        "numeric",
      month:
        "2-digit",
      day:
        "2-digit",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  );
}

/* =========================================================
   STYLE
========================================================= */

const thStyle = {
  padding:
    "14px 16px",
  textAlign:
    "left" as const,
  fontSize:
    "13px",
  color:
    "#64748b",
  fontWeight:
    700,
  borderBottom:
    "1px solid #e5e7eb",
};

const tdStyle = {
  padding:
    "15px 16px",
  fontSize:
    "13px",
  borderBottom:
    "1px solid #f1f5f9",
};