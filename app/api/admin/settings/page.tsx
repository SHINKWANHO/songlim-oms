"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SettingItem = {
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "toggle";
};

const settingItems: SettingItem[] = [
  {
    key: "company_name",
    label: "회사명",
    description: "OMS 화면에 표시할 회사명입니다.",
    type: "text",
  },
  {
    key: "system_name",
    label: "시스템명",
    description: "상단 및 관리자 화면에 표시할 시스템명입니다.",
    type: "text",
  },
  {
    key: "default_reservation_unit",
    label: "기본 예약 단위",
    description: "납품예약 시 기본 단위입니다. PALLET 또는 BOX를 입력합니다.",
    type: "text",
  },
  {
    key: "session_timeout_minutes",
    label: "세션 유지시간",
    description: "자동 로그아웃 기준 시간(분)입니다.",
    type: "number",
  },
  {
    key: "maintenance_mode",
    label: "점검 모드",
    description: "시스템 점검 상태 사용 여부입니다.",
    type: "toggle",
  },
];

export default function AdminSettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [values, setValues] = useState<Record<string, string | boolean>>({
    company_name: "송림물류",
    system_name: "SONGLIM OMS",
    default_reservation_unit: "PALLET",
    session_timeout_minutes: "480",
    maintenance_mode: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value");

      if (error) {
        setMessage(
          `설정 조회 실패: ${error.message}`
        );
        setLoading(false);
        return;
      }

      if (data) {
        const nextValues: Record<string, string | boolean> = {
          ...values,
        };

        for (const item of data) {
          if (
            item.setting_key ===
            "maintenance_mode"
          ) {
            nextValues[item.setting_key] =
              item.setting_value === "true";
          } else {
            nextValues[item.setting_key] =
              item.setting_value ?? "";
          }
        }

        setValues(nextValues);
      }

      setLoading(false);
    }

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function updateValue(
    key: string,
    value: string | boolean
  ) {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const rows = Object.entries(values).map(
      ([key, value]) => ({
        setting_key: key,
        setting_value: String(value),
        updated_at: new Date().toISOString(),
      })
    );

    const { error } = await supabase
      .from("system_settings")
      .upsert(
        rows,
        {
          onConflict: "setting_key",
        }
      );

    if (error) {
      setMessage(
        `저장 실패: ${error.message}`
      );
      setSaving(false);
      return;
    }

    setMessage(
      "시스템 설정이 저장되었습니다."
    );

    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">
            시스템 설정
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            OMS 기본 운영 설정을 관리합니다.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700">
            {message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              설정을 불러오는 중입니다.
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {settingItems.map(
                  (item) => (
                    <div
                      key={item.key}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[260px_1fr]"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {item.label}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-500">
                          {item.description}
                        </div>
                      </div>

                      <div>
                        {item.type ===
                        "toggle" ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateValue(
                                item.key,
                                !Boolean(
                                  values[
                                    item.key
                                  ]
                                )
                              )
                            }
                            className={`relative h-7 w-14 rounded-full transition ${
                              values[
                                item.key
                              ]
                                ? "bg-blue-600"
                                : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                                values[
                                  item.key
                                ]
                                  ? "left-8"
                                  : "left-1"
                              }`}
                            />
                          </button>
                        ) : (
                          <input
                            type={
                              item.type ===
                              "number"
                                ? "number"
                                : "text"
                            }
                            value={String(
                              values[
                                item.key
                              ] ?? ""
                            )}
                            onChange={(
                              event
                            ) =>
                              updateValue(
                                item.key,
                                event.target
                                  .value
                              )
                            }
                            className="h-11 w-full max-w-xl rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                          />
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "저장 중..."
                    : "설정 저장"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}