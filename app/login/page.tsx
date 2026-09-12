"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    const loginId = userId.trim().toLowerCase();

    if (!loginId) {
      setMessage("아이디를 입력해주세요.");
      return;
    }

    if (!password) {
      setMessage("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 사용자는 아이디만 입력하고
      // Supabase Auth에서는 내부 이메일로 변환
      const internalEmail =
  loginId === "admin"
    ? "songlim23@daum.net"
    : `${loginId}@oms.local`;

      const { error } =
        await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error: any) {

      setMessage(
        "아이디 또는 비밀번호가 올바르지 않습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="-ml-[230px] flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="text-xs font-bold tracking-[0.22em] text-blue-600">
            SONGLIM LOGISTICS
          </div>

          <h1 className="mt-3 text-2xl font-black text-slate-900">
            송림물류 OMS
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            OMS 로그인
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              아이디
            </label>

            <input
              type="text"
              value={userId}
              onChange={(e) =>
                setUserId(e.target.value)
              }
              placeholder="아이디"
              autoComplete="username"
              className="h-12 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              비밀번호
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="비밀번호"
              autoComplete="current-password"
              className="h-12 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {message && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 disabled:bg-slate-300"
          >
            {loading
              ? "로그인 중..."
              : "로그인"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          송림물류 OMS 관리자 시스템
        </div>
      </div>
    </div>
  );
}
