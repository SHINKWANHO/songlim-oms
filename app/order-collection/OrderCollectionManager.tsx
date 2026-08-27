"use client";

import { useState } from "react";

export default function OrderCollectionManager() {
  const [message, setMessage] = useState("");

  async function collectOrders() {
    setMessage("주문수집을 시작합니다.");

    try {
      const response = await fetch("/orders/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelCode: "ALL",
        }),
      });

      const text = await response.text();

      let result;

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

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">
              OMS / ORDER COLLECTION
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              주문수집
            </h1>

            <p className="mt-2 text-slate-500">
              판매채널 주문을 OMS로 수집합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={collectOrders}
            className="rounded-xl bg-blue-600 px-6 py-4 font-bold text-white hover:bg-blue-700"
          >
            전체 주문수집
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5 font-semibold text-blue-700">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              전체 판매채널
            </p>
            <p className="mt-3 text-4xl font-black">
              8
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              API 연결채널
            </p>
            <p className="mt-3 text-4xl font-black text-green-600">
              6
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              현재 수집주문
            </p>
            <p className="mt-3 text-4xl font-black">
              0
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            판매채널별 주문수집
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["이마트", "EMART"],
              ["롯데마트", "LOTTEMART"],
              ["홈플러스", "HOMEPLUS"],
              ["GS25", "GS25"],
              ["CU", "CU"],
              ["세븐일레븐", "SEVEN"],
              ["올리브영", "OLIVEYOUNG"],
              ["온라인", "ONLINE"],
            ].map(([name, code]) => (
              <div
                key={code}
                className="rounded-xl border border-slate-200 p-5"
              >
                <p className="text-lg font-bold text-slate-900">
                  {name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {code}
                </p>

                <button
                  type="button"
                  onClick={collectOrders}
                  className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold hover:bg-slate-50"
                >
                  주문수집
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}