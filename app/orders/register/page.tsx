"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  code: string | null;
  name: string;
};

type SalesChannel = {
  id: string;
  customer_id: string;
  channel_code: string | null;
  channel_name: string;
};

export default function OrderRegisterPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [salesChannelId, setSalesChannelId] = useState("");

  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [totalQty, setTotalQty] = useState("1");
  const [totalAmount, setTotalAmount] = useState("0");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadMasterData();
  }, []);

  async function loadMasterData() {
    setLoading(true);
    setMessage("");

    try {
      const customerResult = await supabase
        .from("customers")
        .select("id, code, name")
        .order("name");

      if (customerResult.error) {
        throw new Error(customerResult.error.message);
      }

      const salesChannelResult = await supabase
        .from("sales_channels")
        .select(
          "id, customer_id, channel_code, channel_name"
        )
        .eq("is_active", true)
        .order("channel_name");

      if (salesChannelResult.error) {
        throw new Error(salesChannelResult.error.message);
      }

      setCustomers(
        (customerResult.data || []) as Customer[]
      );

      setSalesChannels(
        (salesChannelResult.data || []) as SalesChannel[]
      );
    } catch (error) {
      console.error("기초정보 조회 오류:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "기초정보를 불러오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredChannels = useMemo(() => {
    if (!customerId) {
      return [];
    }

    return salesChannels.filter(
      (channel) =>
        channel.customer_id === customerId
    );
  }, [customerId, salesChannels]);

  async function handleSubmit() {
    if (saving) return;

    if (!customerId) {
      alert("화주사를 선택해주세요.");
      return;
    }

    if (!orderNumber.trim()) {
      alert("주문번호를 입력해주세요.");
      return;
    }

    if (!orderDate) {
      alert("주문일자를 선택해주세요.");
      return;
    }

    const qty = Number(totalQty);
    const amount = Number(totalAmount);

    if (!Number.isFinite(qty) || qty <= 0) {
      alert("총수량은 1 이상 입력해주세요.");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      alert("총금액을 확인해주세요.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = {
        customer_id: customerId,
        sales_channel_id: salesChannelId || null,
        order_number: orderNumber.trim(),
        order_date: orderDate,
        delivery_date: deliveryDate || null,
        status: "접수",
        total_qty: qty,
        total_amount: amount,
        shipment_requested: false,
        wms_sync_status: "미전송",
      };

      const { data, error } = await supabase
        .from("orders")
        .insert(payload)
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      alert("주문이 등록되었습니다.");

      if (data?.id) {
        router.push(`/orders/${data.id}`);
      } else {
        router.push("/orders/new");
      }

      router.refresh();
    } catch (error) {
      console.error("주문등록 오류:", error);

      setMessage(
        error instanceof Error
          ? `주문등록 실패: ${error.message}`
          : "주문등록 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-7">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="text-sm font-semibold text-slate-500">
            주문관리
          </div>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            주문 등록
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            신규 B2B 주문을 직접 등록합니다.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {message}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-black text-slate-900">
              기본 주문정보
            </h2>
          </div>

          {loading ? (
            <div className="p-16 text-center text-sm text-slate-500">
              기초정보를 불러오는 중입니다...
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-2 gap-5">
                <Field label="화주사 *">
                  <select
                    value={customerId}
                    onChange={(e) => {
                      setCustomerId(e.target.value);
                      setSalesChannelId("");
                    }}
                    className={inputClass}
                  >
                    <option value="">화주사 선택</option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="판매채널">
                  <select
                    value={salesChannelId}
                    onChange={(e) =>
                      setSalesChannelId(e.target.value)
                    }
                    disabled={!customerId}
                    className={inputClass}
                  >
                    <option value="">판매채널 선택</option>

                    {filteredChannels.map((channel) => (
                      <option
                        key={channel.id}
                        value={channel.id}
                      >
                        {channel.channel_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="주문번호 *">
                  <input
                    value={orderNumber}
                    onChange={(e) =>
                      setOrderNumber(e.target.value)
                    }
                    placeholder="주문번호 입력"
                    className={inputClass}
                  />
                </Field>

                <Field label="주문일자 *">
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) =>
                      setOrderDate(e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="납품일자">
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) =>
                      setDeliveryDate(e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="총수량 *">
                  <input
                    type="number"
                    min="1"
                    value={totalQty}
                    onChange={(e) =>
                      setTotalQty(e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="총금액">
                  <input
                    type="number"
                    min="0"
                    value={totalAmount}
                    onChange={(e) =>
                      setTotalAmount(e.target.value)
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/orders/new")
                  }
                  disabled={saving}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {saving
                    ? "등록 중..."
                    : "주문 등록"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-bold text-slate-700">
        {label}
      </div>

      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400";