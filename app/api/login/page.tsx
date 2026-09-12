"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const loginId = userId.trim();

    const internalEmail =
      loginId === "admin"
        ? "songlim23@daum.net"
        : `${loginId}@oms.local`;

    console.log("LOGIN EMAIL:", internalEmail);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

    console.log("AUTH USER:", data?.user?.email);
    console.log("AUTH ERROR:", loginError?.message);

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError("로그인 세션 생성에 실패했습니다.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="text-xs font-bold tracking-[0.18em] text-slate-400">
            SONGLIM LOGISTICS
          </div>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            송림물류 OMS
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            관리자 및 사용자 로그인
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              아이디
            </label>

            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="아이디 입력"
              autoComplete="username"
              required
              className="h-12 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              비밀번호
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              required
              className="h-12 w-full rounded-lg border border-slate-300 px-4 outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}