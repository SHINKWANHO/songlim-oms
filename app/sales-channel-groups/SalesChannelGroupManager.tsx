"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Group = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export default function SalesChannelGroupManager({
  initialGroups,
  initialError,
}: {
  initialGroups: Group[];
  initialError: string | null;
}) {
  const supabase = createClient();

  const [groups, setGroups] =
    useState<Group[]>(initialGroups);

  const [search, setSearch] =
    useState("");

  const [showInactive, setShowInactive] =
    useState(true);

  const [modal, setModal] =
    useState(false);

  const [editing, setEditing] =
    useState<Group | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(initialError);

  const [form, setForm] = useState({
    code: "",
    name: "",
    sort_order: 10,
    active: true,
  });

  const filteredGroups = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return groups.filter((group) => {
      const searchMatch =
        !keyword ||
        group.code
          .toLowerCase()
          .includes(keyword) ||
        group.name
          .toLowerCase()
          .includes(keyword);

      const activeMatch =
        showInactive || group.active;

      return (
        searchMatch &&
        activeMatch
      );
    });
  }, [
    groups,
    search,
    showInactive,
  ]);

  function openCreate() {
    setEditing(null);

    const maxOrder =
      groups.length > 0
        ? Math.max(
            ...groups.map(
              (group) =>
                group.sort_order
            )
          )
        : 0;

    setForm({
      code: "",
      name: "",
      sort_order:
        maxOrder + 10,
      active: true,
    });

    setError(null);
    setModal(true);
  }

  function openEdit(group: Group) {
    setEditing(group);

    setForm({
      code: group.code,
      name: group.name,
      sort_order:
        group.sort_order,
      active: group.active,
    });

    setError(null);
    setModal(true);
  }

  async function saveGroup() {
    if (!form.code.trim()) {
      setError(
        "그룹 코드를 입력해주세요."
      );
      return;
    }

    if (!form.name.trim()) {
      setError(
        "그룹명을 입력해주세요."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        code:
          form.code
            .trim()
            .toUpperCase(),
        name:
          form.name.trim(),
        sort_order:
          Number(
            form.sort_order
          ),
        active:
          form.active,
        updated_at:
          new Date().toISOString(),
      };

      if (editing) {
        const { data, error } =
          await supabase
            .from(
              "sales_channel_groups"
            )
            .update(payload)
            .eq(
              "id",
              editing.id
            )
            .select("*")
            .single();

        if (error) {
          console.error(
            "GROUP UPDATE ERROR",
            error
          );

          setError(
            error.message
          );

          return;
        }

        if (data) {
          setGroups((current) =>
            current
              .map((item) =>
                item.id === editing.id
                  ? data
                  : item
              )
              .sort(
                (a, b) =>
                  a.sort_order -
                  b.sort_order
              )
          );
        }
      } else {
        const { data, error } =
          await supabase
            .from(
              "sales_channel_groups"
            )
            .insert({
              ...payload,
              created_at:
                new Date().toISOString(),
            })
            .select("*")
            .single();

        if (error) {
          console.error(
            "GROUP INSERT ERROR",
            error
          );

          setError(
            error.message
          );

          return;
        }

        if (data) {
          setGroups((current) =>
            [
              ...current,
              data,
            ].sort(
              (a, b) =>
                a.sort_order -
                b.sort_order
            )
          );
        }
      }

      setModal(false);
      setEditing(null);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(
    group: Group
  ) {
    const { data, error } =
      await supabase
        .from(
          "sales_channel_groups"
        )
        .update({
          active:
            !group.active,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          group.id
        )
        .select("*")
        .single();

    if (error) {
      setError(
        error.message
      );
      return;
    }

    if (data) {
      setGroups((current) =>
        current.map((item) =>
          item.id === group.id
            ? data
            : item
        )
      );
    }
  }

  async function deleteGroup(
    group: Group
  ) {
    const { count, error: countError } =
      await supabase
        .from("delivery_targets")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "group_id",
          group.id
        );

    if (countError) {
      setError(
        countError.message
      );
      return;
    }

    if ((count ?? 0) > 0) {
      setError(
        `"${group.name}" 그룹에 ${count}개의 판매채널이 연결되어 있어 삭제할 수 없습니다.`
      );
      return;
    }

    const confirmed =
      window.confirm(
        `"${group.name}" 그룹을 삭제하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "sales_channel_groups"
        )
        .delete()
        .eq(
          "id",
          group.id
        );

    if (error) {
      setError(
        error.message
      );
      return;
    }

    setGroups((current) =>
      current.filter(
        (item) =>
          item.id !== group.id
      )
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f9] px-10 py-10">
      <div className="mx-auto max-w-[1250px]">

        {/* HEADER */}
        <div className="mb-8 flex items-end justify-between">

          <div>
            <div className="text-xs font-bold tracking-[2px] text-slate-500">
              SALES CHANNEL GROUP
            </div>

            <h1 className="mt-2 text-[38px] font-bold text-slate-900">
              판매채널 그룹 관리
            </h1>

            <p className="mt-2 text-[16px] text-slate-500">
              편의점, 할인점, 대형마트 등 판매채널의 상위 분류를 관리합니다.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            + 그룹 등록
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

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="그룹명 / 그룹코드 검색"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <button
              onClick={() =>
                setShowInactive(
                  !showInactive
                )
              }
              className={
                showInactive
                  ? "rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                  : "rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-600"
              }
            >
              {showInactive
                ? "전체 표시"
                : "사용중만 표시"}
            </button>

          </div>

        </div>

        {/* SUMMARY */}
        <div className="mb-5 grid grid-cols-3 gap-4">

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              전체 그룹
            </div>

            <div className="mt-2 text-3xl font-bold text-slate-900">
              {groups.length}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              사용중 그룹
            </div>

            <div className="mt-2 text-3xl font-bold text-blue-600">
              {
                groups.filter(
                  (group) =>
                    group.active
                ).length
              }
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              중지 그룹
            </div>

            <div className="mt-2 text-3xl font-bold text-slate-500">
              {
                groups.filter(
                  (group) =>
                    !group.active
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

                <th className="w-[90px] px-5 py-4 text-left text-xs font-bold text-slate-500">
                  순서
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  그룹 코드
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500">
                  판매채널 그룹
                </th>

                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500">
                  상태
                </th>

                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500">
                  관리
                </th>

              </tr>
            </thead>

            <tbody>

              {filteredGroups.map(
                (group) => (
                  <tr
                    key={group.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >

                    <td className="px-5 py-5 text-sm font-bold text-slate-500">
                      {group.sort_order}
                    </td>

                    <td className="px-5 py-5 font-mono text-sm text-slate-500">
                      {group.code}
                    </td>

                    <td className="px-5 py-5">

                      <div className="text-lg font-bold text-slate-900">
                        {group.name}
                      </div>

                    </td>

                    <td className="px-5 py-5 text-center">

                      <button
                        onClick={() =>
                          toggleActive(
                            group
                          )
                        }
                        className={
                          group.active
                            ? "rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700"
                            : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500"
                        }
                      >
                        {group.active
                          ? "사용중"
                          : "중지"}
                      </button>

                    </td>

                    <td className="px-5 py-5 text-center">

                      <button
                        onClick={() =>
                          openEdit(
                            group
                          )
                        }
                        className="mr-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600"
                      >
                        수정
                      </button>

                      <button
                        onClick={() =>
                          deleteGroup(
                            group
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

              {filteredGroups.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-20 text-center text-slate-400"
                  >
                    등록된 판매채널 그룹이 없습니다.
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

          <div className="w-full max-w-[520px] rounded-2xl bg-white p-8 shadow-2xl">

            <h2 className="text-2xl font-bold text-slate-900">
              {editing
                ? "판매채널 그룹 수정"
                : "판매채널 그룹 등록"}
            </h2>

            <div className="mt-7">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                그룹 코드
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
                placeholder="예: CONVENIENCE"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono outline-none focus:border-blue-500"
              />

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                그룹명
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
                placeholder="예: 편의점"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            <div className="mt-5">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                표시 순서
              </label>

              <input
                type="number"
                value={
                  form.sort_order
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    sort_order:
                      Number(
                        e.target.value
                      ),
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

              <p className="mt-2 text-xs text-slate-400">
                숫자가 작을수록 위에 표시됩니다.
              </p>

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
                  saveGroup
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