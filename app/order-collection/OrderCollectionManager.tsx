"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";

export default function OrderCollectionManager() {
  const [message, setMessage] = useState("");

  async function collectOrders(channelCode = "ALL") {
    setMessage("주문수집을 시작합니다.");

    try {
      const response = await fetch("/orders/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelCode,
        }),
      });

      const text = await response.text();

      let result: {
        success?: boolean;
        inserted?: number;
        message?: string;
      };

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          `서버 응답이 JSON이 아닙니다. HTTP ${response.status}`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "주문수집에 실패했습니다."
        );
      }

      setMessage(
        `주문수집 완료 · 신규 ${result.inserted ?? 0}건`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "주문수집 중 오류가 발생했습니다."
      );
    }
  }

  const channels = [
    ["이마트", "EMART"],
    ["롯데마트", "LOTTEMART"],
    ["홈플러스", "HOMEPLUS"],
    ["GS25", "GS25"],
    ["CU", "CU"],
    ["세븐일레븐", "SEVEN"],
    ["올리브영", "OLIVEYOUNG"],
    ["온라인", "ONLINE"],
  ];

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
      <Sidebar />

      <section
        style={{
          flex: 1,
          minWidth: 0,
          padding: "34px 42px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {/* HEADER */}
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "14px",
                  color: "#64748b",
                  fontWeight: 700,
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
                주문수집
              </h1>

              <p
                style={{
                  margin: "8px 0 0",
                  color: "#64748b",
                  fontSize: "15px",
                }}
              >
                판매채널 주문을 OMS로 수집합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => collectOrders("ALL")}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                padding: "13px 20px",
                borderRadius: "9px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              전체 주문수집
            </button>
          </header>

          {/* MESSAGE */}
          {message && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px 20px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                borderRadius: "10px",
                fontWeight: 700,
              }}
            >
              {message}
            </div>
          )}

          {/* SUMMARY */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                전체 판매채널
              </div>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "30px",
                  fontWeight: 800,
                }}
              >
                8
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                API 연결채널
              </div>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "30px",
                  fontWeight: 800,
                  color: "#16a34a",
                }}
              >
                6
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "22px",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                현재 수집주문
              </div>

              <div
                style={{
                  marginTop: "10px",
                  fontSize: "30px",
                  fontWeight: 800,
                }}
              >
                0
              </div>
            </div>
          </section>

          {/* CHANNEL COLLECTION */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom:
                  "1px solid #e5e7eb",
              }}
            >
              <strong
                style={{
                  fontSize: "18px",
                }}
              >
                판매채널별 주문수집
              </strong>

              <div
                style={{
                  marginTop: "6px",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                판매채널별로 주문을 개별 수집할 수 있습니다.
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              {channels.map(([name, code]) => (
                <div
                  key={code}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "18px",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    {name}
                  </div>

                  <div
                    style={{
                      marginTop: "5px",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    {code}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      collectOrders(code)
                    }
                    style={{
                      marginTop: "15px",
                      width: "100%",
                      border:
                        "1px solid #cbd5e1",
                      background: "#ffffff",
                      borderRadius: "8px",
                      padding: "10px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    주문수집
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}