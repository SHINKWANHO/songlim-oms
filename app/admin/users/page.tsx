"use client";

import { FormEvent, useEffect, useState } from "react";

type UserItem = {
  id: string;
  auth_user_id: string;
  login_id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "USER";
  active: boolean;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);

  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] =
    useState<"ADMIN" | "MANAGER" | "USER">("USER");

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState("");

  /* =====================================================
     사용자 목록 조회
  ===================================================== */

  async function loadUsers() {
    try {
      setListLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/users",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "사용자 목록 조회에 실패했습니다."
        );
      }

      setUsers(result.users || []);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "사용자 목록 조회에 실패했습니다."
      );
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  /* =====================================================
     사용자 생성
  ===================================================== */

  async function handleCreate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/users",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            login_id: loginId,
            name,
            password,
            role,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "사용자 계정 생성에 실패했습니다."
        );
      }

      setLoginId("");
      setName("");
      setPassword("");
      setRole("USER");

      setMessage(
        "사용자 계정이 생성되었습니다."
      );

      await loadUsers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "사용자 계정 생성에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-7">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-7">
          <div className="text-sm font-semibold text-slate-500">
            USER MANAGEMENT
          </div>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            사용자 관리
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            OMS 사용자 계정을 생성하고 관리합니다.
          </p>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">

          {/* =================================================
              사용자 생성
          ================================================= */}

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              사용자 계정 생성
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              OMS에 로그인할 사용자 계정을 등록합니다.
            </p>

            <form
              onSubmit={handleCreate}
              className="mt-6 space-y-5"
            >
              {/* 아이디 */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  로그인 아이디
                </label>

                <input
                  type="text"
                  value={loginId}
                  onChange={(event) =>
                    setLoginId(event.target.value)
                  }
                  placeholder="예: hong01"
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />

                <p className="mt-1 text-xs text-slate-400">
                  영문 소문자, 숫자, ., _, - 사용 가능
                </p>
              </div>

              {/* 이름 */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  사용자 이름
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="예: 홍길동"
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* 비밀번호 */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  비밀번호
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="6자 이상 입력"
                  minLength={6}
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* 권한 */}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  사용자 권한
                </label>

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as
                        | "ADMIN"
                        | "MANAGER"
                        | "USER"
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="USER">
                    USER - 일반 사용자
                  </option>

                  <option value="MANAGER">
                    MANAGER - 관리자
                  </option>

                  <option value="ADMIN">
                    ADMIN - 시스템 관리자
                  </option>
                </select>
              </div>

              {/* 생성 버튼 */}

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading
                  ? "계정 생성 중..."
                  : "사용자 계정 생성"}
              </button>
            </form>
          </div>

          {/* =================================================
              사용자 목록
          ================================================= */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* 목록 HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  사용자 목록
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  총 {users.length}명
                </p>
              </div>

              <button
                type="button"
                onClick={loadUsers}
                disabled={listLoading}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
              >
                새로고침
              </button>
            </div>

            {/* TABLE */}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">

                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">
                      아이디
                    </th>

                    <th className="px-5 py-3 text-left font-bold">
                      이름
                    </th>

                    <th className="px-5 py-3 text-left font-bold">
                      권한
                    </th>

                    <th className="px-5 py-3 text-left font-bold">
                      상태
                    </th>

                    <th className="px-5 py-3 text-left font-bold">
                      생성일
                    </th>
                    <th className="px-5 py-3 text-left">관리</th>
                  </tr>
                </thead>

                <tbody>
                  {listLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        사용자 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        등록된 사용자가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr
  key={user.id}
  className="border-t border-slate-100"
>
  <td className="px-5 py-4 font-bold">
    {user.login_id}
  </td>

  <td className="px-5 py-4">
    {user.name}
  </td>

  <td className="px-5 py-4">
    <select
      value={user.role}
      onChange={async (e) => {
        const role =
          e.target.value;

        const response =
          await fetch(
            "/api/admin/users",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                id: user.id,
                action: "role",
                role,
              }),
            }
          );

        const result =
          await response.json();

        setMessage(
          result.message
        );

        if (
          response.ok
        ) {
          await loadUsers();
        }
      }}
      className="rounded-lg border border-slate-300 px-2 py-1"
    >
      <option value="USER">
        USER
      </option>

      <option value="MANAGER">
        MANAGER
      </option>

      <option value="ADMIN">
        ADMIN
      </option>
    </select>
  </td>

  <td className="px-5 py-4">
    <span
      className={
        user.active
          ? "font-bold text-green-600"
          : "font-bold text-red-600"
      }
    >
      {user.active
        ? "사용중"
        : "중지"}
    </span>
  </td>

  <td className="px-5 py-4">
    {new Date(
      user.created_at
    ).toLocaleDateString(
      "ko-KR"
    )}
  </td>

  <td className="px-5 py-4">
    <div className="flex gap-2">
      <button
        type="button"
        onClick={async () => {
          const confirmed =
            window.confirm(
              user.active
                ? `${user.name} 계정을 중지하시겠습니까?`
                : `${user.name} 계정을 다시 사용하시겠습니까?`
            );

          if (
            !confirmed
          ) {
            return;
          }

          const response =
            await fetch(
              "/api/admin/users",
              {
                method:
                  "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    id: user.id,
                    action:
                      "active",
                    active:
                      !user.active,
                  }),
              }
            );

          const result =
            await response.json();

          setMessage(
            result.message
          );

          if (
            response.ok
          ) {
            await loadUsers();
          }
        }}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold"
      >
        {user.active
          ? "사용중지"
          : "사용재개"}
      </button>

      <button
        type="button"
        onClick={async () => {
          const newPassword =
            window.prompt(
              `${user.name}님의 새 비밀번호를 입력하세요.\n6자 이상 입력`
            );

          if (
            !newPassword
          ) {
            return;
          }

          const response =
            await fetch(
              "/api/admin/users",
              {
                method:
                  "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify({
                    id: user.id,
                    action:
                      "password",
                    password:
                      newPassword,
                  }),
              }
            );

          const result =
            await response.json();

          setMessage(
            result.message
          );
        }}
        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white"
      >
        비밀번호 변경
      </button>
    </div>
  </td>
</tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   권한 표시
===================================================== */

function RoleBadge({
  role,
}: {
  role: "ADMIN" | "MANAGER" | "USER";
}) {
  if (role === "ADMIN") {
    return (
      <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
        ADMIN
      </span>
    );
  }

  if (role === "MANAGER") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
        MANAGER
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
      USER
    </span>
  );
}