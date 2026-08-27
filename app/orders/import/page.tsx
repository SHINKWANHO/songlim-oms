"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPE
========================================================= */

type Order = {
  id: string;
  status: string | null;
  confirmed_at: string | null;
  shipment_requested: boolean | null;
  shipment_requested_at: string | null;
  created_at: string | null;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function OrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* =======================================================
     주문 조회
  ======================================================= */

  async function loadOrders() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          confirmed_at,
          shipment_requested,
          shipment_requested_at,
          created_at
          `
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error("ORDERS LOAD ERROR:", error);

        setOrders([]);
        setErrorMessage(
          `주문 조회 실패: ${error.message}`
        );

        return;
      }

      const loadedOrders = (data as Order[]) || [];

      console.log(
        "주문 조회 완료:",
        loadedOrders
      );

      setOrders(loadedOrders);

      /*
       * 현재 DB에 이미 접수된 주문이 선택목록에
       * 남아 있을 경우 제거
       */
      setSelectedIds((prev) =>
        prev.filter((id) => {
          const order = loadedOrders.find(
            (item) => item.id === id
          );

          return order?.status !== "접수";
        })
      );
    } catch (error) {
      console.error(
        "ORDERS LOAD EXCEPTION:",
        error
      );

      setOrders([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "주문을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     최초 실행
  ======================================================= */

  useEffect(() => {
    void loadOrders();
  }, []);

  /* =======================================================
     신규 주문
  ======================================================= */

  const newOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        !order.status ||
        order.status === "신규"
    );
  }, [orders]);

  /* =======================================================
     통계
  ======================================================= */

  const totalCount = orders.length;

  const newCount = orders.filter(
    (order) =>
      !order.status ||
      order.status === "신규"
  ).length;

  const confirmedCount = orders.filter(
    (order) =>
      order.status === "접수"
  ).length;

  const shipmentRequestedCount =
    orders.filter(
      (order) =>
        order.shipment_requested === true
    ).length;

  /* =======================================================
     전체 선택
  ======================================================= */

  function handleSelectAll(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    if (e.target.checked) {
      const ids = newOrders.map(
        (order) => order.id
      );

      setSelectedIds(ids);
    } else {
      setSelectedIds([]);
    }
  }

  /* =======================================================
     개별 선택
  ======================================================= */

  function handleSelect(
    orderId: string,
    checked: boolean
  ) {
    if (checked) {
      setSelectedIds((prev) => {
        if (prev.includes(orderId)) {
          return prev;
        }

        return [
          ...prev,
          orderId,
        ];
      });
    } else {
      setSelectedIds((prev) =>
        prev.filter(
          (id) => id !== orderId
        )
      );
    }
  }

  /* =======================================================
     접수처리
  ======================================================= */

  async function handleConfirmOrders() {
    setMessage("");
    setErrorMessage("");

    if (processing) {
      return;
    }

    if (selectedIds.length === 0) {
      alert("접수할 주문을 선택하세요.");
      return;
    }

    /*
     * 현재 화면의 주문 중 선택된 주문 확인
     */
    const selectedOrders =
      orders.filter((order) =>
        selectedIds.includes(order.id)
      );

    if (
      selectedOrders.length !==
      selectedIds.length
    ) {
      alert(
        "선택한 주문 정보를 다시 확인해주세요."
      );

      return;
    }

    /*
     * 이미 접수된 주문이 섞여 있는지 확인
     */
    const alreadyConfirmed =
      selectedOrders.filter(
        (order) =>
          order.status === "접수"
      );

    if (alreadyConfirmed.length > 0) {
      alert(
        "이미 접수된 주문이 포함되어 있습니다."
      );

      /*
       * 최신 DB 상태 다시 조회
       */
      await loadOrders();

      return;
    }

    /*
     * 신규 주문인지 확인
     */
    const invalidOrders =
      selectedOrders.filter(
        (order) =>
          order.status &&
          order.status !== "신규"
      );

    if (invalidOrders.length > 0) {
      alert(
        "신규 상태의 주문만 접수처리할 수 있습니다."
      );

      await loadOrders();

      return;
    }

    const confirmResult =
      window.confirm(
        `선택한 ${selectedIds.length.toLocaleString()}건의 주문을 접수처리하시겠습니까?`
      );

    if (!confirmResult) {
      return;
    }

    setProcessing(true);

    try {
      const confirmedAt =
        new Date().toISOString();

      console.log(
        "접수처리 시작:",
        {
          orderIds: selectedIds,
          count: selectedIds.length,
          confirmedAt,
        }
      );

      /*
       * ===================================================
       * 핵심 UPDATE
       *
       * status
       *   신규 → 접수
       *
       * confirmed_at
       *   접수처리 시간 저장
       * ===================================================
       */

      const {
        data: updatedOrders,
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          status: "접수",
          confirmed_at: confirmedAt,
        })
        .in("id", selectedIds)
        .select(
          `
          id,
          status,
          confirmed_at,
          shipment_requested,
          shipment_requested_at,
          created_at
          `
        );

      console.log(
        "접수처리 UPDATE 결과:",
        updatedOrders,
        updateError
      );

      if (updateError) {
        throw new Error(
          `접수처리 실패: ${updateError.message}`
        );
      }

      /*
       * UPDATE 결과가 없는 경우
       */
      if (
        !updatedOrders ||
        updatedOrders.length === 0
      ) {
        throw new Error(
          "접수처리된 주문이 없습니다. RLS 정책 또는 주문 ID를 확인해주세요."
        );
      }

      /*
       * 실제 DB에 저장된 결과 확인
       */
      const updatedIds =
        updatedOrders.map(
          (order) => order.id
        );

      console.log(
        "접수처리 완료 ID:",
        updatedIds
      );

      /*
       * ===================================================
       * DB 재조회
       * ===================================================
       */

      const {
        data: refreshedOrders,
        error: refreshError,
      } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          confirmed_at,
          shipment_requested,
          shipment_requested_at,
          created_at
          `
        )
        .in("id", selectedIds);

      console.log(
        "접수처리 후 DB 재조회:",
        refreshedOrders,
        refreshError
      );

      if (refreshError) {
        throw new Error(
          `접수처리 후 주문 재조회 실패: ${refreshError.message}`
        );
      }

      /*
       * 실제 DB에 접수 상태가 저장됐는지 검증
       */
      const failedOrders =
        (refreshedOrders || []).filter(
          (order) =>
            order.status !== "접수"
        );

      if (failedOrders.length > 0) {
        throw new Error(
          `${failedOrders.length}건의 주문이 접수 상태로 저장되지 않았습니다.`
        );
      }

      /*
       * ===================================================
       * 성공
       * ===================================================
       */

      setMessage(
        `${updatedOrders.length.toLocaleString()}건의 주문이 접수처리되었습니다.`
      );

      setSelectedIds([]);

      /*
       * 전체 주문 최신 상태 재조회
       */
      await loadOrders();

      console.log(
        "접수처리 최종 완료:",
        updatedOrders
      );
    } catch (error) {
      console.error(
        "ORDER CONFIRM ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "접수처리 중 오류가 발생했습니다."
      );
    } finally {
      setProcessing(false);
    }
  }

  /* =======================================================
     상태 표시
  ======================================================= */

  function getStatusLabel(
    status: string | null
  ) {
    switch (status) {
      case "접수":
        return "접수";

      case "확인":
        return "확인";

      case "확정":
        return "확정";

      case "취소":
        return "취소";

      case "신규":
        return "신규";

      default:
        return status || "신규";
    }
  }

  /* =======================================================
     상태 STYLE
  ======================================================= */

  function getStatusStyle(
    status: string | null
  ): React.CSSProperties {
    switch (status) {
      case "접수":
        return {
          background: "#dcfce7",
          color: "#166534",
        };

      case "확인":
        return {
          background: "#dbeafe",
          color: "#1d4ed8",
        };

      case "확정":
        return {
          background: "#e0e7ff",
          color: "#3730a3",
        };

      case "취소":
        return {
          background: "#fee2e2",
          color: "#b91c1c",
        };

      case "신규":
      default:
        return {
          background: "#f1f5f9",
          color: "#475569",
        };
    }
  }

  /* =======================================================
     날짜 표시
  ======================================================= */

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return date.toLocaleString(
      "ko-KR"
    );
  }

  /* =======================================================
     전체 선택 여부
  ======================================================= */

  const allNewSelected =
    newOrders.length > 0 &&
    selectedIds.length ===
      newOrders.length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        background: "#f8fafc",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

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
          주문관리
        </h1>

        <p
          style={{
            marginTop: "8px",
            marginBottom: 0,
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          수집된 주문을 확인하고
          접수처리합니다.
        </p>
      </div>

      {/* =====================================================
          STAT
      ===================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "25px",
        }}
      >
        <StatCard
          title="전체 주문"
          value={totalCount}
        />

        <StatCard
          title="신규 주문"
          value={newCount}
        />

        <StatCard
          title="접수완료"
          value={confirmedCount}
        />

        <StatCard
          title="출고요청"
          value={
            shipmentRequestedCount
          }
        />
      </div>

      {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

      {message && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "8px",
            background: "#dcfce7",
            color: "#166534",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      )}

      {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

      {errorMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#b91c1c",
            fontWeight: 700,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* =====================================================
          ORDER LIST
      ===================================================== */}

      <section
        style={{
          background: "#ffffff",
          border:
            "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "25px",
        }}
      >
        {/* ===================================================
            TOOLBAR
        =================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
                color: "#111827",
              }}
            >
              주문목록
            </h2>

            <p
              style={{
                margin:
                  "6px 0 0",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              신규 주문을 선택하여
              접수처리할 수 있습니다.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {/* 선택 건수 */}

            {selectedIds.length >
              0 && (
              <div
                style={{
                  padding:
                    "10px 14px",
                  borderRadius:
                    "8px",
                  background:
                    "#eff6ff",
                  color:
                    "#1d4ed8",
                  fontSize:
                    "13px",
                  fontWeight:
                    700,
                }}
              >
                선택{" "}
                {selectedIds.length.toLocaleString()}
                건
              </div>
            )}

            {/* 새로고침 */}

            <button
              type="button"
              onClick={() =>
                void loadOrders()
              }
              disabled={
                loading ||
                processing
              }
              style={{
                ...secondaryButtonStyle,
                opacity:
                  loading ||
                  processing
                    ? 0.5
                    : 1,
              }}
            >
              새로고침
            </button>

            {/* 접수처리 */}

            <button
              type="button"
              onClick={
                handleConfirmOrders
              }
              disabled={
                processing ||
                selectedIds.length ===
                  0
              }
              style={{
                ...primaryButtonStyle,
                opacity:
                  processing ||
                  selectedIds.length ===
                    0
                    ? 0.5
                    : 1,
              }}
            >
              {processing
                ? "접수처리 중..."
                : `선택 주문 접수처리${
                    selectedIds.length >
                    0
                      ? ` (${selectedIds.length})`
                      : ""
                  }`}
            </button>
          </div>
        </div>

        {/* ===================================================
            TABLE
        =================================================== */}

        <div
          style={{
            overflowX: "auto",
            border:
              "1px solid #e5e7eb",
            borderRadius: "10px",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "1050px",
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
                {/* 선택 */}

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
                      allNewSelected
                    }
                    onChange={
                      handleSelectAll
                    }
                    disabled={
                      newOrders.length ===
                        0 ||
                      processing
                    }
                  />
                </th>

                {/* 주문번호 */}

                <th style={thStyle}>
                  주문번호
                </th>

                {/* 주문상태 */}

                <th style={thStyle}>
                  주문상태
                </th>

                {/* 접수일시 */}

                <th style={thStyle}>
                  접수일시
                </th>

                {/* 출고요청 */}

                <th style={thStyle}>
                  출고요청
                </th>

                {/* 출고요청일시 */}

                <th style={thStyle}>
                  출고요청일시
                </th>

                {/* 주문일시 */}

                <th style={thStyle}>
                  주문일시
                </th>
              </tr>
            </thead>

            <tbody>
              {/* =================================================
                  LOADING
              ================================================= */}

              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={
                      emptyStyle
                    }
                  >
                    주문을 불러오는
                    중입니다.
                  </td>
                </tr>
              ) : orders.length ===
                0 ? (
                /* ===============================================
                   EMPTY
                =============================================== */

                <tr>
                  <td
                    colSpan={7}
                    style={
                      emptyStyle
                    }
                  >
                    등록된 주문이
                    없습니다.
                  </td>
                </tr>
              ) : (
                /* ===============================================
                   DATA
                =============================================== */

                orders.map(
                  (order) => {
                    const isConfirmed =
                      order.status ===
                      "접수";

                    const isNew =
                      !order.status ||
                      order.status ===
                        "신규";

                    const isSelected =
                      selectedIds.includes(
                        order.id
                      );

                    return (
                      <tr
                        key={
                          order.id
                        }
                        style={{
                          borderTop:
                            "1px solid #f1f5f9",
                          background:
                            isSelected
                              ? "#f8fbff"
                              : "#ffffff",
                        }}
                      >
                        {/* ===================================
                            CHECKBOX
                        =================================== */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "center",
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={
                              !isNew ||
                              isConfirmed ||
                              processing
                            }
                            checked={
                              isSelected
                            }
                            onChange={(
                              e
                            ) =>
                              handleSelect(
                                order.id,
                                e
                                  .target
                                  .checked
                              )
                            }
                          />
                        </td>

                        {/* ===================================
                            주문번호
                        =================================== */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <strong
                            style={{
                              color:
                                "#111827",
                            }}
                          >
                            {order.id}
                          </strong>
                        </td>

                        {/* ===================================
                            주문상태
                        =================================== */}

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
                              fontSize:
                                "12px",
                              fontWeight:
                                700,
                              ...getStatusStyle(
                                order.status
                              ),
                            }}
                          >
                            {getStatusLabel(
                              order.status
                            )}
                          </span>
                        </td>

                        {/* ===================================
                            접수일시
                        =================================== */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {order.confirmed_at
                            ? formatDate(
                                order.confirmed_at
                              )
                            : "-"}
                        </td>

                        {/* ===================================
                            출고요청
                        =================================== */}

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
                                  "5px 10px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#dbeafe",
                                color:
                                  "#1d4ed8",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  700,
                              }}
                            >
                              요청완료
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* ===================================
                            출고요청일시
                        =================================== */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {order.shipment_requested_at
                            ? formatDate(
                                order.shipment_requested_at
                              )
                            : "-"}
                        </td>

                        {/* ===================================
                            주문일시
                        =================================== */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {formatDate(
                            order.created_at
                          )}
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
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border:
          "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#64748b",
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "8px",
          fontSize: "28px",
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

/* =========================================================
   TABLE HEADER STYLE
========================================================= */

const thStyle: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

/* =========================================================
   TABLE DATA STYLE
========================================================= */

const tdStyle: React.CSSProperties = {
  padding: "14px",
  fontSize: "14px",
  color: "#334155",
  whiteSpace: "nowrap",
};

/* =========================================================
   EMPTY STYLE
========================================================= */

const emptyStyle: React.CSSProperties = {
  padding: "70px 20px",
  textAlign: "center",
  color: "#94a3b8",
  fontSize: "14px",
};

/* =========================================================
   PRIMARY BUTTON
========================================================= */

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "8px",
  padding: "12px 20px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

/* =========================================================
   SECONDARY BUTTON
========================================================= */

const secondaryButtonStyle: React.CSSProperties = {
  border:
    "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "11px 18px",
  background: "#ffffff",
  color: "#374151",
  fontWeight: 700,
  cursor: "pointer",
};