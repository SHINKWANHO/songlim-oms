"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  product_code: string;
  barcode: string | null;
  name: string;
  specification: string | null;
  unit: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialProducts: Product[];
  initialError: string | null;
};

export default function ProductManager({
  initialProducts,
  initialError,
}: Props) {
  const supabase = createClient();

  const [products, setProducts] =
    useState<Product[]>(initialProducts);

  const [search, setSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(initialError);

  const [form, setForm] = useState({
    product_code: "",
    barcode: "",
    name: "",
    specification: "",
    unit: "EA",
    active: true,
  });

  /* =====================================================
     검색
  ===================================================== */

  const filteredProducts = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.product_code
          .toLowerCase()
          .includes(keyword) ||
        (product.barcode ?? "")
          .toLowerCase()
          .includes(keyword) ||
        product.name
          .toLowerCase()
          .includes(keyword) ||
        (product.specification ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [products, search]);

  /* =====================================================
     등록
  ===================================================== */

  function openCreateModal() {
    setEditingProduct(null);

    setForm({
      product_code: "",
      barcode: "",
      name: "",
      specification: "",
      unit: "EA",
      active: true,
    });

    setError(null);
    setShowModal(true);
  }

  /* =====================================================
     수정
  ===================================================== */

  function openEditModal(
    product: Product
  ) {
    setEditingProduct(product);

    setForm({
      product_code:
        product.product_code,

      barcode:
        product.barcode ?? "",

      name:
        product.name,

      specification:
        product.specification ?? "",

      unit:
        product.unit,

      active:
        product.active,
    });

    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (loading) return;

    setShowModal(false);
    setEditingProduct(null);
  }

  /* =====================================================
     저장
  ===================================================== */

  async function saveProduct() {    
  if (!form.product_code.trim()) {
    setError("상품코드를 입력해주세요.");
    return;
  }

  if (!form.name.trim()) {
    setError("상품명을 입력해주세요.");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // ==========================================
    // 1. 브라우저 Supabase SELECT 테스트
    // ==========================================

    const {
      data: testData,
      error: testError,
    } = await supabase
      .from("products")
      .select("id, product_code, name")
      .limit(1);


    // ==========================================
    // 2. 상품 저장 데이터
    // ==========================================

    const payload = {
      product_code:
        form.product_code.trim(),

      barcode:
        form.barcode.trim() || null,

      name:
        form.name.trim(),

      specification:
        form.specification.trim() || null,

      unit:
        form.unit.trim() || "EA",

      active:
        form.active,
    };

    // ==========================================
    // 3. 상품 등록
    // ==========================================

    if (!editingProduct) {
      const {
        data,
        error,
      } = await supabase
        .from("products")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
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
          "상품 등록 결과가 없습니다."
        );

        return;
      }

      setProducts((current) => [
        data,
        ...current,
      ]);

      setShowModal(false);
      setEditingProduct(null);

      return;
    }

    // ==========================================
    // 4. 상품 수정
    // ==========================================

    const {
      data,
      error,
    } = await supabase
      .from("products")
      .update(payload)
      .eq(
        "id",
        editingProduct.id
      )
      .select("*")
      .single();

    console.log(
      "PRODUCT UPDATE RESULT:",
      JSON.stringify(
        {
          data,
          error: error
            ? {
                message:
                  error.message,
                details:
                  error.details,
                hint:
                  error.hint,
                code:
                  error.code,
              }
            : null,
        },
        null,
        2
      )
    );

    if (error) {
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
        "상품 수정 결과가 없습니다."
      );

      return;
    }

    setProducts((current) =>
      current.map((product) =>
        product.id ===
        editingProduct.id
          ? data
          : product
      )
    );

    setShowModal(false);
    setEditingProduct(null);

  } catch (err) {
    console.error(
      "PRODUCT SAVE EXCEPTION:",
      err
    );

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
     사용 / 중지
  ===================================================== */

  async function toggleActive(
    product: Product
  ) {
    const { data, error } =
      await supabase
        .from("products")
        .update({
          active:
            !product.active,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          product.id
        )
        .select()
        .single();

    if (error) {
      setError(error.message);
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? data
          : item
      )
    );
  }

  /* =====================================================
     삭제
  ===================================================== */

  async function deleteProduct(
    product: Product
  ) {
    const confirmed =
      window.confirm(
        `"${product.name}" 상품을 삭제하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("products")
        .delete()
        .eq(
          "id",
          product.id
        );

    if (error) {
      setError(error.message);
      return;
    }

    setProducts((current) =>
      current.filter(
        (item) =>
          item.id !==
          product.id
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
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        style={{
          width: "240px",
          minHeight: "100vh",
          background: "#111827",
          color: "#ffffff",
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
              marginTop:
                "8px",
              fontSize: "23px",
              fontWeight: 800,
            }}
          >
            송림물류 OMS
          </div>
        </div>

        <nav
          style={{
            marginTop:
              "24px",
            display: "flex",
            flexDirection:
              "column",
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
            label="납품처 관리"
            icon="⌂"
          />

          <MenuItem
            href="/products"
            label="상품 관리"
            icon="□"
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

      {/* =================================================
          CONTENT
      ================================================= */}

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
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            marginBottom:
              "30px",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  "14px",
                fontWeight:
                  600,
              }}
            >
              MASTER DATA
            </div>

            <h1
              style={{
                margin:
                  "6px 0 0",
                fontSize:
                  "32px",
                fontWeight:
                  800,
              }}
            >
              상품 관리
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color:
                  "#64748b",
                fontSize:
                  "15px",
              }}
            >
              송림물류 상품 마스터를 관리합니다.
            </p>
          </div>

          <button
            onClick={
              openCreateModal
            }
            style={
              primaryButton
            }
          >
            + 상품 등록
          </button>
        </header>

        {error && (
          <div
            style={{
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
            <strong>
              Supabase 오류
            </strong>

            <div
              style={{
                marginTop:
                  "5px",
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* 검색 */}

        <section
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e5e7eb",
            borderRadius:
              "14px",
            padding:
              "18px",
            marginBottom:
              "18px",
          }}
        >
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="상품코드 / 바코드 / 상품명 / 규격 검색"
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              border:
                "1px solid #d1d5db",
              borderRadius:
                "9px",
              padding:
                "13px 14px",
              fontSize:
                "14px",
              outline:
                "none",
            }}
          />
        </section>

        {/* 목록 */}

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
                "20px 22px",
              borderBottom:
                "1px solid #e5e7eb",
              fontSize:
                "15px",
              fontWeight:
                800,
            }}
          >
            상품 목록

            <span
              style={{
                marginLeft:
                  "8px",
                color:
                  "#2563eb",
              }}
            >
              {filteredProducts.length}
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
                borderCollapse:
                  "collapse",
                minWidth:
                  "950px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "#f8fafc",
                    textAlign:
                      "left",
                  }}
                >
                  <th style={th}>
                    상품코드
                  </th>

                  <th style={th}>
                    바코드
                  </th>

                  <th style={th}>
                    상품명
                  </th>

                  <th style={th}>
                    규격
                  </th>

                  <th style={th}>
                    단위
                  </th>

                  <th style={th}>
                    상태
                  </th>

                  <th style={th}>
                    등록일
                  </th>

                  <th style={th}>
                    관리
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => (
                    <tr
                      key={
                        product.id
                      }
                    >
                      <td style={td}>
                        {
                          product.product_code
                        }
                      </td>

                      <td style={td}>
                        {
                          product.barcode ||
                          "-"
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
                          product.name
                        }
                      </td>

                      <td style={td}>
                        {
                          product.specification ||
                          "-"
                        }
                      </td>

                      <td style={td}>
                        {
                          product.unit
                        }
                      </td>

                      <td style={td}>
                        <button
                          onClick={() =>
                            toggleActive(
                              product
                            )
                          }
                          style={{
                            border:
                              0,
                            cursor:
                              "pointer",
                            padding:
                              "6px 11px",
                            borderRadius:
                              "999px",
                            background:
                              product.active
                                ? "#dcfce7"
                                : "#f1f5f9",
                            color:
                              product.active
                                ? "#15803d"
                                : "#64748b",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                          }}
                        >
                          {product.active
                            ? "사용중"
                            : "중지"}
                        </button>
                      </td>

                      <td
                        style={{
                          ...td,
                          color:
                            "#64748b",
                        }}
                      >
                        {formatDate(
                          product.created_at
                        )}
                      </td>

                      <td style={td}>
                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "7px",
                          }}
                        >
                          <button
                            onClick={() =>
                              openEditModal(
                                product
                              )
                            }
                            style={
                              actionButton
                            }
                          >
                            수정
                          </button>

                          <button
                            onClick={() =>
                              deleteProduct(
                                product
                              )
                            }
                            style={{
                              ...actionButton,
                              color:
                                "#dc2626",
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {filteredProducts.length ===
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
                      등록된 상품이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {/* =================================================
          MODAL
      ================================================= */}

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
            zIndex:
              1000,
          }}
        >
          <div
            style={{
              width:
                "620px",
              maxWidth:
                "calc(100vw - 40px)",
              background:
                "#ffffff",
              borderRadius:
                "18px",
              padding:
                "28px",
              boxShadow:
                "0 20px 60px rgba(0,0,0,.2)",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
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
                {editingProduct
                  ? "상품 수정"
                  : "상품 등록"}
              </h2>

              <button
                onClick={
                  closeModal
                }
                style={{
                  border:
                    0,
                  background:
                    "transparent",
                  fontSize:
                    "24px",
                  cursor:
                    "pointer",
                  color:
                    "#64748b",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop:
                  "24px",
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap:
                  "18px",
              }}
            >
              <FormField
                label="상품코드"
              >
                <input
                  value={
                    form.product_code
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      product_code:
                        e.target
                          .value,
                    })
                  }
                  placeholder="예: P000001"
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
                        e.target
                          .value,
                    })
                  }
                  placeholder="예: 8801234567890"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <FormField
                  label="상품명"
                >
                  <input
                    value={
                      form.name
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name:
                          e.target
                            .value,
                      })
                    }
                    placeholder="상품명을 입력하세요"
                    style={
                      inputStyle
                    }
                  />
                </FormField>
              </div>

              <FormField
                label="규격"
              >
                <input
                  value={
                    form.specification
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specification:
                        e.target
                          .value,
                    })
                  }
                  placeholder="예: 500ml"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <FormField
                label="단위"
              >
                <input
                  value={
                    form.unit
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit:
                        e.target
                          .value,
                    })
                  }
                  placeholder="EA"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >
                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "8px",
                    fontSize:
                      "14px",
                    fontWeight:
                      600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      form.active
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        active:
                          e.target
                            .checked,
                      })
                    }
                  />

                  사용중
                </label>
              </div>
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
                disabled={
                  loading
                }
                style={
                  cancelButton
                }
              >
                취소
              </button>

              <button
                onClick={
                  saveProduct
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
                  : "저장"}
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
          display:
            "block",
          marginBottom:
            "8px",
          fontSize:
            "13px",
          fontWeight:
            700,
          color:
            "#475569",
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}


/* =========================================================
   STYLES
========================================================= */

const th = {
  padding:
    "14px 16px",
  fontSize:
    "12px",
  color:
    "#64748b",
  fontWeight:
    700,
  borderBottom:
    "1px solid #e5e7eb",
  whiteSpace:
    "nowrap" as const,
};

const td = {
  padding:
    "15px 16px",
  fontSize:
    "13px",
  borderBottom:
    "1px solid #f1f5f9",
  whiteSpace:
    "nowrap" as const,
};

const inputStyle = {
  width:
    "100%",
  boxSizing:
    "border-box" as const,
  border:
    "1px solid #d1d5db",
  borderRadius:
    "9px",
  padding:
    "12px 14px",
  fontSize:
    "14px",
  outline:
    "none",
};

const primaryButton = {
  border:
    0,
  background:
    "#2563eb",
  color:
    "#ffffff",
  padding:
    "13px 20px",
  borderRadius:
    "9px",
  fontSize:
    "14px",
  fontWeight:
    700,
  cursor:
    "pointer",
};

const cancelButton = {
  border:
    "1px solid #d1d5db",
  background:
    "#ffffff",
  padding:
    "11px 18px",
  borderRadius:
    "9px",
  fontSize:
    "14px",
  cursor:
    "pointer",
};

const actionButton = {
  border:
    "1px solid #d1d5db",
  background:
    "#ffffff",
  padding:
    "6px 10px",
  borderRadius:
    "7px",
  cursor:
    "pointer",
  fontSize:
    "12px",
  fontWeight:
    700,
};


/* =========================================================
   DATE
========================================================= */

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "ko-KR"
  );
}