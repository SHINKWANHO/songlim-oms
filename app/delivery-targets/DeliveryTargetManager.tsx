"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type Group = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sort_order: number;
};

type SalesChannel = {
  id: string;
  customer_id: string;
  group_id: string | null;
  code: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  customers?: {
    id: string;
    code: string;
    name: string;
  };
  sales_channel_groups?: {
    id: string;
    code: string;
    name: string;
  };
};

export default function DeliveryTargetManager({
  initialCustomers,
  initialGroups,
  initialChannels,
  initialError,
}: {
  initialCustomers: Customer[];
  initialGroups: Group[];
  initialChannels: SalesChannel[];
  initialError: string | null;
}) {
  const supabase = createClient();

  const [customers] =
    useState<Customer[]>(initialCustomers);

  const [groups] =
    useState<Group[]>(initialGroups);

  const [channels, setChannels] =
    useState<SalesChannel[]>(
      initialChannels
    );

  const [customerFilter, setCustomerFilter] =
    useState("");

  const [groupFilter, setGroupFilter] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [modal, setModal] =
    useState(false);

  const [editing, setEditing] =
    useState<SalesChannel | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(initialError);

  const [form, setForm] = useState({
    customer_id: "",
    group_id: "",
    code: "",
    name: "",
    active: true,
  });

  const filteredChannels = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return channels.filter((channel) => {
      const customerMatch =
        !customerFilter ||
        channel.customer_id ===
          customerFilter;

      const groupMatch =
        !groupFilter ||
        channel.group_id ===
          groupFilter;

      const searchMatch =
        !keyword ||
        channel.code
          .toLowerCase()
          .includes(keyword) ||
        channel.name
          .toLowerCase()
          .includes(keyword) ||
        (
          channel.customers?.name ??
          ""
        )
          .toLowerCase()
          .includes(keyword) ||
        (
          channel
            .sales_channel_groups
            ?.name ?? ""
        )
          .toLowerCase()
          .includes(keyword);

      return (
        customerMatch &&
        groupMatch &&
        searchMatch
      );
    });
  }, [
    channels,
    customerFilter,
    groupFilter,
    search,
  ]);

  function openCreate() {
    setEditing(null);

    setForm({
      customer_id:
        customerFilter ||
        customers[0]?.id ||
        "",
      group_id:
        groupFilter ||
        groups[0]?.id ||
        "",
      code: "",
      name: "",
      active: true,
    });

    setError(null);
    setModal(true);
  }

  function openEdit(
    channel: SalesChannel
  ) {
    setEditing(channel);

    setForm({
      customer_id:
        channel.customer_id,
      group_id:
        channel.group_id ?? "",
      code:
        channel.code,
      name:
        channel.name,
      active:
        channel.active,
    });

    setError(null);
    setModal(true);
  }

  async function saveChannel() {
    if (!form.customer_id) {
      setError(
        "화주 / 고객사를 선택해주세요."
      );
      return;
    }

    if (!form.group_id) {
      setError(
        "판매채널 그룹을 선택해주세요."
      );
      return;
    }

    if (!form.code.trim()) {
      setError(
        "판매채널 코드를 입력해주세요."
      );
      return;
    }

    if (!form.name.trim()) {
      setError(
        "판매채널명을 입력해주세요."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customer_id:
          form.customer_id,
        group_id:
          form.group_id,
        code:
          form.code.trim(),
        name:
          form.name.trim(),
        active:
          form.active,
        updated_at:
          new Date().toISOString(),
      };

      if (editing) {
        const { data, error } =
          await supabase
            .from("delivery_targets")
            .update(payload)
            .eq(
              "id",
              editing.id
            )
            .select(`
              *,
              customers (
                id,
                code,
                name
              ),
              sales_channel_groups (
                id,
                code,
                name
              )
            `)
            .single();

        if (error) {
          console.error(
            "SALES CHANNEL UPDATE ERROR",
            error
          );

          setError(
            error.message
          );

          return;
        }

        if (data) {
          setChannels((current) =>
            current.map((item) =>
              item.id === editing.id
                ? data
                : item
            )
          );
        }
      } else {
        const { data, error } =
          await supabase
            .from("delivery_targets")
            .insert({
              ...payload,
              created_at:
                new Date().toISOString(),
            })
            .select(`
              *,
              customers (
                id,
                code,
                name
              ),
              sales_channel_groups (
                id,
                code,
                name
              )
            `)
            .single();

        if (error) {
          console.error(
            "SALES CHANNEL INSERT ERROR",
            error
          );

          setError(
            error.message
          );

          return;
        }

        if (data) {
          setChannels((current) => [
            data,
            ...current,
          ]);
        }
      }

      setModal(false);
      setEditing(null);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(
    channel: SalesChannel
  ) {
    const { data, error } =
      await supabase
        .from("delivery_targets")
        .update({
          active:
            !channel.active,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          channel.id
        )
        .select(`
          *,
          customers (
            id,
            code,
            name
          ),
          sales_channel_groups (
            id,
            code,
            name
          )
        `)
        .single();

    if (error) {
      setError(
        error.message
      );
      return;
    }

    if (data) {
      setChannels((current) =>
        current.map((item) =>
          item.id === channel.id
            ? data
            : item
        )
      );
    }
  }

  async function removeChannel(
    channel: SalesChannel
  ) {
    const confirmed =
      window.confirm(
        `"${channel.name}" 판매채널을 삭제하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from("delivery_targets")
        .delete()
        .eq(
          "id",
          channel.id
        );

    if (error) {
      setError(
        error.message
      );
      return;
    }

    setChannels((current) =>
      current.filter(
        (item) =>
          item.id !== channel.id
      )
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] px-10 py-10">
      <div className="mx-auto max-w-[1450px]">

        {/* HEADER */}
        <div className="mb-8 flex items-end justify-between">

          <div>
            <div className="text-xs font-bold tracking-[2px] text-slate-500">
              SALES CHANNEL
            </div>

            <h1 className="mt-2 text-[38px] font-bold text-slate-900">
              판매채널 관리
            </h1>

            <p className="mt-2 text-[16px] text-slate-500">
              화주별 판매채널과 판매채널 그룹을 관리합니다.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            + 판매채널 등록
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* FILTER */}
        <div className="mb-5 rounded-xl bg-white p-5 shadow-sm">

          <div className="flex gap-3">

            <select
              value={customerFilter}
              onChange={(e) =>
                setCustomerFilter(
                  e.target.value
                )
              }
              className="w-[230px] rounded-lg border border-slate-300 px-4 py-3"
            >
              <option value="">
                전체 화주
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.name}
                  </option>
                )
              )}
            </select>

            <select
              value={groupFilter}
              onChange={(e) =>
                setGroupFilter(
                  e.target.value
                )
              }
              className="w-[230px] rounded-lg border border-slate-300 px-4 py-3"
            >
              <option value="">
                전체 판매채널 그룹
              </option>

              {groups.map(
                (group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
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
              placeholder="판매채널명 / 코드 검색"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3"
            />

          </div>
        </div>

        {/* SUMMARY */}
        <div className="mb-5 grid grid-cols-3 gap-4">

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              전체 판매채널
            </div>

            <div className="mt-2 text-3xl font-bold text-slate-900">
              {channels.length}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              판매채널 그룹
            </div>

            <div className="mt-2 text-3xl font-bold text-slate-900">
              {groups.length}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              사용중 판매채널
            </div>

            <div className="mt-2 text-3xl font-bold text-blue-600">
              {
                channels.filter(
                  (channel) =>
                    channel.active
                ).length
              }
            </div>
          </div>

        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          <table className="w-full">

            <thead>
              <tr className="bg-slate-50">

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  No
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  화주
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  그룹
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  판매채널 코드
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  판매채널
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  상태
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  관리
                </th>

              </tr>
            </thead>

            <tbody>

              {filteredChannels.map(
                (channel, index) => (
                  <tr
                    key={channel.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >

                    <td className="px-5 py-5 text-sm text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-5 font-semibold text-slate-800">
                      {channel.customers?.name ??
                        "-"}
                    </td>

                    <td className="px-5 py-5">

                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {
                          channel
                            .sales_channel_groups
                            ?.name ??
                          "미분류"
                        }
                      </span>

                    </td>

                    <td className="px-5 py-5 text-sm text-slate-500">
                      {channel.code}
                    </td>

                    <td className="px-5 py-5 text-base font-bold text-slate-900">
                      {channel.name}
                    </td>

                    <td className="px-5 py-5">

                      <button
                        onClick={() =>
                          toggleActive(
                            channel
                          )
                        }
                        className={
                          channel.active
                            ? "rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700"
                            : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500"
                        }
                      >
                        {channel.active
                          ? "사용중"
                          : "중지"}
                      </button>

                    </td>

                    <td className="px-5 py-5">

                      <button
                        onClick={() =>
                          openEdit(
                            channel
                          )
                        }
                        className="mr-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600"
                      >
                        수정
                      </button>

                      <button
                        onClick={() =>
                          removeChannel(
                            channel
                          )
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                      >
                        삭제
                      </button>

                    </td>

                  </tr>
                )
              )}

              {filteredChannels.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-20 text-center text-slate-400"
                  >
                    조건에 맞는 판매채널이 없습니다.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">

          <div className="w-full max-w-[540px] rounded-2xl bg-white p-8 shadow-2xl">

            <h2 className="text-2xl font-bold text-slate-900">
              {editing
                ? "판매채널 수정"
                : "판매채널 등록"}
            </h2>

            <div className="mt-6">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                화주 / 고객사
              </label>

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
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >

                <option value="">
                  선택하세요
                </option>

                {customers.map(
                  (customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                판매채널 그룹
              </label>

              <select
                value={
                  form.group_id
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    group_id:
                      e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >

                <option value="">
                  선택하세요
                </option>

                {groups.map(
                  (group) => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {group.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                판매채널 코드
              </label>

              <input
                value={form.code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code:
                      e.target.value,
                  })
                }
                placeholder="예: C-EMART"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                판매채널명
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name:
                      e.target.value,
                  })
                }
                placeholder="예: 이마트"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />

            </div>

            <label className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-700">

              <input
                type="checkbox"
                checked={
                  form.active
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    active:
                      e.target.checked,
                  })
                }
              />

              사용중

            </label>

            <div className="mt-8 flex justify-end gap-3">

              <button
                onClick={() =>
                  setModal(false)
                }
                className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-slate-600"
              >
                취소
              </button>

              <button
                onClick={
                  saveChannel
                }
                disabled={loading}
                className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"
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