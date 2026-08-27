"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  code?: string | null;
  name: string;
  channel?: string | null;
};

type Product = {
  id: string;
  code?: string | null;
  name: string;
  price?: number | null;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export default function NewOrderPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [channel, setChannel] = useState("");
  const [orderDate, setOrderDate] = useState(getToday());
  const [memo, setMemo] = useState("");

  const [items, setItems] = useState<OrderItem[]>([]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name");

    if (error) {
      console.error("거래처 조회 오류:", error);
      setMessage(`거래처 조회 실패: ${error.message}`);
      return;
    }

    setCustomers(data || []);
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      console.error("상품 조회 오류:", error);
      setMessage(`상품 조회 실패: ${error.message}`);
      return;
    }

    setProducts(data || []);
  }

  function handleCustomerChange(value: string) {
    setCustomerId(value);

    const customer = customers.find(
      (item) => item.id === value
    );

    if (customer?.channel) {
      setChannel(customer.channel);
    }
  }

  function handleProductChange(value: string) {
    setProductId(value);

    const product = products.find(
      (item) => item.id === value
    );

    if (product) {
      setUnitPrice(Number(product.price || 0));
    } else {
      setUnitPrice(0);
    }
  }

  function addItem() {
    if (!productId) {
      alert("상품을 선택해주세요.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("수량을 1개 이상 입력해주세요.");
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      alert("단가를 확인해주세요.");
      return;
    }

    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) {
      alert("상품 정보를 찾을 수 없습니다.");
      return;
    }

    const exists = items.some(
      (item) => item.product_id === productId
    );

    if (exists) {
      alert("이미 추가된 상품입니다.");
      return;
    }

    const newItem: OrderItem = {
      product_id: product.id,
      product_name: product.name,
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
    };

    setItems((prev) => [...prev, newItem]);

    setProductId("");
    setQuantity(1);
    setUnitPrice(0);
  }

  function removeItem(productId: string) {
    setItems((prev) =>
      prev.filter(
        (item) => item.product_id !== productId
      )
    );
  }

  function updateQuantity(
    productId: string,
    value: number
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: Math.max(
                1,
                Number(value) || 1
              ),
            }
          : item
      )
    );
  }

  function updatePrice(
    productId: string,
    value: number
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              unit_price: Math.max(
                0,
                Number(value) || 0
              ),
            }
          : item
      )
    );
  }

  async function handleSubmit() {
    if (loading) {
      return;
    }

    setMessage("");

    if (!customerId) {
      alert("거래처를 선택해주세요.");
      return;
    }

    if (!channel) {
      alert("판매채널을 선택해주세요.");
      return;
    }

    if (!orderDate) {
      alert("주문일자를 입력해주세요.");
      return;
    }

    if (items.length === 0) {
      alert("주문상품을 하나 이상 추가해주세요.");
      return;
    }

    setLoading(true);

    let createdOrderId: string | null = null;

    try {
      console.log("=================================");
      console.log("주문 등록 시작");
      console.log("=================================");

      const totalQty = items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

      const totalAmount = items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            Number(item.unit_price || 0),
        0
      );

      const timestamp = Date.now()
        .toString()
        .slice(-6);

      const generatedOrderNumber =
        `ORD-${orderDate.replaceAll("-", "")}-${timestamp}`;

      console.log("주문번호:", generatedOrderNumber);
      console.log("총수량:", totalQty);
      console.log("총금액:", totalAmount);

      /*
       * =====================================================
       * 1. orders INSERT
       * =====================================================
       */

      const orderInsertData = {
        customer_id: customerId,
        store_id: null,

        order_number: generatedOrderNumber,
        source_order_number: generatedOrderNumber,

        order_date: orderDate,
        delivery_date: null,

        status: "접수",

        total_qty: totalQty,
        total_amount: totalAmount,

        raw_source_id: null,

        wms_order_id: null,
        wms_sync_status: "미전송",
        wms_synced_at: null,

        sales_channel_group_id: null,
        sales_channel_id: null,

        wms_sync_message: null,

        order_no: generatedOrderNumber,

        channel,
        memo: memo || null,

        shipment_requested: false,
        shipment_requested_at: null,

        confirmed_at: null,
      };

      console.log(
        "orders INSERT:",
        orderInsertData
      );

      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert(orderInsertData)
        .select(
          `
          id,
          customer_id,
          order_number,
          source_order_number,
          order_date,
          status,
          total_qty,
          total_amount,
          order_no,
          channel,
          memo,
          shipment_requested
          `
        )
        .single();

      console.log(
        "orders 결과:",
        orderData
      );

      console.log(
        "orders 오류:",
        orderError
      );

      if (orderError) {
        throw new Error(
          `주문 기본정보 등록 실패\n${formatSupabaseError(
            orderError
          )}`
        );
      }

      if (!orderData) {
        throw new Error(
          "주문 기본정보 등록 결과가 없습니다."
        );
      }

      createdOrderId = orderData.id;

      /*
       * =====================================================
       * 2. order_items INSERT
       * =====================================================
       */

      const orderItems = items.map(
        (item) => ({
          order_id: orderData.id,

          product_id: item.product_id,

          customer_product_id: null,

          customer_product_code: null,

          product_name: item.product_name,

          quantity: Number(item.quantity),

          unit_price: Number(item.unit_price),

          line_amount:
            Number(item.quantity) *
            Number(item.unit_price),

          matching_status: "미매칭",
        })
      );

      console.log(
        "order_items INSERT:",
        orderItems
      );

      const {
        data: itemData,
        error: itemError,
      } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select(
          `
          id,
          order_id,
          product_id,
          customer_product_id,
          customer_product_code,
          product_name,
          quantity,
          unit_price,
          line_amount,
          matching_status,
          created_at
          `
        );

      console.log(
        "order_items 결과:",
        itemData
      );

      console.log(
        "order_items 오류:",
        itemError
      );

      /*
       * =====================================================
       * 중요
       *
       * 여기서 오류가 발생하면 주문 삭제
       * =====================================================
       */

      if (itemError) {
        console.error(
          "order_items 등록 실패:",
          {
            code: itemError.code,
            message: itemError.message,
            details: itemError.details,
            hint: itemError.hint,
          }
        );

        /*
         * 생성된 주문 삭제
         *
         * 단, 삭제 실패 여부도 별도로 기록
         */

        if (createdOrderId) {
          const {
            error: deleteError,
          } = await supabase
            .from("orders")
            .delete()
            .eq("id", createdOrderId);

          if (deleteError) {
            console.error(
              "실패한 주문 삭제 오류:",
              deleteError
            );
          } else {
            console.log(
              "실패한 주문 삭제 완료:",
              createdOrderId
            );
          }
        }

        throw new Error(
          `주문상품 등록 실패\n${formatSupabaseError(
            itemError
          )}`
        );
      }

      if (
        !itemData ||
        itemData.length === 0
      ) {
        if (createdOrderId) {
          const {
            error: deleteError,
          } = await supabase
            .from("orders")
            .delete()
            .eq("id", createdOrderId);

          if (deleteError) {
            console.error(
              "주문 삭제 오류:",
              deleteError
            );
          }
        }

        throw new Error(
          "주문상품이 등록되지 않았습니다."
        );
      }

      /*
       * =====================================================
       * 3. 주문 최종 확인
       * =====================================================
       */

      const {
        data: checkOrder,
        error: checkOrderError,
      } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_id,
          order_number,
          source_order_number,
          order_date,
          status,
          total_qty,
          total_amount,
          order_no,
          channel,
          memo,
          shipment_requested
          `
        )
        .eq(
          "id",
          orderData.id
        )
        .maybeSingle();

      console.log(
        "최종 주문 확인:",
        checkOrder
      );

      if (checkOrderError) {
        throw new Error(
          `주문 등록 확인 실패\n${formatSupabaseError(
            checkOrderError
          )}`
        );
      }

      if (!checkOrder) {
        throw new Error(
          "주문은 등록되었지만 DB에서 확인할 수 없습니다."
        );
      }

      /*
       * =====================================================
       * 4. 주문상품 최종 확인
       * =====================================================
       */

      const {
        data: checkItems,
        error: checkItemsError,
      } = await supabase
        .from("order_items")
        .select(
          `
          id,
          order_id,
          product_id,
          customer_product_id,
          customer_product_code,
          product_name,
          quantity,
          unit_price,
          line_amount,
          matching_status
          `
        )
        .eq(
          "order_id",
          orderData.id
        );

      console.log(
        "최종 주문상품 확인:",
        checkItems
      );

      if (checkItemsError) {
        throw new Error(
          `주문상품 확인 실패\n${formatSupabaseError(
            checkItemsError
          )}`
        );
      }

      if (
        !checkItems ||
        checkItems.length === 0
      ) {
        throw new Error(
          "주문은 등록되었지만 주문상품을 확인할 수 없습니다."
        );
      }

      /*
       * =====================================================
       * 5. 성공
       * =====================================================
       */

      console.log("=================================");
      console.log("주문 등록 완료");
      console.log(
        "주문번호:",
        checkOrder.order_number
      );
      console.log(
        "주문상품:",
        checkItems
      );
      console.log("=================================");

      setMessage(
        `주문이 정상적으로 등록되었습니다. 주문번호: ${
          checkOrder.order_number ||
          checkOrder.order_no ||
          generatedOrderNumber
        }`
      );

      /*
       * 입력 초기화
       */

      setCustomerId("");
      setChannel("");
      setOrderDate(getToday());
      setMemo("");

      setItems([]);

      setProductId("");
      setQuantity(1);
      setUnitPrice(0);
    } catch (error) {
      console.error("=================================");
      console.error("주문 등록 오류");
      console.error(error);
      console.error("=================================");

      let errorMessage =
        "주문 등록에 실패했습니다.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        error &&
        typeof error === "object"
      ) {
        const supabaseError =
          error as {
            message?: string;
            details?: string;
            hint?: string;
            code?: string;
          };

        errorMessage =
          supabaseError.message ||
          supabaseError.details ||
          supabaseError.hint ||
          JSON.stringify(error);
      }

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const totalQuantity =
    items.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

  const totalAmount =
    items.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0) *
          Number(item.unit_price || 0),
      0
    );

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
            padding: "0 12px 28px",
            borderBottom:
              "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              fontWeight: 700,
              letterSpacing: "1.5px",
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
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <Menu href="/" label="대시보드" icon="▦" />
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
            href="/orders"
            label="주문 관리"
            icon="≡"
            active
          />
          <Menu
            href="/collection"
            label="주문 수집"
            icon="↓"
          />
          <Menu
            href="/outbound"
            label="출고 관리"
            icon="→"
          />
          <Menu
            href="/inventory"
            label="재고 관리"
            icon="▤"
          />
        </nav>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          padding: "34px 42px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
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
              주문 등록
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              B2B 주문을 등록합니다.
            </p>
          </div>

          <Link
            href="/orders"
            style={{
              padding: "12px 18px",
              border: "1px solid #d1d5db",
              borderRadius: "9px",
              color: "#374151",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 700,
              background: "#ffffff",
            }}
          >
            ← 주문 목록
          </Link>
        </header>

        {message && (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px 18px",
              borderRadius: "10px",
              background:
                message.includes("정상적으로")
                  ? "#ecfdf5"
                  : "#fef2f2",
              border:
                message.includes("정상적으로")
                  ? "1px solid #a7f3d0"
                  : "1px solid #fecaca",
              color:
                message.includes("정상적으로")
                  ? "#047857"
                  : "#b91c1c",
              fontSize: "14px",
              fontWeight: 600,
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        )}

        <section style={cardStyle}>
          <SectionTitle
            title="주문 기본정보"
            description="거래처와 주문 정보를 입력합니다."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr 1fr",
              gap: "18px",
            }}
          >
            <Field label="거래처">
              <select
                value={customerId}
                onChange={(e) =>
                  handleCustomerChange(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  거래처 선택
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.code
                        ? `${customer.code} / `
                        : ""}
                      {customer.name}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="판매채널">
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value)
                }
                style={inputStyle}
              >
                <option value="">
                  판매채널 선택
                </option>

                <option value="oliveyoung">
                  올리브영
                </option>

                <option value="daiso">
                  다이소
                </option>

                <option value="convenience">
                  편의점
                </option>

                <option value="discount">
                  할인점
                </option>

                <option value="supermarket">
                  대형마트
                </option>

                <option value="online">
                  온라인
                </option>
              </select>
            </Field>

            <Field label="주문일자">
              <input
                type="date"
                value={orderDate}
                onChange={(e) =>
                  setOrderDate(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: "18px",
            }}
          >
            <Field label="메모">
              <textarea
                value={memo}
                onChange={(e) =>
                  setMemo(e.target.value)
                }
                placeholder="주문 관련 메모를 입력하세요."
                rows={3}
                style={{
                  ...inputStyle,
                  height: "auto",
                  padding: "12px 14px",
                  resize: "vertical",
                }}
              />
            </Field>
          </div>
        </section>

        <section style={cardStyle}>
          <SectionTitle
            title="주문상품"
            description="주문할 상품과 수량을 추가합니다."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "2fr 1fr 1fr auto",
              gap: "12px",
              alignItems: "end",
            }}
          >
            <Field label="상품">
              <select
                value={productId}
                onChange={(e) =>
                  handleProductChange(
                    e.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  상품 선택
                </option>

                {products.map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.code
                        ? `${product.code} / `
                        : ""}
                      {product.name}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="수량">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </Field>

            <Field label="단가">
              <input
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) =>
                  setUnitPrice(
                    Number(e.target.value)
                  )
                }
                style={inputStyle}
              />
            </Field>

            <button
              type="button"
              onClick={addItem}
              style={{
                height: "44px",
                padding: "0 20px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + 상품 추가
            </button>
          </div>

          <div
            style={{
              marginTop: "24px",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                  }}
                >
                  <th style={thStyle}>
                    상품
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      width: "160px",
                    }}
                  >
                    수량
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      width: "180px",
                    }}
                  >
                    단가
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      width: "180px",
                    }}
                  >
                    금액
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      width: "80px",
                    }}
                  >
                    삭제
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
                    >
                      <td style={tdStyle}>
                        <strong>
                          {
                            item.product_name
                          }
                        </strong>
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="number"
                          min="1"
                          value={
                            item.quantity
                          }
                          onChange={(e) =>
                            updateQuantity(
                              item.product_id,
                              Number(
                                e.target.value
                              )
                            )
                          }
                          style={{
                            ...smallInput,
                            textAlign:
                              "right",
                          }}
                        />
                      </td>

                      <td style={tdStyle}>
                        <input
                          type="number"
                          min="0"
                          value={
                            item.unit_price
                          }
                          onChange={(e) =>
                            updatePrice(
                              item.product_id,
                              Number(
                                e.target.value
                              )
                            )
                          }
                          style={{
                            ...smallInput,
                            textAlign:
                              "right",
                          }}
                        />
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          textAlign:
                            "right",
                          fontWeight: 700,
                        }}
                      >
                        {(
                          item.quantity *
                          item.unit_price
                        ).toLocaleString()}
                        원
                      </td>

                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(
                              item.product_id
                            )
                          }
                          style={{
                            border: "none",
                            background:
                              "#fee2e2",
                            color:
                              "#b91c1c",
                            borderRadius:
                              "7px",
                            padding:
                              "7px 10px",
                            cursor:
                              "pointer",
                            fontWeight:
                              700,
                          }}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "50px",
                        textAlign:
                          "center",
                        color:
                          "#94a3b8",
                        fontSize:
                          "14px",
                      }}
                    >
                      등록된 상품이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              주문상품
            </div>

            <div
              style={{
                marginTop: "6px",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              {items.length}종 /{" "}
              {totalQuantity.toLocaleString()}
              개
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              주문금액
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "30px",
                fontWeight: 800,
                color: "#2563eb",
              }}
            >
              {totalAmount.toLocaleString()}
              원
            </div>
          </div>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginBottom: "40px",
          }}
        >
          <Link
            href="/orders"
            style={{
              padding: "14px 24px",
              border:
                "1px solid #d1d5db",
              borderRadius: "9px",
              color: "#374151",
              background: "#ffffff",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            취소
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "14px 30px",
              border: "none",
              borderRadius: "9px",
              background: loading
                ? "#94a3b8"
                : "#2563eb",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "등록 중..."
              : "주문 등록"}
          </button>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   ERROR FORMAT
========================================================= */

function formatSupabaseError(
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  }
) {
  return [
    `코드: ${error.code || "-"}`,
    `메시지: ${error.message || "-"}`,
    `상세: ${error.details || "-"}`,
    `힌트: ${error.hint || "-"}`,
  ].join("\n");
}

/* =========================================================
   MENU
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
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: "13px 14px",
        borderRadius: "10px",
        color: active
          ? "#ffffff"
          : "#cbd5e1",
        background: active
          ? "#2563eb"
          : "transparent",
        textDecoration: "none",
        fontSize: "15px",
        fontWeight: active
          ? 700
          : 500,
      }}
    >
      <span
        style={{
          width: "20px",
          textAlign: "center",
          fontSize: "17px",
        }}
      >
        {icon}
      </span>

      {label}
    </Link>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        marginBottom: "22px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: "20px",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          color: "#64748b",
          fontSize: "13px",
        }}
      >
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

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
          marginBottom: "8px",
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

/* =========================================================
   STYLE
========================================================= */

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  height: "44px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "0 13px",
  fontSize: "14px",
  background: "#ffffff",
  color: "#111827",
  outline: "none",
};

const smallInput = {
  width: "100%",
  height: "36px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  padding: "0 9px",
  fontSize: "13px",
};

const thStyle = {
  padding: "13px 15px",
  textAlign: "left" as const,
  fontSize: "13px",
  color: "#64748b",
  fontWeight: 700,
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "14px 15px",
  fontSize: "13px",
  borderBottom: "1px solid #f1f5f9",
};

/* =========================================================
   TODAY
========================================================= */

function getToday() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}