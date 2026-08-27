"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  code: string;
  name: string;
  channel: string;
  active: boolean;
};

type Product = {
  id: string;
  product_code: string;
  barcode: string | null;
  name: string;
  specification: string | null;
  unit: string;
  active: boolean;
};

type Mapping = {
  id: string;
  customer_id: string;
  product_id: string;
  customer_product_code: string;
  customer_product_name: string | null;
  barcode: string | null;
  active: boolean;
  customers?: Customer;
  products?: Product;
};

type Props = {
  initialCustomers: Customer[];
  initialProducts: Product[];
  initialMappings: Mapping[];
  initialError: string | null;
};

export default function CustomerProductManager({
  initialCustomers,
  initialProducts,
  initialMappings,
  initialError,
}: Props) {
  const supabase = createClient();

  const [customers] =
    useState<Customer[]>(
      initialCustomers
    );

  const [products] =
    useState<Product[]>(
      initialProducts
    );

  const [mappings, setMappings] =
    useState<Mapping[]>(
      initialMappings
    );

  const [customerId, setCustomerId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(initialError);

  const [form, setForm] = useState({
    customer_id: "",
    product_id: "",
    customer_product_code: "",
    customer_product_name: "",
    barcode: "",
    active: true,
  });

  /* =====================================================
     거래처 필터
  ===================================================== */

  const filteredMappings = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return mappings.filter((mapping) => {
      const matchesCustomer =
        !customerId ||
        mapping.customer_id ===
          customerId;

      if (!matchesCustomer) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        mapping.customer_product_code
          .toLowerCase()
          .includes(keyword) ||
        (
          mapping.customer_product_name ??
          ""
        )
          .toLowerCase()
          .includes(keyword) ||
        (
          mapping.products?.product_code ??
          ""
        )
          .toLowerCase()
          .includes(keyword) ||
        (
          mapping.products?.name ??
          ""
        )
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [
    mappings,
    customerId,
    search,
  ]);

  /* =====================================================
     등록창
  ===================================================== */

  function openModal() {
    setForm({
      customer_id:
        customerId ||
        "",

      product_id: "",

      customer_product_code:
        "",

      customer_product_name:
        "",

      barcode: "",

      active: true,
    });

    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (loading) return;

    setShowModal(false);
  }

  /* =====================================================
     저장
  ===================================================== */

  async function saveMapping() {
    if (!form.customer_id) {
      setError(
        "거래처를 선택해주세요."
      );
      return;
    }

    if (!form.product_id) {
      setError(
        "송림물류 상품을 선택해주세요."
      );
      return;
    }

    if (
      !form.customer_product_code.trim()
    ) {
      setError(
        "거래처 상품코드를 입력해주세요."
      );
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      customer_id:
        form.customer_id,

      product_id:
        form.product_id,

      customer_product_code:
        form.customer_product_code.trim(),

      customer_product_name:
        form.customer_product_name.trim() ||
        null,

      barcode:
        form.barcode.trim() ||
        null,

      active:
        form.active,
    };

    try {
      const {
        data,
        error,
      } = await supabase
        .from("customer_products")
        .insert(payload)
        .select(`
          *,
          customers (
            id,
            code,
            name,
            channel
          ),
          products (
            id,
            product_code,
            name,
            specification,
            unit
          )
        `)
        .single();

      if (error) {
        console.error(
          "거래처 상품 매핑 저장 오류:",
          error
        );

        setError(
          [
            `code: ${error.code ?? "-"}`,
            `message: ${error.message ?? "-"}`,
            `details: ${error.details ?? "-"}`,
            `hint: ${error.hint ?? "-"}`,
          ].join("\n")
        );

        return;
      }

      if (!data) {
        setError(
          "저장 결과가 없습니다."
        );
        return;
      }

      setMappings((current) => [
        data,
        ...current,
      ]);

      setShowModal(false);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err)
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     상태 변경
  ===================================================== */

  async function toggleActive(
    mapping: Mapping
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("customer_products")
      .update({
        active:
          !mapping.active,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", mapping.id)
      .select(`
        *,
        customers (
          id,
          code,
          name,
          channel
        ),
        products (
          id,
          product_code,
          name,
          specification,
          unit
        )
      `)
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setMappings((current) =>
      current.map((item) =>
        item.id === mapping.id
          ? data
          : item
      )
    );
  }

  /* =====================================================
     삭제
  ===================================================== */

  async function deleteMapping(
    mapping: Mapping
  ) {
    if (
      !window.confirm(
        `"${mapping.customer_product_code}" 매핑을 삭제하시겠습니까?`
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("customer_products")
        .delete()
        .eq(
          "id",
          mapping.id
        );

    if (error) {
      setError(error.message);
      return;
    }

    setMappings((current) =>
      current.filter(
        (item) =>
          item.id !==
          mapping.id
      )
    );
  }

  /* =====================================================
     화면
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
      {/* SIDEBAR */}

      <aside
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "#111827",
          color: "#fff",
          padding:
            "28px 18px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding:
              "0 12px 28px",
            borderBottom:
              "1px solid rgba(255,255,255,.1)",
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
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <MenuItem
            href="/"
            label="대시보드"
            icon="▦"
          />

          <MenuItem
            href="/customers"
            label="화주사 관리"
            icon="▣"
          />

          <MenuItem
                      href="/delivery-targets"
                      label="납품처 관리" icon={""}          />

          <MenuItem
            href="/products"
            label="상품 관리"
            icon="□"
          />

          <MenuItem
            href="/customer-products"
            label="화주사 상품 매핑"
            icon="↔"
            active
          />

          <MenuItem
            href="/orders"
            label="주문 관리"
            icon="≡"
          />

          <MenuItem
            href="/collection"
            label="주문 수집"
            icon="↓"
          />

          <MenuItem
            href="/outbound"
            label="출고 관리"
            icon="→"
          />

          <MenuItem
            href="/inventory"
            label="재고 관리"
            icon="▤"
          />
        </nav>
      </aside>

      {/* CONTENT */}

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
            marginBottom: "30px",
          }}
        >
          <div>
            <div
              style={{
                color: "#64748b",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              PRODUCT MAPPING
            </div>

            <h1
              style={{
                margin:
                  "6px 0 0",
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              거래처 상품 매핑
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              거래처별 외부 상품코드를 송림물류 상품과 연결합니다.
            </p>
          </div>

          <button
            onClick={
              openModal
            }
            style={
              primaryButton
            }
          >
            + 상품 매핑
          </button>
        </header>

        {error && (
          <div
            style={{
              whiteSpace:
                "pre-line",
              marginBottom:
                "20px",
              padding:
                "16px 18px",
              background:
                "#fee2e2",
              color:
                "#b91c1c",
              border:
                "1px solid #fecaca",
              borderRadius:
                "10px",
            }}
          >
            {error}
          </div>
        )}

        {/* FILTER */}

        <section
          style={{
            background:
              "#fff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "14px",
            padding:
              "18px",
            marginBottom:
              "18px",
            display:
              "flex",
            gap:
              "12px",
          }}
        >
          <select
            value={
              customerId
            }
            onChange={(e) =>
              setCustomerId(
                e.target.value
              )
            }
            style={
              selectStyle
            }
          >
            <option value="">
              전체 거래처
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

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="거래처 상품코드 / 상품명 / 송림상품 검색"
            style={{
              ...inputStyle,
              flex: 1,
            }}
          />
        </section>

        {/* TABLE */}

        <section
          style={{
            background:
              "#fff",
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
                "20px 22px",
              borderBottom:
                "1px solid #e5e7eb",
              fontWeight:
                800,
            }}
          >
            거래처 상품 매핑

            <span
              style={{
                marginLeft:
                  "8px",
                color:
                  "#2563eb",
              }}
            >
              {
                filteredMappings.length
              }
            </span>
          </div>

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
                minWidth:
                  "1100px",
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
                  <th style={th}>
                    거래처
                  </th>

                  <th style={th}>
                    거래처 상품코드
                  </th>

                  <th style={th}>
                    거래처 상품명
                  </th>

                  <th style={th}>
                    송림 상품코드
                  </th>

                  <th style={th}>
                    송림 상품명
                  </th>

                  <th style={th}>
                    바코드
                  </th>

                  <th style={th}>
                    상태
                  </th>

                  <th style={th}>
                    관리
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredMappings.map(
                  (mapping) => (
                    <tr
                      key={
                        mapping.id
                      }
                    >
                      <td style={td}>
                        {
                          mapping
                            .customers
                            ?.name
                        }
                      </td>

                      <td
                        style={{
                          ...td,
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          mapping.customer_product_code
                        }
                      </td>

                      <td style={td}>
                        {
                          mapping.customer_product_name ||
                          "-"
                        }
                      </td>

                      <td style={td}>
                        {
                          mapping.products
                            ?.product_code
                        }
                      </td>

                      <td style={td}>
                        {
                          mapping.products
                            ?.name
                        }
                      </td>

                      <td style={td}>
                        {
                          mapping.barcode ||
                          "-"
                        }
                      </td>

                      <td style={td}>
                        <button
                          onClick={() =>
                            toggleActive(
                              mapping
                            )
                          }
                          style={{
                            border: 0,
                            cursor:
                              "pointer",
                            padding:
                              "6px 11px",
                            borderRadius:
                              "999px",
                            background:
                              mapping.active
                                ? "#dcfce7"
                                : "#f1f5f9",
                            color:
                              mapping.active
                                ? "#15803d"
                                : "#64748b",
                            fontWeight:
                              700,
                            fontSize:
                              "12px",
                          }}
                        >
                          {mapping.active
                            ? "사용중"
                            : "중지"}
                        </button>
                      </td>

                      <td style={td}>
                        <button
                          onClick={() =>
                            deleteMapping(
                              mapping
                            )
                          }
                          style={
                            deleteButton
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {filteredMappings.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding:
                          "60px",
                        textAlign:
                          "center",
                        color:
                          "#94a3b8",
                      }}
                    >
                      등록된 거래처 상품 매핑이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {/* MODAL */}

      {showModal && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,.45)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width:
                "650px",
              maxWidth:
                "calc(100vw - 40px)",
              background:
                "#fff",
              borderRadius:
                "18px",
              padding:
                "28px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize:
                  "22px",
                fontWeight:
                  800,
              }}
            >
              거래처 상품 매핑
            </h2>

            <div
              style={{
                marginTop:
                  "24px",
                display:
                  "grid",
                gap:
                  "18px",
              }}
            >
              <FormField
                label="거래처"
              >
                <select
                  value={
                    form.customer_id
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_id:
                        e.target.value,
                    })
                  }
                  style={
                    selectStyle
                  }
                >
                  <option value="">
                    거래처 선택
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
              </FormField>

              <FormField
                label="송림물류 상품"
              >
                <select
                  value={
                    form.product_id
                  }
                  onChange={(e) => {
                    const product =
                      products.find(
                        (item) =>
                          item.id ===
                          e.target
                            .value
                      );

                    setForm({
                      ...form,
                      product_id:
                        e.target.value,
                      customer_product_name:
                        product?.name ??
                        "",
                      barcode:
                        product?.barcode ??
                        "",
                    });
                  }}
                  style={
                    selectStyle
                  }
                >
                  <option value="">
                    송림물류 상품 선택
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
                        {product.product_code} ·{" "}
                        {product.name}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField
                label="거래처 상품코드"
              >
                <input
                  value={
                    form.customer_product_code
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_product_code:
                        e.target.value,
                    })
                  }
                  placeholder="예: OLIVE-001"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <FormField
                label="거래처 상품명"
              >
                <input
                  value={
                    form.customer_product_name
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      customer_product_name:
                        e.target.value,
                    })
                  }
                  placeholder="거래처에서 사용하는 상품명"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <FormField
                label="바코드"
              >
                <input
                  value={
                    form.barcode
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      barcode:
                        e.target.value,
                    })
                  }
                  placeholder="바코드"
                  style={
                    inputStyle
                  }
                />
              </FormField>
            </div>

            <div
              style={{
                marginTop:
                  "28px",
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap:
                  "10px",
              }}
            >
              <button
                onClick={
                  closeModal
                }
                style={
                  cancelButton
                }
              >
                취소
              </button>

              <button
                onClick={
                  saveMapping
                }
                disabled={
                  loading
                }
                style={
                  primaryButton
                }
              >
                {loading
                  ? "저장중..."
                  : "매핑 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


/* =========================================================
   COMPONENTS
========================================================= */

function MenuItem({
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
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: "13px 14px",
        borderRadius: "10px",
        color:
          active
            ? "#fff"
            : "#cbd5e1",
        background:
          active
            ? "#2563eb"
            : "transparent",
        textDecoration:
          "none",
        fontSize: "15px",
        fontWeight:
          active
            ? 700
            : 500,
      }}
    >
      <span
        style={{
          width: "20px",
          textAlign: "center",
        }}
      >
        {icon}
      </span>

      {label}
    </a>
  );
}

function FormField({
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
          color: "#475569",
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

const th = {
  padding: "14px 16px",
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 700,
  borderBottom:
    "1px solid #e5e7eb",
  whiteSpace:
    "nowrap" as const,
};

const td = {
  padding: "15px 16px",
  fontSize: "13px",
  borderBottom:
    "1px solid #f1f5f9",
  whiteSpace:
    "nowrap" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #d1d5db",
  borderRadius: "9px",
  padding:
    "12px 14px",
  fontSize: "14px",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  background: "#fff",
};

const primaryButton = {
  border: 0,
  background: "#2563eb",
  color: "#fff",
  padding:
    "13px 20px",
  borderRadius: "9px",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const cancelButton = {
  border:
    "1px solid #d1d5db",
  background: "#fff",
  padding:
    "11px 18px",
  borderRadius: "9px",
  fontSize: "14px",
  cursor: "pointer",
};

const deleteButton = {
  border:
    "1px solid #fecaca",
  background: "#fff",
  color: "#dc2626",
  padding:
    "6px 10px",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
};