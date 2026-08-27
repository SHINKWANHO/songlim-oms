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

type Store = {
  id: string;
  customer_id: string;
  code: string;
  name: string;
  address: string | null;
};

type Product = {
  id: string;
  product_code: string;
  name: string;
  unit: string;
};

type OrderItem = {
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type Order = {
  id: string;
  customer_id: string;
  store_id: string;
  sales_channel_group_id: string | null;
  sales_channel_id: string | null;
  order_number: string;
  source_order_number: string | null;
  order_date: string;
  delivery_date: string | null;
  status: string;

  /* WMS */
  wms_sync_status: string | null;
  wms_synced_at: string | null;
  wms_sync_message: string | null;
  wms_order_id: string | null;

  total_qty: number;
  total_amount: number;
  created_at: string;
};

type DetailItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
};

/* =========================================================
   CONSTANT
========================================================= */

const ORDER_STATUSES = [
  "수집완료",
  "검토중",
  "출고지시",
  "피킹중",
  "포장완료",
  "출고완료",
  "배송중",
  "배송완료",
  "취소",
  "보류",
];

/* =========================================================
   COMPONENT
========================================================= */

export default function OrderManager() {
  const supabase = createClient();

  /* =======================================================
     MASTER DATA
  ======================================================= */

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  /* =======================================================
     ORDER LIST
  ======================================================= */

  const [orders, setOrders] = useState<Order[]>([]);
  const [searching, setSearching] = useState(false);

  /* =======================================================
     ORDER FORM
  ======================================================= */

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [selectedChannel, setSelectedChannel] =
    useState("");

  const [selectedStore, setSelectedStore] =
    useState("");

  const [orderNumber, setOrderNumber] =
    useState("");

  const [sourceOrderNumber, setSourceOrderNumber] =
    useState("");

  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [deliveryDate, setDeliveryDate] =
    useState("");

  const [items, setItems] =
    useState<OrderItem[]>([]);

  const [selectedProduct, setSelectedProduct] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [unitPrice, setUnitPrice] =
    useState(0);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /* =======================================================
     SEARCH
  ======================================================= */

  const [searchCustomer, setSearchCustomer] =
    useState("");

  const [searchChannel, setSearchChannel] =
    useState("");

  const [searchStore, setSearchStore] =
    useState("");

  const [searchStartDate, setSearchStartDate] =
    useState("");

  const [searchEndDate, setSearchEndDate] =
    useState("");

  const [searchStatus, setSearchStatus] =
    useState("");

  /* =======================================================
     DETAIL
  ======================================================= */

  const [selectedOrderId, setSelectedOrderId] =
    useState<string | null>(null);

  const [detailItems, setDetailItems] =
    useState<DetailItem[]>([]);

  const [detailLoading, setDetailLoading] =
    useState(false);

  /* =======================================================
     WMS
  ======================================================= */

  const [selectedWmsOrders, setSelectedWmsOrders] =
    useState<string[]>([]);

  const [wmsSending, setWmsSending] =
    useState(false);

  /* =======================================================
     ORDER SELECT
  ======================================================= */

  const orderSelect = `
    id,
    customer_id,
    store_id,
    sales_channel_group_id,
    sales_channel_id,
    order_number,
    source_order_number,
    order_date,
    delivery_date,
    status,
    total_qty,
    total_amount,
    wms_sync_status,
    wms_synced_at,
    wms_sync_message,
    wms_order_id,
    created_at
  `;

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadInitialData();
    void loadOrders();
  }, []);

  /* =======================================================
     LOAD MASTER DATA
  ======================================================= */

  async function loadInitialData() {
    const [
      customerResult,
      groupResult,
      channelResult,
      storeResult,
      productResult,
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

      supabase
        .from("stores")
        .select(
          "id, customer_id, code, name, address"
        )
        .eq("active", true)
        .order("name"),

      supabase
        .from("products")
        .select(
          "id, product_code, name, unit"
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

    if (storeResult.error) {
      console.error(
        "STORE LOAD ERROR",
        storeResult.error
      );
    } else {
      setStores(
        (storeResult.data as Store[]) || []
      );
    }

    if (productResult.error) {
      console.error(
        "PRODUCT LOAD ERROR",
        productResult.error
      );
    } else {
      setProducts(
        (productResult.data as Product[]) || []
      );
    }
  }

  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  async function loadOrders() {
    setSearching(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(orderSelect)
        .order("created_at", {
          ascending: false,
        })
        .limit(300);

      if (error) {
        console.error(
          "ORDER LOAD ERROR",
          error
        );

        setOrders([]);
        return;
      }

      setOrders(
        (data as Order[]) || []
      );
    } catch (error) {
      console.error(
        "ORDER LOAD EXCEPTION",
        error
      );

      setOrders([]);
    } finally {
      setSearching(false);
    }
  }

  /* =======================================================
     SEARCH ORDERS
  ======================================================= */

  async function searchOrders() {
    setSearching(true);

    try {
      let query = supabase
        .from("orders")
        .select(orderSelect)
        .order("created_at", {
          ascending: false,
        });

      if (searchCustomer) {
        query = query.eq(
          "customer_id",
          searchCustomer
        );
      }

      if (searchChannel) {
        query = query.eq(
          "sales_channel_id",
          searchChannel
        );
      }

      if (searchStore) {
        query = query.eq(
          "store_id",
          searchStore
        );
      }

      if (searchStartDate) {
        query = query.gte(
          "order_date",
          searchStartDate
        );
      }

      if (searchEndDate) {
        query = query.lte(
          "order_date",
          searchEndDate
        );
      }

      if (searchStatus) {
        query = query.eq(
          "status",
          searchStatus
        );
      }

      const { data, error } =
        await query.limit(300);

      if (error) {
        console.error(
          "ORDER SEARCH ERROR",
          error
        );

        alert(
          `주문 검색 오류\n\n${error.message}`
        );

        return;
      }

      setOrders(
        (data as Order[]) || []
      );

      setSelectedOrderId(null);
      setDetailItems([]);
      setSelectedWmsOrders([]);
    } catch (error) {
      console.error(
        "ORDER SEARCH EXCEPTION",
        error
      );

      alert(
        "주문 검색 중 오류가 발생했습니다."
      );
    } finally {
      setSearching(false);
    }
  }

  /* =======================================================
     RESET SEARCH
  ======================================================= */

  function resetSearch() {
    setSearchCustomer("");
    setSearchChannel("");
    setSearchStore("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchStatus("");

    setSelectedWmsOrders([]);

    void loadOrders();
  }

  /* =======================================================
     CUSTOMER CHANGE
  ======================================================= */

  function handleCustomerChange(
    customerId: string
  ) {
    setSelectedCustomer(customerId);
    setSelectedChannel("");
    setSelectedStore("");
  }

  /* =======================================================
     FORM CHANNEL
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
     CURRENT CHANNEL
  ======================================================= */

  const currentChannel = useMemo(() => {
    return channels.find(
      (channel) =>
        channel.id ===
        selectedChannel
    );
  }, [
    channels,
    selectedChannel,
  ]);

  /* =======================================================
     CURRENT GROUP
  ======================================================= */

  const currentGroup = useMemo(() => {
    if (!currentChannel?.group_id) {
      return undefined;
    }

    return groups.find(
      (group) =>
        group.id ===
        currentChannel.group_id
    );
  }, [
    groups,
    currentChannel,
  ]);

  /* =======================================================
     CUSTOMER STORES
  ======================================================= */

  const customerStores = useMemo(() => {
    if (!selectedCustomer) {
      return [];
    }

    return stores.filter(
      (store) =>
        store.customer_id ===
        selectedCustomer
    );
  }, [
    stores,
    selectedCustomer,
  ]);

  /* =======================================================
     SEARCH CHANNELS
  ======================================================= */

  const searchChannels = useMemo(() => {
    if (!searchCustomer) {
      return channels;
    }

    return channels.filter(
      (channel) =>
        channel.customer_id ===
        searchCustomer
    );
  }, [
    channels,
    searchCustomer,
  ]);

  /* =======================================================
     SEARCH STORES
  ======================================================= */

  const searchStores = useMemo(() => {
    if (!searchCustomer) {
      return stores;
    }

    return stores.filter(
      (store) =>
        store.customer_id ===
        searchCustomer
    );
  }, [
    stores,
    searchCustomer,
  ]);

  /* =======================================================
     SEARCH CUSTOMER CHANGE
  ======================================================= */

  function handleSearchCustomerChange(
    customerId: string
  ) {
    setSearchCustomer(customerId);
    setSearchChannel("");
    setSearchStore("");
  }

  /* =======================================================
     ADD ITEM
  ======================================================= */

  function addItem() {
    const product =
      products.find(
        (item) =>
          item.id ===
          selectedProduct
      );

    if (!product) {
      alert("상품을 선택하세요.");
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      alert(
        "수량은 1개 이상 입력하세요."
      );
      return;
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      alert("단가를 확인하세요.");
      return;
    }

    const existing =
      items.find(
        (item) =>
          item.product_id ===
          product.id
      );

    if (existing) {
      setItems(
        items.map((item) =>
          item.product_id ===
          product.id
            ? {
                ...item,
                quantity:
                  item.quantity +
                  quantity,
                unit_price:
                  unitPrice,
              }
            : item
        )
      );
    } else {
      setItems([
        ...items,
        {
          product_id:
            product.id,
          product_code:
            product.product_code,
          product_name:
            product.name,
          quantity,
          unit_price:
            unitPrice,
        },
      ]);
    }

    setSelectedProduct("");
    setQuantity(1);
    setUnitPrice(0);
  }

  /* =======================================================
     REMOVE ITEM
  ======================================================= */

  function removeItem(
    productId: string
  ) {
    setItems(
      items.filter(
        (item) =>
          item.product_id !==
          productId
      )
    );
  }

  /* =======================================================
     TOTAL
  ======================================================= */

  const totalQty = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity),
      0
    );
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity) *
          Number(
            item.unit_price
          ),
      0
    );
  }, [items]);

  /* =======================================================
     ORDER NUMBER
  ======================================================= */

  function generateOrderNumber() {
    const now = new Date();

    const date = now
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

    const random =
      Math.floor(
        Math.random() * 9000
      ) + 1000;

    return `ORD-${date}-${random}`;
  }

  /* =======================================================
     WMS ORDER SELECT
  ======================================================= */

  function toggleWmsOrder(
    order: Order,
    checked: boolean
  ) {
    if (
      order.wms_sync_status ===
      "전송완료"
    ) {
      return;
    }

    if (checked) {
      setSelectedWmsOrders(
        (prev) =>
          prev.includes(order.id)
            ? prev
            : [
                ...prev,
                order.id,
              ]
      );
    } else {
      setSelectedWmsOrders(
        (prev) =>
          prev.filter(
            (id) =>
              id !== order.id
          )
      );
    }
  }

  /* =======================================================
     WMS SEND
  ======================================================= */

  async function sendOrdersToWms() {
  if (selectedWmsOrders.length === 0) {
    alert("WMS로 전송할 주문을 선택하세요.");
    return;
  }

  if (
    !confirm(
      `선택한 ${selectedWmsOrders.length}건의 주문을 WMS로 전송하시겠습니까?`
    )
  ) {
    return;
  }

  setWmsSending(true);

  try {
    const response = await fetch(
      "/api/wms/orders",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          orderIds: selectedWmsOrders,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          "WMS 전송에 실패했습니다."
      );
    }

    alert(
      result.message ||
        "WMS 전송이 완료되었습니다."
    );

    setSelectedWmsOrders([]);

    await loadOrders();
  } catch (error) {
    console.error(
      "WMS SEND ERROR",
      error
    );

    alert(
      error instanceof Error
        ? `WMS 전송 실패\n\n${error.message}`
        : "WMS 전송에 실패했습니다."
    );

    await loadOrders();
  } finally {
    setWmsSending(false);
  }
}

  /* =======================================================
     SAVE ORDER
  ======================================================= */

  async function saveOrder() {
    setMessage("");

    if (!selectedCustomer) {
      alert("화주를 선택하세요.");
      return;
    }

    if (!selectedChannel) {
      alert(
        "판매채널을 선택하세요."
      );
      return;
    }

    if (!selectedStore) {
      alert("배송처를 선택하세요.");
      return;
    }

    if (!orderDate) {
      alert("주문일을 입력하세요.");
      return;
    }

    if (items.length === 0) {
      alert(
        "주문상품을 하나 이상 추가하세요."
      );
      return;
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

    if (!channel.group_id) {
      alert(
        "해당 판매채널에 판매채널 그룹이 지정되지 않았습니다."
      );
      return;
    }

    setSaving(true);

    let createdOrderId:
      | string
      | null = null;

    try {
      const finalOrderNumber =
        orderNumber.trim() ||
        generateOrderNumber();

      /* -----------------------------------------------
         1. ORDER INSERT
      ------------------------------------------------ */

      const {
        data: order,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          customer_id:
            selectedCustomer,

          sales_channel_group_id:
            channel.group_id,

          sales_channel_id:
            channel.id,

          store_id:
            selectedStore,

          order_number:
            finalOrderNumber,

          source_order_number:
            sourceOrderNumber.trim() ||
            finalOrderNumber,

          order_date:
            orderDate,

          delivery_date:
            deliveryDate ||
            null,

          status:
            "수집완료",

          total_qty:
            totalQty,

          total_amount:
            totalAmount,

          /* WMS 초기값 */
          wms_sync_status:
            "미전송",

          wms_synced_at:
            null,

          wms_sync_message:
            null,

          wms_order_id:
            null,
        })
        .select(
          "id, order_number"
        )
        .single();

      if (orderError) {
        console.error(
          "========== ORDER INSERT ERROR =========="
        );

        console.error(
          "MESSAGE:",
          orderError.message
        );

        console.error(
          "CODE:",
          orderError.code
        );

        console.error(
          "DETAILS:",
          orderError.details
        );

        console.error(
          "HINT:",
          orderError.hint
        );

        throw new Error(
          `주문 저장 실패: ${orderError.message}`
        );
      }

      if (!order) {
        throw new Error(
          "주문 저장 결과를 받지 못했습니다."
        );
      }

      createdOrderId =
        order.id;

      /* -----------------------------------------------
         2. ORDER ITEMS INSERT
      ------------------------------------------------ */

      const orderItems =
        items.map(
          (item) => ({
            order_id:
              order.id,

            product_id:
              item.product_id,

            customer_product_id:
              null,

            customer_product_code:
              null,

            product_name:
              item.product_name,

            quantity:
              Number(
                item.quantity
              ),

            unit_price:
              Number(
                item.unit_price
              ),

            line_amount:
              Number(
                item.quantity
              ) *
              Number(
                item.unit_price
              ),

            matching_status:
              "미매칭",
          })
        );

      const {
        error:
          orderItemError,
      } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (orderItemError) {
        console.error(
          "========== ORDER ITEM INSERT ERROR =========="
        );

        console.error(
          "MESSAGE:",
          orderItemError.message
        );

        console.error(
          "CODE:",
          orderItemError.code
        );

        console.error(
          "DETAILS:",
          orderItemError.details
        );

        console.error(
          "HINT:",
          orderItemError.hint
        );

        /* rollback */

        if (createdOrderId) {
          const {
            error:
              rollbackError,
          } =
            await supabase
              .from("orders")
              .delete()
              .eq(
                "id",
                createdOrderId
              );

          if (
            rollbackError
          ) {
            console.error(
              "ORDER ROLLBACK ERROR",
              rollbackError
            );
          }
        }

        throw new Error(
          `주문상품 저장 실패: ${orderItemError.message}`
        );
      }

      /* -----------------------------------------------
         3. SUCCESS
      ------------------------------------------------ */

      setMessage(
        `주문 ${finalOrderNumber}이 저장되었습니다.`
      );

      setOrderNumber("");
      setSourceOrderNumber("");
      setDeliveryDate("");

      setSelectedCustomer("");
      setSelectedChannel("");
      setSelectedStore("");

      setItems([]);

      setSelectedProduct("");
      setQuantity(1);
      setUnitPrice(0);

      await loadOrders();
    } catch (error) {
      console.error(
        "ORDER SAVE ERROR",
        error
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "주문 저장에 실패했습니다.";

      setMessage(
        errorMessage
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOAD ORDER DETAIL
  ======================================================= */

  async function loadOrderDetail(
    orderId: string
  ) {
    if (
      selectedOrderId ===
      orderId
    ) {
      setSelectedOrderId(null);
      setDetailItems([]);
      return;
    }

    setDetailLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("order_items")
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          line_amount
        `)
        .eq(
          "order_id",
          orderId
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        );

      if (error) {
        console.error(
          "ORDER DETAIL ERROR",
          error
        );

        alert(
          `주문 상세 조회 오류\n\n${error.message}`
        );

        return;
      }

      setSelectedOrderId(
        orderId
      );

      setDetailItems(
        (data as DetailItem[]) ||
          []
      );
    } catch (error) {
      console.error(
        "ORDER DETAIL EXCEPTION",
        error
      );

      alert(
        "주문 상세 조회 중 오류가 발생했습니다."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  /* =======================================================
     MASTER LOOKUP
  ======================================================= */

  function getCustomerName(
    customerId: string
  ) {
    return (
      customers.find(
        (item) =>
          item.id ===
          customerId
      )?.name ?? "-"
    );
  }

  function getChannelName(
    channelId: string | null
  ) {
    if (!channelId) {
      return "-";
    }

    return (
      channels.find(
        (item) =>
          item.id ===
          channelId
      )?.name ?? "-"
    );
  }

  function getStoreName(
    storeId: string
  ) {
    return (
      stores.find(
        (item) =>
          item.id ===
          storeId
      )?.name ?? "-"
    );
  }

  function getProductName(
    productId: string
  ) {
    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      );

    if (!product) {
      return productId;
    }

    return `${product.product_code} - ${product.name}`;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div>
      {/* =================================================
          주문 등록
      ================================================= */}

      <div style={cardStyle}>
        <h2 style={titleStyle}>
          주문 등록
        </h2>

        <p
          style={
            descriptionStyle
          }
        >
          화주 → 판매채널 → 배송처 → 주문상품
        </p>

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding:
                "14px 18px",
              borderRadius: "10px",

              background:
                message.includes(
                  "저장되었습니다"
                )
                  ? "#dcfce7"
                  : "#fee2e2",

              color:
                message.includes(
                  "저장되었습니다"
                )
                  ? "#166534"
                  : "#b91c1c",

              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            marginTop: "30px",

            display: "grid",

            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",

            gap: "18px",
          }}
        >
          {/* 화주 */}

          <Field
            label="화주"
            required
          >
            <select
              value={
                selectedCustomer
              }
              onChange={(e) =>
                handleCustomerChange(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
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

          {/* 판매채널 */}

          <Field
            label="판매채널"
            required
          >
            <select
              value={
                selectedChannel
              }
              onChange={(e) => {
                setSelectedChannel(
                  e.target.value
                );

                setSelectedStore(
                  ""
                );
              }}
              style={
                inputStyle
              }
              disabled={
                !selectedCustomer
              }
            >
              <option value="">
                판매채널을 선택하세요
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

          {/* 판매채널 그룹 */}

          <Field label="판매채널 그룹">
            <div
              style={{
                ...inputStyle,

                background:
                  "#f8fafc",

                color:
                  currentGroup
                    ? "#111827"
                    : "#94a3b8",

                display:
                  "flex",

                alignItems:
                  "center",
              }}
            >
              {currentGroup
                ? currentGroup.name
                : "판매채널 선택 시 자동 결정"}
            </div>
          </Field>

          {/* 배송처 */}

          <Field
            label="배송처"
            required
          >
            <select
              value={
                selectedStore
              }
              onChange={(e) =>
                setSelectedStore(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
              disabled={
                !selectedCustomer
              }
            >
              <option value="">
                배송처를 선택하세요
              </option>

              {customerStores.map(
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

                    {store.address
                      ? ` - ${store.address}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </Field>

          {/* 주문번호 */}

          <Field label="주문번호">
            <input
              value={
                orderNumber
              }
              onChange={(e) =>
                setOrderNumber(
                  e.target.value
                )
              }
              placeholder="비워두면 자동생성"
              style={
                inputStyle
              }
            />
          </Field>

          {/* 원주문번호 */}

          <Field label="원주문번호">
            <input
              value={
                sourceOrderNumber
              }
              onChange={(e) =>
                setSourceOrderNumber(
                  e.target.value
                )
              }
              placeholder="외부 채널 주문번호"
              style={
                inputStyle
              }
            />
          </Field>

          {/* 주문일 */}

          <Field
            label="주문일"
            required
          >
            <input
              type="date"
              value={
                orderDate
              }
              onChange={(e) =>
                setOrderDate(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </Field>

          {/* 배송일 */}

          <Field label="배송일">
            <input
              type="date"
              value={
                deliveryDate
              }
              onChange={(e) =>
                setDeliveryDate(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </Field>
        </div>

        {/* =================================================
            주문 상품
        ================================================= */}

        <div
          style={{
            marginTop: "40px",
            paddingTop: "25px",
            borderTop:
              "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize:
                "20px",
            }}
          >
            주문상품
          </h3>

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "minmax(0, 2fr) minmax(100px, 1fr) minmax(120px, 1fr) auto",

              gap: "10px",

              marginTop:
                "18px",
            }}
          >
            <select
              value={
                selectedProduct
              }
              onChange={(e) =>
                setSelectedProduct(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            >
              <option value="">
                상품 선택
              </option>

              {products.map(
                (product) => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {
                      product.product_code
                    }{" "}
                    -{" "}
                    {
                      product.name
                    }
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              min="1"
              value={
                quantity
              }
              onChange={(e) =>
                setQuantity(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                inputStyle
              }
              placeholder="수량"
            />

            <input
              type="number"
              min="0"
              value={
                unitPrice
              }
              onChange={(e) =>
                setUnitPrice(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                inputStyle
              }
              placeholder="단가"
            />

            <button
              type="button"
              onClick={
                addItem
              }
              style={
                addButtonStyle
              }
            >
              상품 추가
            </button>
          </div>

          <div
            style={{
              marginTop:
                "20px",

              border:
                "1px solid #e5e7eb",

              borderRadius:
                "10px",

              overflow:
                "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
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
                    상품코드
                  </th>

                  <th
                    style={
                      thStyle
                    }
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
                    수량
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

                  <th
                    style={
                      thStyle
                    }
                  >
                    관리
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map(
                  (item) => (
                    <tr
                      key={
                        item.product_id
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
                        {
                          item.product_code
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          item.product_name
                        }
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                        }}
                      >
                        {Number(
                          item.quantity
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
                          item.unit_price
                        ).toLocaleString()}
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
                        {(
                          Number(
                            item.quantity
                          ) *
                          Number(
                            item.unit_price
                          )
                        ).toLocaleString()}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              item.product_id
                            )
                          }
                          style={
                            deleteButtonStyle
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {items.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding:
                          "40px",
                        textAlign:
                          "center",
                        color:
                          "#94a3b8",
                      }}
                    >
                      주문상품을
                      추가하세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "flex-end",

              gap: "40px",

              marginTop:
                "20px",

              fontSize:
                "17px",
            }}
          >
            <div>
              총 수량{" "}
              <strong>
                {totalQty.toLocaleString()}
              </strong>
            </div>

            <div>
              총 금액{" "}
              <strong>
                {totalAmount.toLocaleString()}
                원
              </strong>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop:
              "30px",

            display:
              "flex",

            justifyContent:
              "flex-end",
          }}
        >
          <button
            type="button"
            onClick={
              saveOrder
            }
            disabled={
              saving
            }
            style={{
              border:
                "none",

              borderRadius:
                "10px",

              padding:
                "14px 28px",

              background:
                saving
                  ? "#94a3b8"
                  : "#2563eb",

              color:
                "#ffffff",

              fontSize:
                "16px",

              fontWeight:
                700,

              cursor:
                saving
                  ? "default"
                  : "pointer",
            }}
          >
            {saving
              ? "저장 중..."
              : "주문 저장"}
          </button>
        </div>
      </div>

      {/* =================================================
          주문 검색
      ================================================= */}

      <div style={cardStyle}>
        <h2
          style={{
            ...titleStyle,
            fontSize:
              "22px",
          }}
        >
          주문 조회
        </h2>

        <div
          style={{
            marginTop:
              "22px",

            display:
              "grid",

            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",

            gap: "16px",
          }}
        >
          <Field label="화주">
            <select
              value={
                searchCustomer
              }
              onChange={(e) =>
                handleSearchCustomerChange(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
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
              style={
                inputStyle
              }
            >
              <option value="">
                전체 판매채널
              </option>

              {searchChannels.map(
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
              style={
                inputStyle
              }
            >
              <option value="">
                전체 배송처
              </option>

              {searchStores.map(
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

          <Field label="주문일 시작">
            <input
              type="date"
              value={
                searchStartDate
              }
              onChange={(e) =>
                setSearchStartDate(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
            />
          </Field>

          <Field label="주문일 종료">
            <input
              type="date"
              value={
                searchEndDate
              }
              onChange={(e) =>
                setSearchEndDate(
                  e.target.value
                )
              }
              style={
                inputStyle
              }
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
              style={
                inputStyle
              }
            >
              <option value="">
                전체 상태
              </option>

              {ORDER_STATUSES.map(
                (status) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>

        <div
          style={{
            marginTop:
              "22px",

            display:
              "flex",

            justifyContent:
              "flex-end",

            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={
              resetSearch
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
              searchOrders
            }
            disabled={
              searching
            }
            style={
              searchButtonStyle
            }
          >
            {searching
              ? "검색 중..."
              : "검색"}
          </button>
        </div>
      </div>

      {/* =================================================
          주문 목록
      ================================================= */}

      <div style={cardStyle}>
        {/* 목록 헤더 */}

        <div
          style={{
            paddingBottom:
              "20px",

            borderBottom:
              "1px solid #e5e7eb",

            fontSize:
              "18px",

            fontWeight:
              700,

            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap: "12px",
            }}
          >
            <span>
              주문 목록
            </span>

            <span
              style={{
                fontSize:
                  "14px",

                color:
                  "#64748b",

                fontWeight:
                  500,
              }}
            >
              총{" "}
              {orders.length.toLocaleString()}
              건
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              void sendOrdersToWms()
            }
            disabled={
              wmsSending ||
              selectedWmsOrders.length ===
                0
            }
            style={{
              border:
                "none",

              borderRadius:
                "8px",

              padding:
                "10px 18px",

              background:
                wmsSending ||
                selectedWmsOrders.length ===
                  0
                  ? "#cbd5e1"
                  : "#0f766e",

              color:
                "#ffffff",

              fontWeight:
                700,

              cursor:
                wmsSending ||
                selectedWmsOrders.length ===
                  0
                  ? "default"
                  : "pointer",
            }}
          >
            {wmsSending
              ? "WMS 전송 중..."
              : `WMS 전송${
                  selectedWmsOrders.length >
                  0
                    ? ` (${selectedWmsOrders.length})`
                    : ""
                }`}
          </button>
        </div>

        {/* 목록 테이블 */}

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
                "1350px",
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
                  선택
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
                  배송처
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
                  배송일
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  주문상태
                </th>

                <th
                  style={
                    thStyle
                  }
                >
                  WMS 연동
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

                <th
                  style={
                    thStyle
                  }
                >
                  상세
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (order) => {
                  const isSelected =
                    selectedOrderId ===
                    order.id;

                  const wmsStatus =
                    order.wms_sync_status ??
                    "미전송";

                  return (
                    <React.Fragment
                      key={
                        order.id
                      }
                    >
                      <tr
                        style={{
                          borderTop:
                            "1px solid #f1f5f9",
                        }}
                      >
                        {/* 선택 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedWmsOrders.includes(
                              order.id
                            )}
                            disabled={
                              wmsStatus ===
                              "전송완료"
                            }
                            onChange={(
                              e
                            ) =>
                              toggleWmsOrder(
                                order,
                                e.target
                                  .checked
                              )
                            }
                          />
                        </td>

                        {/* 주문번호 */}

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

                        {/* 화주 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {getCustomerName(
                            order.customer_id
                          )}
                        </td>

                        {/* 판매채널 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {getChannelName(
                            order.sales_channel_id
                          )}
                        </td>

                        {/* 배송처 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {getStoreName(
                            order.store_id
                          )}
                        </td>

                        {/* 주문일 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {
                            order.order_date
                          }
                        </td>

                        {/* 배송일 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          {order.delivery_date ??
                            "-"}
                        </td>

                        {/* 주문상태 */}

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
                                "5px 9px",

                              borderRadius:
                                "999px",

                              background:
                                getStatusBackground(
                                  order.status
                                ),

                              color:
                                getStatusColor(
                                  order.status
                                ),

                              fontWeight:
                                700,

                              fontSize:
                                "12px",
                            }}
                          >
                            {
                              order.status
                            }
                          </span>
                        </td>

                        {/* WMS 연동 */}

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
                                "5px 9px",

                              borderRadius:
                                "999px",

                              background:
                                getWmsSyncBackground(
                                  wmsStatus
                                ),

                              color:
                                getWmsSyncColor(
                                  wmsStatus
                                ),

                              fontWeight:
                                700,

                              fontSize:
                                "12px",
                            }}
                          >
                            {
                              wmsStatus
                            }
                          </span>
                        </td>

                        {/* 수량 */}

                        <td
                          style={{
                            ...tdStyle,
                            textAlign:
                              "right",
                          }}
                        >
                          {Number(
                            order.total_qty
                          ).toLocaleString()}
                        </td>

                        {/* 금액 */}

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
                            order.total_amount
                          ).toLocaleString()}
                          원
                        </td>

                        {/* 상세 */}

                        <td
                          style={
                            tdStyle
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              void loadOrderDetail(
                                order.id
                              )
                            }
                            style={
                              detailButtonStyle
                            }
                          >
                            {detailLoading &&
                            selectedOrderId ===
                              order.id
                              ? "조회중..."
                              : isSelected
                              ? "닫기"
                              : "상세"}
                          </button>
                        </td>
                      </tr>

                      {/* =================================================
                          주문 상세
                      ================================================= */}

                      {isSelected && (
                        <tr>
                          <td
                            colSpan={
                              12
                            }
                            style={{
                              padding:
                                "20px 30px",

                              background:
                                "#f8fafc",
                            }}
                          >
                            <div
                              style={{
                                fontWeight:
                                  700,

                                fontSize:
                                  "15px",

                                marginBottom:
                                  "12px",
                              }}
                            >
                              주문상품
                            </div>

                            <table
                              style={{
                                width:
                                  "100%",

                                borderCollapse:
                                  "collapse",

                                background:
                                  "#ffffff",

                                border:
                                  "1px solid #e5e7eb",
                              }}
                            >
                              <thead>
                                <tr>
                                  <th
                                    style={
                                      detailThStyle
                                    }
                                  >
                                    상품
                                  </th>

                                  <th
                                    style={
                                      detailThStyle
                                    }
                                  >
                                    수량
                                  </th>

                                  <th
                                    style={
                                      detailThStyle
                                    }
                                  >
                                    단가
                                  </th>

                                  <th
                                    style={
                                      detailThStyle
                                    }
                                  >
                                    금액
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {detailItems.map(
                                  (
                                    item
                                  ) => (
                                    <tr
                                      key={
                                        item.id
                                      }
                                    >
                                      <td
                                        style={
                                          detailTdStyle
                                        }
                                      >
                                        {getProductName(
                                          item.product_id
                                        )}
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        {Number(
                                          item.quantity
                                        ).toLocaleString()}
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                        }}
                                      >
                                        {Number(
                                          item.unit_price
                                        ).toLocaleString()}
                                      </td>

                                      <td
                                        style={{
                                          ...detailTdStyle,
                                          textAlign:
                                            "right",
                                          fontWeight:
                                            700,
                                        }}
                                      >
                                        {Number(
                                          item.line_amount
                                        ).toLocaleString()}
                                      </td>
                                    </tr>
                                  )
                                )}

                                {detailItems.length ===
                                  0 && (
                                  <tr>
                                    <td
                                      colSpan={
                                        4
                                      }
                                      style={{
                                        padding:
                                          "30px",

                                        textAlign:
                                          "center",

                                        color:
                                          "#94a3b8",
                                      }}
                                    >
                                      주문상품이
                                      없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }
              )}

              {orders.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      12
                    }
                    style={{
                      padding:
                        "70px",

                      textAlign:
                        "center",

                      color:
                        "#94a3b8",
                    }}
                  >
                    조회된 주문이
                    없습니다.
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
          display:
            "block",

          marginBottom:
            "8px",

          fontSize:
            "14px",

          fontWeight:
            700,

          color:
            "#374151",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color:
                "#ef4444",

              marginLeft:
                "4px",
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
   STATUS BACKGROUND
========================================================= */

function getStatusBackground(
  status: string
) {
  switch (status) {
    case "수집완료":
      return "#dbeafe";

    case "검토중":
      return "#fef3c7";

    case "출고지시":
      return "#ede9fe";

    case "피킹중":
      return "#e0e7ff";

    case "포장완료":
      return "#cffafe";

    case "출고완료":
      return "#dcfce7";

    case "배송중":
      return "#d1fae5";

    case "배송완료":
      return "#bbf7d0";

    case "취소":
      return "#fee2e2";

    case "보류":
      return "#f1f5f9";

    default:
      return "#f1f5f9";
  }
}

/* =========================================================
   STATUS COLOR
========================================================= */

function getStatusColor(
  status: string
) {
  switch (status) {
    case "수집완료":
      return "#1d4ed8";

    case "검토중":
      return "#a16207";

    case "출고지시":
      return "#6d28d9";

    case "피킹중":
      return "#4338ca";

    case "포장완료":
      return "#0e7490";

    case "출고완료":
      return "#15803d";

    case "배송중":
      return "#047857";

    case "배송완료":
      return "#166534";

    case "취소":
      return "#b91c1c";

    case "보류":
      return "#64748b";

    default:
      return "#475569";
  }
}

/* =========================================================
   WMS STATUS BACKGROUND
========================================================= */

function getWmsSyncBackground(
  status: string
) {
  switch (status) {
    case "전송완료":
      return "#dcfce7";

    case "전송중":
      return "#dbeafe";

    case "전송실패":
      return "#fee2e2";

    case "재전송":
      return "#fef3c7";

    case "전송대기":
      return "#ede9fe";

    case "미전송":
    default:
      return "#f1f5f9";
  }
}

/* =========================================================
   WMS STATUS COLOR
========================================================= */

function getWmsSyncColor(
  status: string
) {
  switch (status) {
    case "전송완료":
      return "#15803d";

    case "전송중":
      return "#1d4ed8";

    case "전송실패":
      return "#b91c1c";

    case "재전송":
      return "#a16207";

    case "전송대기":
      return "#6d28d9";

    case "미전송":
    default:
      return "#64748b";
  }
}

/* =========================================================
   STYLE
========================================================= */

const cardStyle: React.CSSProperties = {
  background:
    "#ffffff",

  border:
    "1px solid #e5e7eb",

  borderRadius:
    "16px",

  padding:
    "30px",

  marginBottom:
    "30px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,

  fontSize:
    "24px",

  color:
    "#111827",
};

const descriptionStyle: React.CSSProperties = {
  color:
    "#64748b",

  marginTop:
    "8px",
};

const inputStyle: React.CSSProperties = {
  width:
    "100%",

  minHeight:
    "44px",

  boxSizing:
    "border-box",

  padding:
    "10px 12px",

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

  fontWeight:
    700,

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

const detailThStyle: React.CSSProperties = {
  padding:
    "10px 12px",

  textAlign:
    "left",

  fontSize:
    "12px",

  fontWeight:
    700,

  color:
    "#64748b",

  borderBottom:
    "1px solid #e5e7eb",
};

const detailTdStyle: React.CSSProperties = {
  padding:
    "10px 12px",

  fontSize:
    "13px",

  color:
    "#334155",

  borderBottom:
    "1px solid #f1f5f9",
};

const addButtonStyle: React.CSSProperties = {
  border:
    "none",

  borderRadius:
    "8px",

  padding:
    "0 18px",

  background:
    "#0f172a",

  color:
    "#ffffff",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  border:
    "none",

  background:
    "#fee2e2",

  color:
    "#b91c1c",

  borderRadius:
    "6px",

  padding:
    "6px 10px",

  cursor:
    "pointer",
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

  fontWeight:
    700,

  cursor:
    "pointer",
};

const resetButtonStyle: React.CSSProperties = {
  border:
    "1px solid #d1d5db",

  borderRadius:
    "8px",

  padding:
    "11px 22px",

  background:
    "#ffffff",

  color:
    "#374151",

  fontWeight:
    700,

  cursor:
    "pointer",
};

const detailButtonStyle: React.CSSProperties = {
  border:
    "none",

  borderRadius:
    "6px",

  padding:
    "6px 12px",

  background:
    "#eff6ff",

  color:
    "#2563eb",

  fontWeight:
    700,

  cursor:
    "pointer",
};