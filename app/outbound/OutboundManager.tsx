"use client";

import { useEffect, useMemo, useState } from "react";
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
  group_id: string | null;
};

type Store = {
  id: string;
  customer_id: string;
  code: string;
  name: string;
  address: string | null;
};

type Order = {
  id: string;
  customer_id: string;
  store_id: string;
  sales_channel_id: string | null;
  order_number: string;
  source_order_number: string | null;
  order_date: string;
  delivery_date: string | null;
  status: string;
  total_qty: number;
  total_amount: number;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  customer_product_id: string | null;
  customer_product_code: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  line_amount: number | null;
};

type Product = {
  id: string;
  product_code: string;
  name: string;
};

type Outbound = {
  id: string;
  order_id: string;
  customer_id: string;
  store_id: string;
  outbound_number: string;
  outbound_date: string;
  status: string;
  total_qty: number;
  created_at: string;
};

type OutboundItem = {
  id: string;
  outbound_id: string;
  product_id: string;
  order_qty: number;
  allocated_qty: number;
  picked_qty: number;
  inspected_qty: number;
  shipped_qty: number;
};

const STATUS_OPTIONS = [
  "출고대기",
  "피킹중",
  "검수중",
  "출고완료",
];

export default function OutboundManager() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [outbounds, setOutbounds] = useState<Outbound[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  /*
   * =====================================================
   * 검색
   * =====================================================
   */

  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchChannel, setSearchChannel] = useState("");
  const [searchStore, setSearchStore] = useState("");
  const [searchOrderDate, setSearchOrderDate] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  /*
   * =====================================================
   * 선택 주문
   * =====================================================
   */

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [selectedOrderItems, setSelectedOrderItems] =
    useState<OrderItem[]>([]);

  const [selectedOutbound, setSelectedOutbound] =
    useState<Outbound | null>(null);

  const [selectedOutboundItems, setSelectedOutboundItems] =
    useState<OutboundItem[]>([]);

  /*
   * =====================================================
   * 초기 데이터
   * =====================================================
   */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    try {
      const [
        customerResult,
        channelResult,
        storeResult,
        orderResult,
        productResult,
        outboundResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id, code, name")
          .eq("active", true)
          .order("name"),

        supabase
          .from("delivery_targets")
          .select(
            "id, customer_id, code, name, group_id"
          )
          .eq("active", true)
          .order("name"),

        supabase
          .from("stores")
          .select(
            "id, customer_id, code, name, address"
          )
          .eq("active", true)
          .order("name"),

        supabase
          .from("orders")
          .select(`
            id,
            customer_id,
            store_id,
            sales_channel_id,
            order_number,
            source_order_number,
            order_date,
            delivery_date,
            status,
            total_qty,
            total_amount
          `)
          .order("order_date", {
            ascending: false,
          }),

        supabase
          .from("products")
          .select(
            "id, product_code, name"
          )
          .eq("active", true)
          .order("name"),

        supabase
          .from("outbounds")
          .select(`
            id,
            order_id,
            customer_id,
            store_id,
            outbound_number,
            outbound_date,
            status,
            total_qty,
            created_at
          `)
          .order("created_at", {
            ascending: false,
          }),
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

      if (orderResult.error) {
        console.error(
          "ORDER LOAD ERROR",
          orderResult.error
        );
      }

      if (productResult.error) {
        console.error(
          "PRODUCT LOAD ERROR",
          productResult.error
        );
      }

      if (outboundResult.error) {
        console.error(
          "OUTBOUND LOAD ERROR",
          outboundResult.error
        );
      }

      if (customerResult.data) {
        setCustomers(customerResult.data);
      }

      if (channelResult.data) {
        setChannels(channelResult.data);
      }

      if (storeResult.data) {
        setStores(storeResult.data);
      }

      if (orderResult.data) {
        setOrders(orderResult.data);
      }

      if (productResult.data) {
        setProducts(productResult.data);
      }

      if (outboundResult.data) {
        setOutbounds(outboundResult.data);
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * 이름 조회
   * =====================================================
   */

  function getCustomerName(customerId: string) {
    return (
      customers.find(
        (item) => item.id === customerId
      )?.name ?? "-"
    );
  }

  function getChannelName(channelId: string | null) {
    if (!channelId) return "-";

    return (
      channels.find(
        (item) => item.id === channelId
      )?.name ?? "-"
    );
  }

  function getStoreName(storeId: string) {
    return (
      stores.find(
        (item) => item.id === storeId
      )?.name ?? "-"
    );
  }

  function getProduct(productId: string) {
    return products.find(
      (item) => item.id === productId
    );
  }

  /*
   * =====================================================
   * 주문 검색
   * =====================================================
   */

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (
        searchCustomer &&
        order.customer_id !== searchCustomer
      ) {
        return false;
      }

      if (
        searchChannel &&
        order.sales_channel_id !== searchChannel
      ) {
        return false;
      }

      if (
        searchStore &&
        order.store_id !== searchStore
      ) {
        return false;
      }

      if (
        searchOrderDate &&
        order.order_date !== searchOrderDate
      ) {
        return false;
      }

      if (
        searchStatus &&
        order.status !== searchStatus
      ) {
        return false;
      }

      return true;
    });
  }, [
    orders,
    searchCustomer,
    searchChannel,
    searchStore,
    searchOrderDate,
    searchStatus,
  ]);

  /*
   * =====================================================
   * 주문 선택
   * =====================================================
   */

  async function selectOrder(order: Order) {
    setMessage("");
    setSelectedOrder(order);
    setSelectedOutbound(null);
    setSelectedOutboundItems([]);

    const { data, error } = await supabase
      .from("order_items")
      .select(`
        id,
        order_id,
        product_id,
        customer_product_id,
        customer_product_code,
        product_name,
        quantity,
        unit_price,
        line_amount
      `)
      .eq("order_id", order.id)
      .order("created_at");

    if (error) {
      console.error(
        "ORDER ITEM LOAD ERROR",
        error
      );

      alert(error.message);
      return;
    }

    setSelectedOrderItems(
      data ?? []
    );
  }

  /*
   * =====================================================
   * 출고번호 생성
   * =====================================================
   */

  function generateOutboundNumber() {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

    const random =
      Math.floor(
        Math.random() * 9000
      ) + 1000;

    return `OUT-${date}-${random}`;
  }

  /*
   * =====================================================
   * 이미 출고된 수량 계산
   * =====================================================
   */

  function getAlreadyShippedQty(
    productId: string
  ) {
    return outbounds
      .filter(
        (outbound) =>
          outbound.order_id ===
          selectedOrder?.id
      )
      .reduce(
        (total, outbound) =>
          total,
        0
      );
  }

  /*
   * =====================================================
   * 출고 생성
   * =====================================================
   */

  async function createOutbound() {
    if (!selectedOrder) {
      alert(
        "출고할 주문을 선택하세요."
      );
      return;
    }

    if (selectedOrderItems.length === 0) {
      alert(
        "주문상품이 없습니다."
      );
      return;
    }

    const existingOutbound =
      outbounds.find(
        (item) =>
          item.order_id ===
          selectedOrder.id &&
          item.status !== "출고완료"
      );

    if (existingOutbound) {
      alert(
        `이미 출고작업이 존재합니다.\n출고번호: ${existingOutbound.outbound_number}`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const outboundNumber =
        generateOutboundNumber();

      const totalQty =
        selectedOrderItems.reduce(
          (sum, item) =>
            sum + item.quantity,
          0
        );

      /*
       * 1. 출고 생성
       */

      const {
        data: outbound,
        error: outboundError,
      } = await supabase
        .from("outbounds")
        .insert({
          order_id:
            selectedOrder.id,

          customer_id:
            selectedOrder.customer_id,

          store_id:
            selectedOrder.store_id,

          outbound_number:
            outboundNumber,

          outbound_date:
            new Date()
              .toISOString()
              .slice(0, 10),

          status:
            "출고대기",

          total_qty:
            totalQty,
        })
        .select()
        .single();

      if (outboundError) {
        console.error(
          "OUTBOUND INSERT ERROR",
          outboundError
        );

        throw new Error(
          outboundError.message
        );
      }

      /*
       * 2. 출고상품 생성
       */

      const outboundItems =
        selectedOrderItems.map(
          (item) => ({
            outbound_id:
              outbound.id,

            product_id:
              item.product_id,

            order_qty:
              item.quantity,

            allocated_qty:
              0,

            picked_qty:
              0,

            inspected_qty:
              0,

            shipped_qty:
              0,
          })
        );

      const {
        error: itemError,
      } = await supabase
        .from("outbound_items")
        .insert(
          outboundItems
        );

      if (itemError) {
        console.error(
          "OUTBOUND ITEM INSERT ERROR",
          itemError
        );

        await supabase
          .from("outbounds")
          .delete()
          .eq(
            "id",
            outbound.id
          );

        throw new Error(
          itemError.message
        );
      }

      setMessage(
        `출고 ${outboundNumber}가 생성되었습니다.`
      );

      setOutbounds(
        (current) => [
          outbound,
          ...current,
        ]
      );

      setSelectedOutbound(
        outbound
      );

      setSelectedOutboundItems(
        outboundItems.map(
          (item, index) => ({
            id: "",
            ...item,
          })
        )
      );
    } catch (error) {
      console.error(
        "OUTBOUND SAVE ERROR",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "출고 생성에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * 출고 선택
   * =====================================================
   */

  async function selectOutbound(
    outbound: Outbound
  ) {
    setSelectedOutbound(
      outbound
    );
    setSelectedOrder(null);
    setSelectedOrderItems([]);

    const {
      data,
      error,
    } = await supabase
      .from("outbound_items")
      .select(`
        id,
        outbound_id,
        product_id,
        order_qty,
        allocated_qty,
        picked_qty,
        inspected_qty,
        shipped_qty
      `)
      .eq(
        "outbound_id",
        outbound.id
      )
      .order("created_at");

    if (error) {
      console.error(
        "OUTBOUND ITEM LOAD ERROR",
        error
      );

      alert(error.message);
      return;
    }

    setSelectedOutboundItems(
      data ?? []
    );
  }

  /*
   * =====================================================
   * 출고 수량 수정
   * =====================================================
   */

  async function updateOutboundItem(
    item: OutboundItem,
    field:
      | "allocated_qty"
      | "picked_qty"
      | "inspected_qty"
      | "shipped_qty",
    value: number
  ) {
    const safeValue = Math.max(
      0,
      Math.min(
        value,
        item.order_qty
      )
    );

    const {
      error,
    } = await supabase
      .from("outbound_items")
      .update({
        [field]:
          safeValue,
      })
      .eq(
        "id",
        item.id
      );

    if (error) {
      console.error(
        "OUTBOUND ITEM UPDATE ERROR",
        error
      );

      alert(error.message);
      return;
    }

    setSelectedOutboundItems(
      (current) =>
        current.map(
          (currentItem) =>
            currentItem.id ===
            item.id
              ? {
                  ...currentItem,
                  [field]:
                    safeValue,
                }
              : currentItem
        )
    );
  }

  /*
   * =====================================================
   * 출고 상태 변경
   * =====================================================
   */

  async function updateOutboundStatus(
    outbound: Outbound,
    status: string
  ) {
    const {
      error,
    } = await supabase
      .from("outbounds")
      .update({
        status,
      })
      .eq(
        "id",
        outbound.id
      );

    if (error) {
      console.error(
        "OUTBOUND STATUS UPDATE ERROR",
        error
      );

      alert(error.message);
      return;
    }

    setOutbounds(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            outbound.id
              ? {
                  ...item,
                  status,
                }
              : item
        )
    );

    setSelectedOutbound(
      (current) =>
        current
          ? {
              ...current,
              status,
            }
          : current
    );

    setMessage(
      `출고상태가 "${status}"로 변경되었습니다.`
    );
  }

  /*
   * =====================================================
   * 검색 초기화
   * =====================================================
   */

  function resetSearch() {
    setSearchCustomer("");
    setSearchChannel("");
    setSearchStore("");
    setSearchOrderDate("");
    setSearchStatus("");
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

      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={titleStyle}>
              출고관리
            </h2>

            <p style={descriptionStyle}>
              주문을 조회하여 출고를 생성하고
              피킹·검수·출고 수량을 관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={secondaryButtonStyle}
          >
            {loading
              ? "조회 중..."
              : "새로고침"}
          </button>
        </div>

        <div style={searchGridStyle}>
          <Field label="화주">
            <select
              value={
                searchCustomer
              }
              onChange={(e) =>
                setSearchCustomer(
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

          <Field label="판매채널">
            <select
              value={
                searchChannel
              }
              onChange={(e) =>
                setSearchChannel(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                전체 판매채널
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
                    {channel.name}
                  </option>
                )
              )}
            </select>
          </Field>

          <Field label="배송처">
            <select
              value={
                searchStore
              }
              onChange={(e) =>
                setSearchStore(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                전체 배송처
              </option>

              {stores.map(
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

          <Field label="주문상태">
            <select
              value={
                searchStatus
              }
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

              <option value="수집완료">
                수집완료
              </option>

              <option value="출고대기">
                출고대기
              </option>

              <option value="출고중">
                출고중
              </option>

              <option value="출고완료">
                출고완료
              </option>

              <option value="취소">
                취소
              </option>
            </select>
          </Field>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={
                resetSearch
              }
              style={{
                ...secondaryButtonStyle,
                width: "100%",
              }}
            >
              검색조건 초기화
            </button>
          </div>
        </div>
      </div>

      {/* =================================================
          주문 목록
      ================================================= */}

      <div
        style={{
          ...cardStyle,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div style={listHeaderStyle}>
          <strong>
            출고대상 주문
          </strong>

          <span style={countStyle}>
            {filteredOrders.length.toLocaleString()}
            건
          </span>
        </div>

        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeadRowStyle}>
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

                <th style={thStyle}>
                  상태
                </th>

                <th style={thStyle}>
                  관리
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map(
                (order) => (
                  <tr
                    key={
                      order.id
                    }
                    style={
                      tableRowStyle
                    }
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
                      {order.total_qty.toLocaleString()}
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
                      <button
                        type="button"
                        onClick={() =>
                          selectOrder(
                            order
                          )
                        }
                        style={
                          primarySmallButtonStyle
                        }
                      >
                        주문선택
                      </button>
                    </td>
                  </tr>
                )
              )}

              {filteredOrders.length ===
                0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={
                      emptyStyle
                    }
                  >
                    검색조건에 맞는 주문이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================
          선택 주문
      ================================================= */}

      {selectedOrder && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "20px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                }}
              >
                주문 상세
              </h3>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#64748b",
                }}
              >
                {
                  selectedOrder.order_number
                }
              </p>
            </div>

            <button
              type="button"
              onClick={
                createOutbound
              }
              disabled={
                saving
              }
              style={
                primaryButtonStyle
              }
            >
              {saving
                ? "출고 생성 중..."
                : "출고 생성"}
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gridTemplateColumns:
                "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            <InfoBox
              label="화주"
              value={getCustomerName(
                selectedOrder.customer_id
              )}
            />

            <InfoBox
              label="판매채널"
              value={getChannelName(
                selectedOrder.sales_channel_id
              )}
            />

            <InfoBox
              label="배송처"
              value={getStoreName(
                selectedOrder.store_id
              )}
            />

            <InfoBox
              label="총수량"
              value={`${selectedOrder.total_qty.toLocaleString()} EA`}
            />
          </div>

          <div
            style={{
              marginTop: "25px",
              border:
                "1px solid #e5e7eb",
              borderRadius:
                "10px",
              overflow:
                "hidden",
            }}
          >
            <table style={tableStyle}>
              <thead>
                <tr
                  style={
                    tableHeadRowStyle
                  }
                >
                  <th
                    style={thStyle}
                  >
                    상품코드
                  </th>

                  <th
                    style={thStyle}
                  >
                    상품명
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
                    style={{
                      ...thStyle,
                      textAlign:
                        "right",
                    }}
                  >
                    단가
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
                </tr>
              </thead>

              <tbody>
                {selectedOrderItems.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      style={
                        tableRowStyle
                      }
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        {item.customer_product_code ||
                          getProduct(
                            item.product_id
                          )?.product_code ||
                          "-"}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {item.product_name ||
                          getProduct(
                            item.product_id
                          )?.name ||
                          "-"}
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
                        {item.quantity.toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        {item.unit_price.toLocaleString()}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        {(
                          item.line_amount ??
                          item.quantity *
                            item.unit_price
                        ).toLocaleString()}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================
          출고 목록
      ================================================= */}

      <div
        style={{
          ...cardStyle,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div style={listHeaderStyle}>
          <strong>
            출고 목록
          </strong>

          <span style={countStyle}>
            {outbounds.length.toLocaleString()}
            건
          </span>
        </div>

        <div
          style={{
            overflowX:
              "auto",
          }}
        >
          <table style={tableStyle}>
            <thead>
              <tr
                style={
                  tableHeadRowStyle
                }
              >
                <th
                  style={thStyle}
                >
                  출고번호
                </th>

                <th
                  style={thStyle}
                >
                  주문번호
                </th>

                <th
                  style={thStyle}
                >
                  화주
                </th>

                <th
                  style={thStyle}
                >
                  배송처
                </th>

                <th
                  style={thStyle}
                >
                  출고일
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
                  style={thStyle}
                >
                  상태
                </th>

                <th
                  style={thStyle}
                >
                  관리
                </th>
              </tr>
            </thead>

            <tbody>
              {outbounds.map(
                (outbound) => {
                  const order =
                    orders.find(
                      (item) =>
                        item.id ===
                        outbound.order_id
                    );

                  return (
                    <tr
                      key={
                        outbound.id
                      }
                      style={
                        tableRowStyle
                      }
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {
                            outbound.outbound_number
                          }
                        </strong>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          order?.order_number ??
                          "-"
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          getCustomerName(
                            outbound.customer_id
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
                            outbound.store_id
                          )
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          outbound.outbound_date
                        }
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        {outbound.total_qty.toLocaleString()}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <StatusBadge
                          status={
                            outbound.status
                          }
                        />
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            selectOutbound(
                              outbound
                            )
                          }
                          style={
                            secondarySmallButtonStyle
                          }
                        >
                          출고관리
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}

              {outbounds.length ===
                0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={
                      emptyStyle
                    }
                  >
                    생성된 출고가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================
          출고 상세
      ================================================= */}

      {selectedOutbound && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "20px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                }}
              >
                출고 상세
              </h3>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#64748b",
                }}
              >
                {
                  selectedOutbound.outbound_number
                }
              </p>
            </div>

            <select
              value={
                selectedOutbound.status
              }
              onChange={(e) =>
                updateOutboundStatus(
                  selectedOutbound,
                  e.target.value
                )
              }
              style={{
                ...inputStyle,
                width: "180px",
              }}
            >
              {STATUS_OPTIONS.map(
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
          </div>

          <div
            style={{
              marginTop: "25px",
              border:
                "1px solid #e5e7eb",
              borderRadius:
                "10px",
              overflow:
                "hidden",
            }}
          >
            <table style={tableStyle}>
              <thead>
                <tr
                  style={
                    tableHeadRowStyle
                  }
                >
                  <th
                    style={thStyle}
                  >
                    상품코드
                  </th>

                  <th
                    style={thStyle}
                  >
                    상품명
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
                    style={{
                      ...thStyle,
                      textAlign:
                        "right",
                    }}
                  >
                    할당
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign:
                        "right",
                    }}
                  >
                    피킹
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign:
                        "right",
                    }}
                  >
                    검수
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign:
                        "right",
                    }}
                  >
                    출고
                  </th>
                </tr>
              </thead>

              <tbody>
                {selectedOutboundItems.map(
                  (item) => {
                    const product =
                      getProduct(
                        item.product_id
                      );

                    return (
                      <tr
                        key={
                          item.id
                        }
                        style={
                          tableRowStyle
                        }
                      >
                        <td
                          style={
                            tdStyle
                          }
                        >
                          {
                            product?.product_code ??
                            "-"
                          }
                        </td>

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {
                            product?.name ??
                            "-"
                          }
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
                          {item.order_qty.toLocaleString()}
                        </td>

                        <QuantityInput
                          value={
                            item.allocated_qty
                          }
                          max={
                            item.order_qty
                          }
                          onChange={(
                            value
                          ) =>
                            updateOutboundItem(
                              item,
                              "allocated_qty",
                              value
                            )
                          }
                        />

                        <QuantityInput
                          value={
                            item.picked_qty
                          }
                          max={
                            item.order_qty
                          }
                          onChange={(
                            value
                          ) =>
                            updateOutboundItem(
                              item,
                              "picked_qty",
                              value
                            )
                          }
                        />

                        <QuantityInput
                          value={
                            item.inspected_qty
                          }
                          max={
                            item.order_qty
                          }
                          onChange={(
                            value
                          ) =>
                            updateOutboundItem(
                              item,
                              "inspected_qty",
                              value
                            )
                          }
                        />

                        <QuantityInput
                          value={
                            item.shipped_qty
                          }
                          max={
                            item.order_qty
                          }
                          onChange={(
                            value
                          ) =>
                            updateOutboundItem(
                              item,
                              "shipped_qty",
                              value
                            )
                          }
                        />
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {message && (
        <div
          style={{
            position: "fixed",
            right: "30px",
            bottom: "30px",
            zIndex: 100,
            padding:
              "14px 20px",
            borderRadius:
              "10px",
            background:
              "#0f172a",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            boxShadow:
              "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          {message}
        </div>
      )}
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
              color: "#ef4444",
              marginLeft: "4px",
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

/*
 * =====================================================
 * INFO BOX
 * =====================================================
 */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border:
          "1px solid #e5e7eb",
        borderRadius: "9px",
        padding: "14px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/*
 * =====================================================
 * QUANTITY INPUT
 * =====================================================
 */

function QuantityInput({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <td
      style={{
        ...tdStyle,
        textAlign: "right",
      }}
    >
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(
            Number(e.target.value)
          )
        }
        style={{
          width: "90px",
          padding: "7px 8px",
          border:
            "1px solid #d1d5db",
          borderRadius: "6px",
          textAlign: "right",
        }}
      />
    </td>
  );
}

/*
 * =====================================================
 * STATUS BADGE
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
    "출고완료"
  ) {
    background =
      "#dcfce7";
    color =
      "#166534";
  } else if (
    status ===
      "출고중" ||
    status ===
      "피킹중" ||
    status ===
      "검수중"
  ) {
    background =
      "#dbeafe";
    color =
      "#1d4ed8";
  } else if (
    status ===
    "출고대기"
  ) {
    background =
      "#fef3c7";
    color =
      "#92400e";
  } else if (
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
 * STYLES
 * =====================================================
 */

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border:
    "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "25px",
  marginBottom: "22px",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "24px",
  color: "#111827",
};

const descriptionStyle: React.CSSProperties = {
  margin:
    "7px 0 0",
  color: "#64748b",
  fontSize: "14px",
};

const searchGridStyle: React.CSSProperties = {
  marginTop: "22px",
  display: "grid",
  gridTemplateColumns:
    "repeat(3, 1fr)",
  gap: "16px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  boxSizing:
    "border-box",
  padding:
    "10px 12px",
  border:
    "1px solid #d1d5db",
  borderRadius: "8px",
  background:
    "#ffffff",
  color: "#111827",
  fontSize: "14px",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse:
    "collapse",
  minWidth:
    "1050px",
};

const tableHeadRowStyle: React.CSSProperties = {
  background:
    "#f8fafc",
};

const tableRowStyle: React.CSSProperties = {
  borderTop:
    "1px solid #f1f5f9",
};

const thStyle: React.CSSProperties = {
  padding:
    "13px 14px",
  textAlign:
    "left",
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  whiteSpace:
    "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding:
    "13px 14px",
  fontSize: "14px",
  color: "#334155",
  whiteSpace:
    "nowrap",
};

const listHeaderStyle: React.CSSProperties = {
  padding:
    "18px 22px",
  borderBottom:
    "1px solid #e5e7eb",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  fontSize: "17px",
};

const countStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
};

const emptyStyle: React.CSSProperties = {
  padding: "50px",
  textAlign:
    "center",
  color: "#94a3b8",
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "9px",
  padding:
    "12px 20px",
  background:
    "#2563eb",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const primarySmallButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "6px",
  padding:
    "7px 12px",
  background:
    "#2563eb",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border:
    "1px solid #d1d5db",
  borderRadius: "8px",
  padding:
    "10px 16px",
  background:
    "#ffffff",
  color: "#374151",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondarySmallButtonStyle: React.CSSProperties = {
  border:
    "1px solid #cbd5e1",
  borderRadius: "6px",
  padding:
    "7px 12px",
  background:
    "#ffffff",
  color: "#334155",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};