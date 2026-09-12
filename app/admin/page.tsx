import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } = await supabase
    .from("oms_users")
    .select(
      "login_id, name, role, active"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "ADMIN" ||
    !profile.active
  ) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <div className="text-sm font-semibold text-slate-500">
            SYSTEM ADMINISTRATION
          </div>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            관리자
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {profile.name}님이 로그인되어 있습니다.
          </p>
        </div>

        <div className="mb-7 grid grid-cols-3 gap-5">
          <InfoCard
            title="로그인 아이디"
            value={profile.login_id}
          />

          <InfoCard
            title="권한"
            value={profile.role}
          />

          <InfoCard
            title="계정 상태"
            value={
              profile.active
                ? "사용중"
                : "중지"
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <AdminMenu
            title="사용자 관리"
            description="사용자 계정, 이름, 권한 및 사용상태를 관리합니다."
            href="/admin/users"
          />

          <AdminMenu
            title="판매채널 API"
            description="판매채널별 주문수집 API 연결을 관리합니다."
            href="/sales-channels/api"
          />

          <AdminMenu
            title="시스템 설정"
            description="OMS 시스템 환경설정을 관리합니다."
            href="/admin/settings"
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-xl font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

function AdminMenu({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-lg font-black text-slate-900">
        {title}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-6 text-sm font-bold text-blue-600">
        관리하기 →
      </div>
    </Link>
  );
}