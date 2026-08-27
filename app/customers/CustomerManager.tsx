"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  code: string;
  name: string;
  channel: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  initialCustomers: Customer[];
  initialError: string | null;
};

const CHANNELS = [
  {
    value: "oliveyoung",
    label: "올리브영",
  },
  {
    value: "daiso",
    label: "다이소",
  },
  {
    value: "convenience",
    label: "편의점",
  },
  {
    value: "discount",
    label: "할인점",
  },
];

export default function CustomerManager({
  initialCustomers,
  initialError,
}: Props) {
  const supabase = createClient();

  const [customers, setCustomers] =
    useState<Customer[]>(
      initialCustomers
    );

  const [search, setSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(initialError);

  const [form, setForm] = useState({
    code: "",
    name: "",
    channel: "",
    active: true,
  });

  /* =====================================================
     검색
  ===================================================== */

  const filteredCustomers = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return customers;
    }

    return customers.filter(
      (customer) =>
        customer.code
          .toLowerCase()
          .includes(keyword) ||
        customer.name
          .toLowerCase()
          .includes(keyword) ||
        customer.channel
          .toLowerCase()
          .includes(keyword)
    );
  }, [customers, search]);

  /* =====================================================
     신규 거래처
  ===================================================== */

  function openCreate() {
    setEditingCustomer(null);

    setForm({
      code: "",
      name: "",
      channel: "",
      active: true,
    });

    setError(null);
    setShowModal(true);
  }

  /* =====================================================
     거래처 수정
  ===================================================== */

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);

    setForm({
      code: customer.code,
      name: customer.name,
      channel: customer.channel,
      active: customer.active,
    });

    setError(null);
    setShowModal(true);
  }

  /* =====================================================
     모달 닫기
  ===================================================== */

  function closeModal() {
    if (loading) return;

    setShowModal(false);
    setEditingCustomer(null);
  }

  /* =====================================================
     저장
  ===================================================== */

  async function saveCustomer() {
    if (!form.code.trim()) {
      setError(
        "거래처 코드를 입력해주세요."
      );
      return;
    }

    if (!form.name.trim()) {
      setError(
        "거래처명을 입력해주세요."
      );
      return;
    }

    if (!form.channel) {
      setError(
        "채널을 선택해주세요."
      );
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      channel: form.channel,
      active: form.active,
      updated_at:
        new Date().toISOString(),
    };

    try {
      /* ==========================================
         신규 등록
      ========================================== */

      if (!editingCustomer) {
        const {
          data,
          error,
        } = await supabase
          .from("customers")
          .insert({
            ...payload,
            created_at:
              new Date().toISOString(),
          })
          .select("*")
          .single();

        if (error) {
          console.error(
            "CUSTOMER INSERT ERROR",
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
            "거래처 등록 결과가 없습니다."
          );
          return;
        }

        setCustomers((current) => [
          ...current,
          data,
        ]);

        setShowModal(false);

        return;
      }

      /* ==========================================
         수정
      ========================================== */

      const {
        data,
        error,
      } = await supabase
        .from("customers")
        .update(payload)
        .eq(
          "id",
          editingCustomer.id
        )
        .select("*")
        .single();

      if (error) {
        console.error(
          "CUSTOMER UPDATE ERROR",
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
          "거래처 수정 결과가 없습니다."
        );
        return;
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.id ===
          editingCustomer.id
            ? data
            : customer
        )
      );

      setShowModal(false);
      setEditingCustomer(null);

    } catch (err) {
      console.error(
        "CUSTOMER SAVE ERROR",
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
     사용중 / 중지
  ===================================================== */

  async function toggleActive(
    customer: Customer
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("customers")
      .update({
        active: !customer.active,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        customer.id
      )
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    if (!data) return;

    setCustomers((current) =>
      current.map((item) =>
        item.id === customer.id
          ? data
          : item
      )
    );
  }

  /* =====================================================
     삭제
  ===================================================== */

  async function deleteCustomer(
    customer: Customer
  ) {
    const confirmed =
      window.confirm(
        `"${customer.name}" 거래처를 삭제하시겠습니까?\n\n주의: 해당 거래처와 연결된 상품 매핑이나 주문 데이터가 있으면 삭제가 제한될 수 있습니다.`
      );

    if (!confirmed) {
      return;
    }

    setError(null);

    const {
      error,
    } = await supabase
      .from("customers")
      .delete()
      .eq(
        "id",
        customer.id
      );

    if (error) {
      console.error(
        "CUSTOMER DELETE ERROR",
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

    setCustomers((current) =>
      current.filter(
        (item) =>
          item.id !== customer.id
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
            active
          />

          <MenuItem
            href="/delivery-targets"
            label="납품처 관리"
            icon="□"
          />

          <MenuItem
            href="/products"
            label="상품 관리"
            icon="□"
          />

          <MenuItem
            href="/customer-products"
            label="거래처 상품 매핑"
            icon="↔"
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
            display: "flex",
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
                color: "#64748b",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              CUSTOMER MANAGEMENT
            </div>

            <h1
              style={{
                margin:
                  "6px 0 0",
                fontSize: "32px",
                fontWeight: 800,
              }}
            >
              거래처 관리
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",
                color: "#64748b",
                fontSize: "15px",
              }}
            >
              OMS에서 주문을 수집하고 관리할 거래처를 관리합니다.
            </p>
          </div>

          <button
            onClick={
              openCreate
            }
            style={
              primaryButton
            }
          >
            + 거래처 등록
          </button>
        </header>

        {/* ERROR */}

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
            <strong>
              거래처 처리 오류
            </strong>

            <div
              style={{
                marginTop:
                  "6px",
              }}
            >
              {error}
            </div>
          </div>
        )}

        {/* SEARCH */}

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
          }}
        >
          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="거래처 코드 / 거래처명 / 채널 검색"
            style={{
              ...inputStyle,
              maxWidth:
                "500px",
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
              fontWeight: 800,
            }}
          >
            거래처 목록

            <span
              style={{
                marginLeft:
                  "8px",
                color:
                  "#2563eb",
              }}
            >
              {
                filteredCustomers.length
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
                borderCollapse:
                  "collapse",
                minWidth:
                  "900px",
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
                    No
                  </th>

                  <th style={th}>
                    거래처 코드
                  </th>

                  <th style={th}>
                    거래처명
                  </th>

                  <th style={th}>
                    채널
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
                {filteredCustomers.map(
                  (
                    customer,
                    index
                  ) => (
                    <tr
                      key={
                        customer.id
                      }
                    >
                      <td style={td}>
                        {index + 1}
                      </td>

                      <td
                        style={{
                          ...td,
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          customer.code
                        }
                      </td>

                      <td
                        style={{
                          ...td,
                          fontSize:
                            "15px",
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          customer.name
                        }
                      </td>

                      <td style={td}>
                        {
                          channelLabel(
                            customer.channel
                          )
                        }
                      </td>

                      <td style={td}>
                        <button
                          onClick={() =>
                            toggleActive(
                              customer
                            )
                          }
                          style={{
                            border: 0,
                            cursor:
                              "pointer",
                            padding:
                              "7px 12px",
                            borderRadius:
                              "999px",
                            background:
                              customer.active
                                ? "#dcfce7"
                                : "#f1f5f9",
                            color:
                              customer.active
                                ? "#15803d"
                                : "#64748b",
                            fontWeight:
                              700,
                            fontSize:
                              "12px",
                          }}
                        >
                          {customer.active
                            ? "사용중"
                            : "중지"}
                        </button>
                      </td>

                      <td style={td}>
                        {formatDate(
                          customer.created_at
                        )}
                      </td>

                      <td
                        style={{
                          ...td,
                          display:
                            "flex",
                          gap:
                            "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            openEdit(
                              customer
                            )
                          }
                          style={
                            editButton
                          }
                        >
                          수정
                        </button>

                        <button
                          onClick={() =>
                            deleteCustomer(
                              customer
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

                {filteredCustomers.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding:
                          "60px",
                        textAlign:
                          "center",
                        color:
                          "#94a3b8",
                      }}
                    >
                      거래처가 없습니다.
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width:
                "560px",
              maxWidth:
                "calc(100vw - 40px)",
              background:
                "#fff",
              borderRadius:
                "18px",
              padding:
                "30px",
              boxShadow:
                "0 20px 50px rgba(0,0,0,.18)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize:
                  "23px",
                fontWeight:
                  800,
              }}
            >
              {editingCustomer
                ? "거래처 수정"
                : "거래처 등록"}
            </h2>

            <div
              style={{
                marginTop:
                  "26px",
                display:
                  "grid",
                gap:
                  "18px",
              }}
            >
              <FormField
                label="거래처 코드"
              >
                <input
                  value={
                    form.code
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code:
                        e.target
                          .value,
                    })
                  }
                  placeholder="예: C-OLIVEYOUNG"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <FormField
                label="거래처명"
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
                  placeholder="예: 올리브영"
                  style={
                    inputStyle
                  }
                />
              </FormField>

              <FormField
                label="채널"
              >
                <select
                  value={
                    form.channel
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channel:
                        e.target
                          .value,
                    })
                  }
                  style={
                    inputStyle
                  }
                >
                  <option value="">
                    채널 선택
                  </option>

                  {CHANNELS.map(
                    (channel) => (
                      <option
                        key={
                          channel.value
                        }
                        value={
                          channel.value
                        }
                      >
                        {
                          channel.label
                        }
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <label
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "10px",
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

            <div
              style={{
                marginTop:
                  "30px",
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
                  saveCustomer
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
                  : editingCustomer
                  ? "수정 저장"
                  : "거래처 등록"}
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
        alignItems:
          "center",
        gap: "13px",
        padding:
          "13px 14px",
        borderRadius:
          "10px",
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
   HELPERS
========================================================= */

function channelLabel(
  channel: string
) {
  const found =
    CHANNELS.find(
      (item) =>
        item.value ===
        channel
    );

  return (
    found?.label ??
    channel
  );
}

function formatDate(
  value: string
) {
  if (!value) return "-";

  return new Date(
    value
  ).toLocaleDateString(
    "ko-KR"
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
  border: 0,
  background:
    "#2563eb",
  color: "#fff",
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
    "#fff",
  padding:
    "11px 18px",
  borderRadius:
    "9px",
  fontSize:
    "14px",
  cursor:
    "pointer",
};

const editButton = {
  border:
    "1px solid #bfdbfe",
  background:
    "#eff6ff",
  color:
    "#2563eb",
  padding:
    "7px 12px",
  borderRadius:
    "7px",
  cursor:
    "pointer",
  fontSize:
    "12px",
  fontWeight:
    700,
};

const deleteButton = {
  border:
    "1px solid #fecaca",
  background:
    "#fff",
  color:
    "#dc2626",
  padding:
    "7px 12px",
  borderRadius:
    "7px",
  cursor:
    "pointer",
  fontSize:
    "12px",
  fontWeight:
    700,
};