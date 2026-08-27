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
  group_id: string | null;
};

type Store = {
  id: string;
  customer_id: string;
  sales_channel_id: string | null;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  active: boolean;
};

export default function StoreManager() {
  const supabase = createClient();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [channels, setChannels] =
    useState<SalesChannel[]>([]);

  const [stores, setStores] =
    useState<Store[]>([]);

  const [customerId, setCustomerId] =
    useState("");

  const [channelId, setChannelId] =
    useState("");

  const [code, setCode] =
    useState("");

  const [name, setName] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
   * =========================================
   * 초기 데이터
   * =========================================
   */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [
      customerResult,
      channelResult,
      storeResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, code, name"
        )
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
        .select(`
          id,
          customer_id,
          sales_channel_id,
          code,
          name,
          address,
          phone,
          active
        `)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (customerResult.data) {
      setCustomers(
        customerResult.data
      );
    }

    if (channelResult.data) {
      setChannels(
        channelResult.data
      );
    }

    if (storeResult.data) {
      setStores(
        storeResult.data
      );
    }

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
  }

  /*
   * =========================================
   * 선택된 화주의 판매채널
   * =========================================
   */

  const customerChannels =
    channels.filter(
      (channel) =>
        channel.customer_id ===
        customerId
    );

  /*
   * =========================================
   * 화주 변경
   * =========================================
   */

  function handleCustomerChange(
    value: string
  ) {
    setCustomerId(value);

    setChannelId("");
  }

  /*
   * =========================================
   * 배송처 등록
   * =========================================
   */

  async function saveStore() {
    setMessage("");

    if (!customerId) {
      alert(
        "화주를 선택하세요."
      );
      return;
    }

    if (!channelId) {
      alert(
        "판매채널을 선택하세요."
      );
      return;
    }

    if (!code.trim()) {
      alert(
        "배송처 코드를 입력하세요."
      );
      return;
    }

    if (!name.trim()) {
      alert(
        "배송처명을 입력하세요."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("stores")
        .insert({
          customer_id:
            customerId,

          sales_channel_id:
            channelId,

          code:
            code.trim(),

          name:
            name.trim(),

          address:
            address.trim() ||
            null,

          phone:
            phone.trim() ||
            null,

          active: true,
        })
        .select()
        .single();

      if (error) {
  console.error(
    "STORE INSERT ERROR MESSAGE:",
    error.message
  );

  console.error(
    "STORE INSERT ERROR CODE:",
    error.code
  );

  console.error(
    "STORE INSERT ERROR DETAILS:",
    error.details
  );

  console.error(
    "STORE INSERT ERROR HINT:",
    error.hint
  );

  alert(
    `배송처 저장 오류\n\n${error.message}\n\nCODE: ${error.code}`
  );

  return;
}

      if (data) {
        setStores(
          (current) => [
            data,
            ...current,
          ]
        );
      }

      setMessage(
        "배송처가 등록되었습니다."
      );

      setCode("");
      setName("");
      setAddress("");
      setPhone("");
    } catch (error) {
      console.error(
        "STORE SAVE ERROR",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "배송처 등록에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================
   * 배송처 활성/비활성
   * =========================================
   */

  async function toggleStore(
    store: Store
  ) {
    const {
      error,
    } = await supabase
      .from("stores")
      .update({
        active:
          !store.active,
      })
      .eq(
        "id",
        store.id
      );

    if (error) {
      console.error(
        "STORE UPDATE ERROR",
        error
      );

      alert(
        error.message
      );

      return;
    }

    setStores(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            store.id
              ? {
                  ...item,
                  active:
                    !item.active,
                }
              : item
        )
    );
  }

  /*
   * =========================================
   * 화면
   * =========================================
   */

  return (
    <div>
      {/* =====================================
          등록
      ===================================== */}

      <div
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "28px",
          marginBottom: "25px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "22px",
            color: "#111827",
          }}
        >
          배송처 등록
        </h2>

        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "18px",
          }}
        >
          {/* 화주 */}

          <Field label="화주" required>
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
                화주 선택
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
              value={channelId}
              onChange={(e) =>
                setChannelId(
                  e.target.value
                )
              }
              style={inputStyle}
              disabled={
                !customerId
              }
            >
              <option value="">
                판매채널 선택
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

          {/* 코드 */}

          <Field
            label="배송처 코드"
            required
          >
            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                )
              }
              placeholder="예: S-001"
              style={inputStyle}
            />
          </Field>

          {/* 이름 */}

          <Field
            label="배송처명"
            required
          >
            <input
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="예: 올리브영 강남점"
              style={inputStyle}
            />
          </Field>

          {/* 주소 */}

          <Field label="주소">
            <input
              value={address}
              onChange={(e) =>
                setAddress(
                  e.target.value
                )
              }
              placeholder="배송처 주소"
              style={inputStyle}
            />
          </Field>

          {/* 전화 */}

          <Field label="전화번호">
            <input
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
              placeholder="02-0000-0000"
              style={inputStyle}
            />
          </Field>
        </div>

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding:
                "12px 15px",
              borderRadius: "8px",
              background:
                message.includes(
                  "등록되었습니다"
                )
                  ? "#dcfce7"
                  : "#fee2e2",
              color:
                message.includes(
                  "등록되었습니다"
                )
                  ? "#166534"
                  : "#b91c1c",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            marginTop: "22px",
            display: "flex",
            justifyContent:
              "flex-end",
          }}
        >
          <button
            type="button"
            onClick={saveStore}
            disabled={loading}
            style={{
              border: "none",
              borderRadius: "9px",
              padding:
                "13px 25px",
              background:
                loading
                  ? "#94a3b8"
                  : "#2563eb",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading
                ? "default"
                : "pointer",
            }}
          >
            {loading
              ? "등록 중..."
              : "배송처 등록"}
          </button>
        </div>
      </div>

      {/* =====================================
          목록
      ===================================== */}

      <div
        style={{
          background:
            "#ffffff",
          border:
            "1px solid #e5e7eb",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom:
              "1px solid #e5e7eb",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          배송처 목록
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
              minWidth: "900px",
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
                  화주
                </th>

                <th style={thStyle}>
                  판매채널
                </th>

                <th style={thStyle}>
                  배송처 코드
                </th>

                <th style={thStyle}>
                  배송처명
                </th>

                <th style={thStyle}>
                  주소
                </th>

                <th style={thStyle}>
                  전화번호
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
              {stores.map(
                (store) => {
                  const customer =
                    customers.find(
                      (item) =>
                        item.id ===
                        store.customer_id
                    );

                  const channel =
                    channels.find(
                      (item) =>
                        item.id ===
                        store.sales_channel_id
                    );

                  return (
                    <tr
                      key={
                        store.id
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
                          customer?.name
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          channel?.name ??
                          "-"
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {
                            store.code
                          }
                        </strong>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <strong>
                          {
                            store.name
                          }
                        </strong>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          store.address ??
                          "-"
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          store.phone ??
                          "-"
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <span
                          style={{
                            color:
                              store.active
                                ? "#16a34a"
                                : "#94a3b8",
                            fontWeight: 700,
                          }}
                        >
                          {store.active
                            ? "사용"
                            : "중지"}
                        </span>
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleStore(
                              store
                            )
                          }
                          style={{
                            border:
                              "none",
                            borderRadius:
                              "6px",
                            padding:
                              "7px 12px",
                            background:
                              store.active
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              store.active
                                ? "#b91c1c"
                                : "#166534",
                            cursor:
                              "pointer",
                            fontWeight:
                              700,
                          }}
                        >
                          {store.active
                            ? "사용중지"
                            : "사용"}
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}

              {stores.length ===
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
                    등록된 배송처가 없습니다.
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


/* =========================================
   FIELD
========================================= */

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


/* =========================================
   STYLES
========================================= */

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  boxSizing: "border-box",
  padding: "10px 12px",
  border:
    "1px solid #d1d5db",
  borderRadius: "8px",
  background: "#ffffff",
  color: "#111827",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "14px",
  fontSize: "14px",
  color: "#334155",
  whiteSpace: "nowrap",
};