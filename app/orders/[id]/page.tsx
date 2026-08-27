"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  order_no: string | null;
  customer_id: string | null;
  channel: string | null;
  order_date: string | null;
  status: string | null;
  shipment_requested: boolean | null;
  confirmed_at: string | null;
  shipment_requested_at: string | null;
  memo: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  code: string | null;
  name: string;
};

type Product = {
  id: string;
  code: string | null;
  name: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const supabase = createClient();

  const orderId = String(params.id);

  const [order, setOrder] =
    useState<Order | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [items, setItems] =
    useState<OrderItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function loadOrder() {
    setLoading(true);
    setError("");

    const { data: orderData, error: orderError } =
      await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (orderError) {
      setError(orderError.message);
      setLoading(false);
      return;
    }

    setOrder(orderData);

    if (orderData.customer_id) {
      const { data: customerData } =
        await supabase
          .from("customers")
          .select("id, code, name")
          .eq(
            "id",
            orderData.customer_id
          )
          .single();

      setCustomer(
        customerData || null
      );
    }

    const { data: itemData } =
      await supabase
        .from("order_items")
        .select("*")
        .eq(
          "order_id",
          orderId
        );

    setItems(itemData || []);

    const productIds =
      (itemData || []).map(
        (item) =>
          item.product_id
      );

    if (productIds.length > 0) {
      const { data: productData } =
        await supabase
          .from("products")
          .select(
            "id, code, name"
          )
          .in(
            "id",
            productIds
          );

      setProducts(
        productData || []
      );
    }

    setLoading(false);
  }

  async function updateStatus(
    newStatus: string
  ) {
    if (!order) return;

    setSaving(true);
    setError("");

    const updateData: Record<
      string,
      unknown
    > = {
      status: newStatus,
      updated_at:
        new Date().toISOString(),
    };

    if (
      newStatus === "확정"
    ) {
      updateData.confirmed_at =
        new Date().toISOString();
    }

    const { error } =
      await supabase
        .from("orders")
        .update(updateData)
        .eq(
          "id",
          order.id
        );

    if (error) {
      setError(
        error.message
      );
    } else {
      await loadOrder();
    }

    setSaving(false);
  }

  async function requestShipment() {
    if (!order) return;

    if (
      order.status !==
      "확정"
    ) {
      alert(
        "확정된 주문만 출고요청할 수 있습니다."
      );
      return;
    }

    if (
      order.shipment_requested
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "이 주문을 출고요청하시겠습니까?"
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
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
          order.id
        );

    if (error) {
      setError(
        error.message
      );
    } else {
      await loadOrder();
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "80px",
          textAlign: "center",
          fontFamily:
            '"Malgun Gothic", "Noto Sans KR", Arial, sans-serif',
        }}
      >
        주문 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (!order) {
    return (
      <div
        style={{
          padding: "80px",
          textAlign: "center",
          fontFamily:
            '"Malgun Gothic", "Noto Sans KR", Arial, sans-serif',
        }}
      >
        주문을 찾을 수 없습니다.
      </div>
    );
  }

  const productMap =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ]
      )
    );

  const totalQuantity =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity || 0
        ),
      0
    );

  const totalAmount =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity || 0
        ) *
          Number(
            item.unit_price || 0
          ),
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
            active
          />

          <Menu
            href="/shipment-request"
            label="출고 요청"
            icon="→"
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
            alignItems: "center",
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
              주문 상세
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              주문 확인 및 출고요청 관리
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
            ← 주문 목록
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
            {error}
          </div>
        )}

        {/* =====================================================
            ORDER HEADER
        ===================================================== */}

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
              marginBottom:
                "24px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#64748b",
                  fontSize:
                    "13px",
                }}
              >
                주문번호
              </div>

              <div
                style={{
                  marginTop:
                    "5px",
                  fontSize:
                    "25px",
                  fontWeight:
                    800,
                }}
              >
                {order.order_no ||
                  "-"}
              </div>
            </div>

            <StatusBadge
              status={
                order.status
              }
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            <Info
              label="거래처"
              value={
                customer?.name ||
                "-"
              }
            />

            <Info
              label="거래처 코드"
              value={
                customer?.code ||
                "-"
              }
            />

            <Info
              label="판매채널"
              value={getChannelName(
                order.channel
              )}
            />

            <Info
              label="주문일"
              value={formatDate(
                order.order_date
              )}
            />
          </div>
        </section>

        {/* =====================================================
            STATUS ACTION
        ===================================================== */}

        <section
          style={cardStyle}
        >
          <h2
            style={{
              margin:
                "0 0 18px",
              fontSize:
                "19px",
              fontWeight:
                800,
            }}
          >
            주문 처리
          </h2>

          <div
            style={{
              display:
                "flex",
              gap:
                "10px",
              flexWrap:
                "wrap",
            }}
          >
            <ActionButton
              label="주문 확인"
              disabled={
                saving ||
                order.status !==
                  "접수"
              }
              onClick={() =>
                updateStatus(
                  "확인"
                )
              }
            />

            <ActionButton
              label="주문 확정"
              disabled={
                saving ||
                order.status !==
                  "확인"
              }
              onClick={() =>
                updateStatus(
                  "확정"
                )
              }
            />

            <ActionButton
              label={
                order.shipment_requested
                  ? "출고요청 완료"
                  : "출고요청"
              }
              disabled={
                saving ||
                order.status !==
                  "확정" ||
                !!order.shipment_requested
              }
              primary
              onClick={
                requestShipment
              }
            />

            <ActionButton
              label="주문 취소"
              disabled={
                saving ||
                order.status ===
                  "확정" ||
                order.status ===
                  "취소"
              }
              danger
              onClick={() =>
                updateStatus(
                  "취소"
                )
              }
            />
          </div>

          <div
            style={{
              marginTop:
                "18px",
              display:
                "flex",
              gap:
                "30px",
              fontSize:
                "13px",
              color:
                "#64748b",
            }}
          >
            <span>
              주문상태:{" "}
              <strong>
                {order.status}
              </strong>
            </span>

            <span>
              출고요청:{" "}
              <strong>
                {order.shipment_requested
                  ? "요청완료"
                  : "미요청"}
              </strong>
            </span>

            {order.confirmed_at && (
              <span>
                확정일:{" "}
                {formatDateTime(
                  order.confirmed_at
                )}
              </span>
            )}
          </div>
        </section>

        {/* =====================================================
            ITEMS
        ===================================================== */}

        <section
          style={cardStyle}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "19px",
                  fontWeight:
                    800,
                }}
              >
                주문상품
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
                총 {items.length}종 /
                {" "}
                {totalQuantity.toLocaleString()}
                개
              </p>
            </div>

            <div
              style={{
                fontSize:
                  "24px",
                fontWeight:
                  800,
                color:
                  "#2563eb",
              }}
            >
              {totalAmount.toLocaleString()}
              원
            </div>
          </div>

          <table
            style={{
              width:
                "100%",
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
              </tr>
            </thead>

            <tbody>
              {items.map(
                (item) => {
                  const product =
                    productMap.get(
                      item.product_id
                    );

                  const amount =
                    Number(
                      item.quantity
                    ) *
                    Number(
                      item.unit_price
                    );

                  return (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        {product?.code ||
                          "-"}
                      </td>

                      <td
                        style={{
                          ...tdStyle,
                          fontWeight:
                            700,
                        }}
                      >
                        {product?.name ||
                          "-"}
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
                        원
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
                        {amount.toLocaleString()}
                        원
                      </td>
                    </tr>
                  );
                }
              )}

              {items.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding:
                        "50px",
                      textAlign:
                        "center",
                      color:
                        "#94a3b8",
                    }}
                  >
                    주문상품이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* =====================================================
            MEMO
        ===================================================== */}

        <section
          style={cardStyle}
        >
          <h2
            style={{
              margin:
                "0 0 14px",
              fontSize:
                "19px",
              fontWeight:
                800,
            }}
          >
            주문 메모
          </h2>

          <div
            style={{
              padding:
                "16px",
              background:
                "#f8fafc",
              borderRadius:
                "9px",
              color:
                order.memo
                  ? "#374151"
                  : "#94a3b8",
              whiteSpace:
                "pre-wrap",
              minHeight:
                "60px",
            }}
          >
            {order.memo ||
              "등록된 메모가 없습니다."}
          </div>
        </section>

        <div
          style={{
            marginBottom:
              "40px",
            textAlign:
              "right",
          }}
        >
          <Link
            href="/orders"
            style={{
              color:
                "#64748b",
              textDecoration:
                "none",
              fontSize:
                "14px",
              fontWeight:
                700,
            }}
          >
            ← 주문 목록으로 돌아가기
          </Link>
        </div>
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

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize:
            "12px",
          color:
            "#94a3b8",
          fontWeight:
            700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop:
            "6px",
          fontSize:
            "15px",
          fontWeight:
            700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  primary = false,
  danger = false,
  onClick,
}: {
  label: string;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding:
          "12px 20px",
        border:
          primary || danger
            ? "none"
            : "1px solid #d1d5db",
        borderRadius:
          "8px",
        background:
          disabled
            ? "#e5e7eb"
            : primary
            ? "#2563eb"
            : danger
            ? "#dc2626"
            : "#ffffff",
        color:
          disabled
            ? "#9ca3af"
            : primary ||
              danger
            ? "#ffffff"
            : "#374151",
        cursor:
          disabled
            ? "not-allowed"
            : "pointer",
        fontSize:
          "14px",
        fontWeight:
          700,
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | string
    | null;
}) {
  const value =
    status || "접수";

  const style =
    value === "확정"
      ? {
          background:
            "#dcfce7",
          color:
            "#15803d",
        }
      : value === "취소"
      ? {
          background:
            "#fee2e2",
          color:
            "#b91c1c",
        }
      : value === "확인"
      ? {
          background:
            "#fef3c7",
          color:
            "#b45309",
        }
      : {
          background:
            "#eff6ff",
          color:
            "#2563eb",
        };

  return (
    <span
      style={{
        display:
          "inline-block",
        padding:
          "7px 13px",
        borderRadius:
          "999px",
        fontSize:
          "13px",
        fontWeight:
          700,
        ...style,
      }}
    >
      {value}
    </span>
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
    "ko-KR"
  );
}

/* =========================================================
   STYLE
========================================================= */

const cardStyle = {
  background:
    "#ffffff",
  border:
    "1px solid #e5e7eb",
  borderRadius:
    "16px",
  padding:
    "24px",
  marginBottom:
    "20px",
};

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