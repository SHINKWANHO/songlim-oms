import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
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
            SYSTEM SETTINGS
          </div>

          <h1 className="mt-1 text-3xl font-black text-slate-900">
            시스템 설정
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            송림물류 OMS의 기본 시스템 설정을 관리합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SettingCard
            title="사용자 관리"
            description="OMS 사용자 계정과 권한을 관리합니다."
          />

          <SettingCard
            title="판매채널 API"
            description="판매채널별 주문수집 API 연결 상태를 관리합니다."
          />

          <SettingCard
            title="시스템 정보"
            description="OMS 운영환경 및 시스템 정보를 관리합니다."
          />
        </div>
      </div>
    </div>
  );
}

function SettingCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-lg font-black text-slate-900">
        {title}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}