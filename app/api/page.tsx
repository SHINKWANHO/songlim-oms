import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("oms_users")
    .select("login_id, name, role, active")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || profile.role !== "ADMIN" || !profile.active) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.18em] text-blue-600">
            ADMINISTRATION
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-900">
            관리자 페이지
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            송림물류 OMS 시스템 관리
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">
            현재 관리자
          </div>

          <div className="mt-2 text-xl font-black text-slate-900">
            {profile.name}
          </div>

          <div className="mt-1 text-sm text-slate-500">
            ID: {profile.login_id}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/admin/users"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-sm font-bold text-blue-600">
              USER MANAGEMENT
            </div>

            <div className="mt-3 text-xl font-black text-slate-900">
              사용자 관리
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              관리자 및 사용자 아이디 생성, 권한 관리
            </p>
          </Link>

          <Link
            href="/sales-channels/api"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-sm font-bold text-blue-600">
              API MANAGEMENT
            </div>

            <div className="mt-3 text-xl font-black text-slate-900">
              API 연결 관리
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              판매채널별 API 연결 상태 및 설정 관리
            </p>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-bold text-slate-400">
              SYSTEM
            </div>

            <div className="mt-3 text-xl font-black text-slate-900">
              시스템 설정
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              추후 공통 시스템 설정 기능 추가
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}