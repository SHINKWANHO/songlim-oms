"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  code: string;
  name: string;
};

type SalesChannel = {
  id: string;
  customer_id: string;
  code: string;
  name: string;
};

type Store = {
  id: string;
  customer_id: string;
  sales_channel_id: string;
  code: string;
  name: string;
};

type Order = {
  id: string;
  customer_id: string;
  sales_channel_id: string;
  store_id: string;
  order_number: string;
  source_order_number: string | null;
  order_date: string;
  delivery_date: string | null;
  status: string;
  total_qty: number;
  total_amount: number;
  wms_sync_status: string | null;
};

const STATUS_LIST = [
  "수집완료",
  "검토중",
  "출고대기",
  "출고중",
  "출고완료",
  "배송완료",
  "취소",
];

export default function OrderList() {
  const supabase = createClient();

  /*
   * =====================================================
   * 기본 데이터
   * =====================================================
   */

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [channels, setChannels] =
    useState<SalesChannel[]>([]);

  const [stores, setStores] =
    useState<Store[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(false);

  /*
   * =====================================================
   * 검색조건
   * =====================================================
   */

  const [searchCustomer, setSearchCustomer] =
    useState("");

  const [searchChannel, setSearchChannel] =
    useState("");

  const [searchStore, setSearchStore] =
    useState("");

  const [searchOrderDate, setSearchOrderDate] =
    useState("");

  const [searchStatus, setSearchStatus] =
    useState("");

  /*
   * =====================================================
   * 초기화
   * =====================================================
   */

  useEffect(() => {
    loadMasterData();
    loadOrders();
  }, []);

  /*
   * =====================================================
   * 화주 / 판매채널 / 배송처
   * =====================================================
   */

  async function loadMasterData() {
    const [
      customerResult,
      channelResult,
      storeResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select(`
          id,
          code,
          name
        `)
        .eq("active", true)
        .order("name"),

      supabase
        .from("delivery_targets")
        .select(`
          id,
          customer_id,
          code,
          name
        `)
        .eq("active", true)
        .order("name"),

      supabase
        .from("stores")
        .select(`
          id,
          customer_id,
          sales_channel_id,
          code,
          name
        `)
        .eq("active", true)
        .order("name"),
    ]);

    if (customerResult.error) {
      console.error(
        "CUSTOMER LOAD ERROR",
        customerResult.error
      );
    }

    if (channelResult.error) {
      console.error(
        "CHANNEL LOAD ERROR",
        channelResult.error
      );
    }

    if (storeResult.error) {
      console.error(
        "STORE LOAD ERROR",
        storeResult.error
      );
    }

    setCustomers(
      customerResult.data ?? []
    );

    setChannels(
      channelResult.data ?? []
    );

    setStores(
      storeResult.data ?? []
    );
  }

  /*
   * =====================================================
   * 주문 조회
   * =====================================================
   */

  async function loadOrders() {
    setLoading(true);

    let query = supabase
      .from("orders")
      .select(`
        id,
        customer_id,
        sales_channel_id,
        store_id,
        order_number,
        source_order_number,
        order_date,
        delivery_date,
        status,
        total_qty,
        total_amount,
        wms_sync_status
      `)
      .order(
        "order_date",
        {
          ascending: false,
        }
      );

    /*
     * 화주
     */

    if (searchCustomer) {
      query = query.eq(
        "customer_id",
        searchCustomer
      );
    }

    /*
     * 판매채널
     */

    if (searchChannel) {
      query = query.eq(
        "sales_channel_id",
        searchChannel
      );
    }

    /*
     * 배송처
     */

    if (searchStore) {
      query = query.eq(
        "store_id",
        searchStore
      );
    }

    /*
     * 주문일
     */

    if (searchOrderDate) {
      query = query.eq(
        "order_date",
        searchOrderDate
      );
    }

    /*
     * 주문상태
     */

    if (searchStatus) {
      query = query.eq(
        "status",
        searchStatus
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "ORDER LOAD ERROR",
        error
      );

      alert(
        `주문 조회 오류\n${error.message}`
      );

      setOrders([]);
    } else {
      setOrders(
        data ?? []
      );
    }

    setLoading(false);
  }

  /*
   * =====================================================
   * 검색
   * =====================================================
   */

  function handleSearch() {
    loadOrders();
  }

  /*
   * =====================================================
   * 검색조건 초기화
   * =====================================================
   */

  function handleReset() {
    setSearchCustomer("");
    setSearchChannel("");
    setSearchStore("");
    setSearchOrderDate("");
    setSearchStatus("");

    setTimeout(() => {
      loadOrders();
    }, 0);
  }

  /*
   * =====================================================
   * 화주 변경
   * =====================================================
   */

  function handleCustomerChange(
    value: string
  ) {
    setSearchCustomer(value);

    setSearchChannel("");
    setSearchStore("");
  }

  /*
   * =====================================================
   * 판매채널 변경
   * =====================================================
   */

  function handleChannelChange(
    value: string
  ) {
    setSearchChannel(value);
    setSearchStore("");
  }

  /*
   * =====================================================
   * 판매채널 필터
   * =====================================================
   */

  const customerChannels =
    channels.filter(
      (channel) =>
        !searchCustomer ||
        channel.customer_id ===
          searchCustomer
    );

  /*
   * =====================================================
   * 배송처 필터
   * =====================================================
   */

  const channelStores =
    stores.filter(
      (store) =>
        (!searchCustomer ||
          store.customer_id ===
            searchCustomer) &&
        (!searchChannel ||
          store.sales_channel_id ===
            searchChannel)
    );

  /*
   * =====================================================
   * 표시용 이름
   * =====================================================
   */

  function getCustomerName(
    id: string
  ) {
    return (
      customers.find(
        (item) =>
          item.id === id
      )?.name ?? "-"
    );
  }

  function getChannelName(
    id: string
  ) {
    return (
      channels.find(
        (item) =>
          item.id === id
      )?.name ?? "-"
    );
  }

  function getStoreName(
    id: string
  ) {
    return (
      stores.find(
        (item) =>
          item.id === id
      )?.name ?? "-"
    );
  }

  /*
   * =====================================================
   * 화면
   * =====================================================
   */

  return (
    <div>

      {/* =================================================
          검색
      ================================================= */}

      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "25px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "21px",
              color: "#111827",
            }}
          >
            주문조회
          </h2>

          <div
            style={{
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            총 {orders.length.toLocaleString()}건
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(5, 1fr)",
            gap: "12px",
          }}
        >

          {/* 화주 */}

          <Field label="화주">
            <select
              value={searchCustomer}
              onChange={(e) =>
                handleCustomerChange(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                전체 화주
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

          {/* 판매채널 */}

          <Field label="판매채널">
            <select
              value={searchChannel}
              onChange={(e) =>
                handleChannelChange(
                  e.target.value
                )
              }
              style={inputStyle}
              disabled={
                !searchCustomer
              }
            >
              <option value="">
                전체 판매채널
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

          {/* 배송처 */}

          <Field label="배송처">
            <select
              value={searchStore}
              onChange={(e) =>
                setSearchStore(
                  e.target.value
                )
              }
              style={inputStyle}
              disabled={
                !searchChannel
              }
            >
              <option value="">
                전체 배송처
              </option>

              {channelStores.map(
                (store) => (
                  <option
                    key={
                      store.id
                    }
                    value={
                      store.id
                    }
                  >
                    {store.name}
                  </option>
                )
              )}
            </select>
          </Field>

          {/* 주문일 */}

          <Field label="주문일">
            <input
              type="date"
              value={
                searchOrderDate
              }
              onChange={(e) =>
                setSearchOrderDate(
                  e.target.value
                )
              }
              style={inputStyle}
            />
          </Field>

          {/* 상태 */}

          <Field label="주문상태">
            <select
              value={searchStatus}
              onChange={(e) =>
                setSearchStatus(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                전체 상태
              </option>

              {STATUS_LIST.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>

        {/* 검색버튼 */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={
              resetButtonStyle
            }
          >
            초기화
          </button>

          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            style={
              searchButtonStyle
            }
          >
            {loading
              ? "조회 중..."
              : "검색"}
          </button>
        </div>
      </div>

      {/* =================================================
          주문목록
      ================================================= */}

      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #e5e7eb",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >

        <div
          style={{
            padding:
              "18px 22px",
            borderBottom:
              "1px solid #e5e7eb",
            fontSize: "17px",
            fontWeight: 700,
          }}
        >
          주문 목록
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
              minWidth:
                "1300px",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f8fafc",
                }}
              >
                <th style={thStyle}>
                  주문번호
                </th>

                <th style={thStyle}>
                  화주
                </th>

                <th style={thStyle}>
                  판매채널
                </th>

                <th style={thStyle}>
                  배송처
                </th>

                <th style={thStyle}>
                  주문일
                </th>

                <th style={thStyle}>
                  배송일
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
                  금액
                </th>

                <th style={thStyle}>
                  주문상태
                </th>

                <th style={thStyle}>
                  WMS
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (order) => (
                  <tr
                    key={
                      order.id
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
                      <strong>
                        {
                          order.order_number
                        }
                      </strong>
                    </td>

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        getCustomerName(
                          order.customer_id
                        )
                      }
                    </td>

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        getChannelName(
                          order.sales_channel_id
                        )
                      }
                    </td>

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        getStoreName(
                          order.store_id
                        )
                      }
                    </td>

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        order.order_date
                      }
                    </td>

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        order.delivery_date ??
                        "-"
                      }
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      {(
                        order.total_qty ??
                        0
                      ).toLocaleString()}
                    </td>

                    <td
                      style={{
                        ...tdStyle,
                        textAlign:
                          "right",
                      }}
                    >
                      {(
                        order.total_amount ??
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
                          order.status
                        }
                      />
                    </td>

                    <td
                      style={
                        tdStyle
                      }
                    >
                      {
                        order.wms_sync_status ??
                        "-"
                      }
                    </td>
                  </tr>
                )
              )}

              {orders.length ===
                0 && (
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
                    조회된 주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/*
 * =====================================================
 * FIELD
 * =====================================================
 */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom:
            "7px",
          fontSize: "13px",
          fontWeight: 700,
          color: "#374151",
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

/*
 * =====================================================
 * STATUS
 * =====================================================
 */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let background =
    "#f1f5f9";

  let color =
    "#475569";

  if (
    status ===
    "수집완료"
  ) {
    background =
      "#dbeafe";
    color =
      "#1d4ed8";
  }

  if (
    status ===
    "출고대기"
  ) {
    background =
      "#fef3c7";
    color =
      "#92400e";
  }

  if (
    status ===
    "출고완료"
  ) {
    background =
      "#dcfce7";
    color =
      "#166534";
  }

  if (
    status ===
    "배송완료"
  ) {
    background =
      "#d1fae5";
    color =
      "#047857";
  }

  if (
    status ===
    "취소"
  ) {
    background =
      "#fee2e2";
    color =
      "#b91c1c";
  }

  return (
    <span
      style={{
        display:
          "inline-block",
        padding:
          "5px 9px",
        borderRadius:
          "999px",
        background,
        color,
        fontSize:
          "12px",
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}

/*
 * =====================================================
 * STYLE
 * =====================================================
 */

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "43px",
  boxSizing:
    "border-box",
  padding:
    "9px 11px",
  border:
    "1px solid #d1d5db",
  borderRadius:
    "8px",
  background:
    "#ffffff",
  color:
    "#111827",
  fontSize:
    "14px",
};

const thStyle: React.CSSProperties = {
  padding:
    "13px 14px",
  textAlign:
    "left",
  fontSize:
    "13px",
  fontWeight: 700,
  color:
    "#475569",
  whiteSpace:
    "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding:
    "13px 14px",
  fontSize:
    "14px",
  color:
    "#334155",
  whiteSpace:
    "nowrap",
};

const searchButtonStyle: React.CSSProperties = {
  border:
    "none",
  borderRadius:
    "8px",
  padding:
    "11px 25px",
  background:
    "#2563eb",
  color:
    "#ffffff",
  fontSize:
    "14px",
  fontWeight: 700,
  cursor:
    "pointer",
};

const resetButtonStyle: React.CSSProperties = {
  border:
    "1px solid #d1d5db",
  borderRadius:
    "8px",
  padding:
    "11px 20px",
  background:
    "#ffffff",
  color:
    "#374151",
  fontSize:
    "14px",
  fontWeight: 700,
  cursor:
    "pointer",
};