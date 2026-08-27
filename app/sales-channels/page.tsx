"use client";
"use client";

import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Customer = {
  id: string;
  name: string;
};

type SalesChannel = {
  id: string;
  customer_id: string;
  customer_name: string;
  channel_group: string;
  channel_code: string;
  channel_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const DEFAULT_CUSTOMER_ID =
  "753b6b4e-632b-4639-b614-a005bb8e89ed";

const CHANNEL_GROUPS = [
  "편의점",
  "할인점",
  "대형마트",
  "H&B",
  "온라인",
  "백화점",
  "홈쇼핑",
  "면세점",
  "기타",
];

export default function SalesChannelsPage() {
  const supabase = createClient();









  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [channels, setChannels] =
    useState<SalesChannel[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [customerFilter, setCustomerFilter] =
    useState("전체");

  const [groupFilter, setGroupFilter] =
    useState("전체");

  const [search, setSearch] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [formCustomerId, setFormCustomerId] =
    useState(DEFAULT_CUSTOMER_ID);

  const [formGroup, setFormGroup] =
    useState("편의점");

  const [formCode, setFormCode] =
    useState("");

  const [formName, setFormName] =
    useState("");

  const [formActive, setFormActive] =
    useState(true);

  /*
   * =========================================================
   * 초기 조회
   * =========================================================
   */

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        customersResult,
        channelsResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id,name")
          .order("name"),

        supabase
          .from("sales_channels")
          .select("*")
          .order("created_at", {
            ascending: true,
          }),
      ]);

      if (customersResult.error) {
        throw customersResult.error;
      }

      if (channelsResult.error) {
        throw channelsResult.error;
      }

      setCustomers(
        customersResult.data || []
      );

      setChannels(
        channelsResult.data || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "데이터를 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =========================================================
   * 화주명
   * =========================================================
   */

  function getCustomerName(
    customerId: string
  ) {
    return (
      customers.find(
        (customer) =>
          customer.id === customerId
      )?.name || "-"
    );
  }

  /*
   * =========================================================
   * 필터
   * =========================================================
   */

  const filteredChannels =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      return channels.filter(
        (channel) => {
          const customerName =
            getCustomerName(
              channel.customer_id
            );

          const matchesCustomer =
            customerFilter === "전체" ||
            customerName ===
              customerFilter;

          const matchesGroup =
            groupFilter === "전체" ||
            channel.channel_group ===
              groupFilter;

          if (!keyword) {
            return (
              matchesCustomer &&
              matchesGroup
            );
          }

          const matchesSearch =
            customerName
              .toLowerCase()
              .includes(keyword) ||
            channel.channel_group
              .toLowerCase()
              .includes(keyword) ||
            channel.channel_code
              .toLowerCase()
              .includes(keyword) ||
            channel.channel_name
              .toLowerCase()
              .includes(keyword);

          return (
            matchesCustomer &&
            matchesGroup &&
            matchesSearch
          );
        }
      );
    }, [
      channels,
      customers,
      customerFilter,
      groupFilter,
      search,
    ]);

  /*
   * =========================================================
   * 통계
   * =========================================================
   */

  const totalCount =
    filteredChannels.length;

  const groupCount =
    new Set(
      filteredChannels.map(
        (channel) =>
          channel.channel_group
      )
    ).size;

  const activeCount =
    filteredChannels.filter(
      (channel) =>
        channel.is_active
    ).length;

  /*
   * =========================================================
   * 폼 초기화
   * =========================================================
   */

  function resetForm() {
    setEditingId(null);

    setFormCustomerId(
      customers[0]?.id ||
        DEFAULT_CUSTOMER_ID
    );

    setFormGroup("편의점");
    setFormCode("");
    setFormName("");
    setFormActive(true);
  }

  /*
   * =========================================================
   * 신규 등록
   * =========================================================
   */

  function openCreateForm() {
    resetForm();

    setError("");
    setMessage("");

    setShowForm(true);
  }

  /*
   * =========================================================
   * 수정
   * =========================================================
   */

  function openEditForm(
    channel: SalesChannel
  ) {
    setEditingId(channel.id);

    setFormCustomerId(
      channel.customer_id
    );

    setFormGroup(
      channel.channel_group
    );

    setFormCode(
      channel.channel_code
    );

    setFormName(
      channel.channel_name
    );

    setFormActive(
      channel.is_active
    );

    setError("");
    setMessage("");

    setShowForm(true);
  }

  /*
   * =========================================================
   * 저장
   * =========================================================
   */

  async function saveChannel() {
    setError("");
    setMessage("");

    const customerId =
      formCustomerId.trim();

    const group =
      formGroup.trim();

    const code =
      formCode.trim();

    const name =
      formName.trim();

    if (!customerId) {
      setError(
        "화주를 선택해주세요."
      );
      return;
    }

    if (!group) {
      setError(
        "판매채널 그룹을 선택해주세요."
      );
      return;
    }

    if (!code) {
      setError(
        "판매채널 코드를 입력해주세요."
      );
      return;
    }

    if (!name) {
      setError(
        "판매채널명을 입력해주세요."
      );
      return;
    }

    setSaving(true);

    try {
      const now =
        new Date().toISOString();

      /*
       * 수정
       */

      if (editingId) {
        const { data, error } =
          await supabase
            .from("sales_channels")
            .update({
              customer_id: customerId,
              channel_group: group,
              channel_code: code,
              channel_name: name,
              is_active: formActive,
              updated_at: now,
            })
            .eq("id", editingId)
            .select()
            .single();

        if (error) {
          throw error;
        }

        setChannels(
          (current) =>
            current.map(
              (channel) =>
                channel.id ===
                editingId
                  ? data
                  : channel
            )
        );

        setMessage(
          "판매채널이 수정되었습니다."
        );
      }

      /*
       * 신규 등록
       */

      else {
        const { data, error } =
          await supabase
            .from("sales_channels")
            .insert({
              customer_id: customerId,
              channel_group: group,
              channel_code: code,
              channel_name: name,
              is_active: formActive,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        setChannels(
          (current) => [
            ...current,
            data,
          ]
        );

        setMessage(
          "판매채널이 등록되었습니다."
        );
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * 삭제
   * =========================================================
   */

  async function deleteChannel(
    channel: SalesChannel
  ) {
    const customerName =
      getCustomerName(
        channel.customer_id
      );

    const confirmed =
      window.confirm(
        `${customerName}의 "${channel.channel_name}" 채널을 삭제하시겠습니까?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const { error } =
        await supabase
          .from("sales_channels")
          .delete()
          .eq("id", channel.id);

      if (error) {
        throw error;
      }

      setChannels(
        (current) =>
          current.filter(
            (item) =>
              item.id !== channel.id
          )
      );

      setMessage(
        "판매채널이 삭제되었습니다."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "삭제 중 오류가 발생했습니다."
      );
    }
  }

  /*
   * =========================================================
   * 사용 / 미사용
   * =========================================================
   */

  async function toggleActive(
    channel: SalesChannel
  ) {
    setError("");
    setMessage("");

    const nextActive =
      !channel.is_active;

    try {
      const { error } =
        await supabase
          .from("sales_channels")
          .update({
            is_active: nextActive,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", channel.id);

      if (error) {
        throw error;
      }

      setChannels(
        (current) =>
          current.map(
            (item) =>
              item.id === channel.id
                ? {
                    ...item,
                    is_active:
                      nextActive,
                  }
                : item
          )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "상태 변경 중 오류가 발생했습니다."
      );
    }
  }

  /*
   * =========================================================
   * 엑셀 양식
   * =========================================================
   */

  function downloadTemplate() {
    const template =
      channels.length > 0
        ? channels.map(
            (channel) => ({
              화주: getCustomerName(
                channel.customer_id
              ),
              판매채널그룹:
                channel.channel_group,
              판매채널코드:
                channel.channel_code,
              판매채널:
                channel.channel_name,
              사용여부:
                channel.is_active
                  ? "Y"
                  : "N",
            })
          )
        : [
            {
              화주: "종근당건강",
              판매채널그룹:
                "편의점",
              판매채널코드:
                "C-CU",
              판매채널: "CU",
              사용여부: "Y",
            },
          ];

    const worksheet =
      XLSX.utils.json_to_sheet(
        template
      );

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 12 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "판매채널"
    );

    XLSX.writeFile(
      workbook,
      "판매채널_업로드양식.xlsx"
    );
  }

  /*
   * =========================================================
   * 엑셀 업로드
   * =========================================================
   */

  function openExcelUpload() {
    fileInputRef.current?.click();
  }

  async function handleExcelUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
        });

      const sheetName =
        workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error(
          "엑셀 시트를 찾을 수 없습니다."
        );
      }

      const worksheet =
        workbook.Sheets[
          sheetName
        ];

      const rows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: "",
        });

      if (rows.length === 0) {
        throw new Error(
          "엑셀 파일에 데이터가 없습니다."
        );
      }

      const uploadData: {
        customer_id: string;
        channel_group: string;
        channel_code: string;
        channel_name: string;
        is_active: boolean;
      }[] = [];

      const validationErrors: string[] =
        [];

      rows.forEach(
        (row, index) => {
          const rowNumber =
            index + 2;

          const customerName =
            String(
              row["화주"] ?? ""
            ).trim();

          const group =
            String(
              row[
                "판매채널그룹"
              ] ?? ""
            ).trim();

          const code =
            String(
              row[
                "판매채널코드"
              ] ?? ""
            ).trim();

          const name =
            String(
              row["판매채널"] ??
                row["판매채널명"] ??
                ""
            ).trim();

          const active =
            String(
              row["사용여부"] ??
                "Y"
            )
              .trim()
              .toUpperCase();

          const customer =
            customers.find(
              (item) =>
                item.name ===
                customerName
            );

          if (!customerName) {
            validationErrors.push(
              `${rowNumber}행: 화주가 없습니다.`
            );
          } else if (!customer) {
            validationErrors.push(
              `${rowNumber}행: "${customerName}" 화주를 찾을 수 없습니다.`
            );
          }

          if (!group) {
            validationErrors.push(
              `${rowNumber}행: 판매채널그룹이 없습니다.`
            );
          }

          if (!code) {
            validationErrors.push(
              `${rowNumber}행: 판매채널코드가 없습니다.`
            );
          }

          if (!name) {
            validationErrors.push(
              `${rowNumber}행: 판매채널명이 없습니다.`
            );
          }

          if (
            active !== "Y" &&
            active !== "N"
          ) {
            validationErrors.push(
              `${rowNumber}행: 사용여부는 Y 또는 N이어야 합니다.`
            );
          }

          if (
            customer &&
            group &&
            code &&
            name &&
            (active === "Y" ||
              active === "N")
          ) {
            uploadData.push({
              customer_id:
                customer.id,
              channel_group:
                group,
              channel_code:
                code,
              channel_name:
                name,
              is_active:
                active === "Y",
            });
          }
        }
      );

      if (
        validationErrors.length >
        0
      ) {
        setError(
          `엑셀 검증 오류\n\n${validationErrors
            .slice(0, 20)
            .join("\n")}${
            validationErrors.length >
            20
              ? "\n... 외 오류가 더 있습니다."
              : ""
          }`
        );

        return;
      }

      const confirmed =
        window.confirm(
          `${uploadData.length}건의 판매채널을 등록/수정하시겠습니까?`
        );

      if (!confirmed) {
        return;
      }

      setSaving(true);

      /*
       * customer_id + channel_code
       * 기준으로 신규/수정
       */

      const { error } =
        await supabase
          .from("sales_channels")
          .upsert(
            uploadData,
            {
              onConflict:
                "customer_id,channel_code",
            }
          );

      if (error) {
        throw error;
      }

      await loadData();

      setMessage(
        `${uploadData.length}건의 판매채널 업로드가 완료되었습니다.`
      );
    } catch (err) {
      console.error(
        "엑셀 업로드 오류:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "엑셀 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }
    }
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <main className="page">
      <div className="page-inner">

        {/* ===================================================
            HEADER
        =================================================== */}

        <header className="page-header">
          <div>
            <div className="eyebrow">
              SALES CHANNEL
            </div>

            <h1>
              판매채널 관리
            </h1>

            <p>
              화주별 판매채널과
              판매채널 그룹을 관리합니다.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="button secondary"
              onClick={
                downloadTemplate
              }
            >
              엑셀 양식
            </button>

            <button
              type="button"
              className="button secondary"
              onClick={
                openExcelUpload
              }
              disabled={saving}
            >
              엑셀 업로드
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={
                handleExcelUpload
              }
              style={{
                display: "none",
              }}
            />

            <button
              type="button"
              className="button primary"
              onClick={
                openCreateForm
              }
            >
              + 판매채널 등록
            </button>
          </div>
        </header>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="alert error">
            <strong>
              오류
            </strong>

            <pre>
              {error}
            </pre>
          </div>
        )}

        {/* ===================================================
            MESSAGE
        =================================================== */}

        {message && (
          <div className="alert success">
            {message}
          </div>
        )}

        {/* ===================================================
            FILTER
        =================================================== */}

        <section className="filter-card">

          <div className="filter-row">

            <select
              value={
                customerFilter
              }
              onChange={(e) =>
                setCustomerFilter(
                  e.target.value
                )
              }
              className="filter-select"
            >
              <option value="전체">
                전체 화주
              </option>

              {customers.map(
                (customer) => (
                  <option
                    key={
                      customer.id
                    }
                    value={
                      customer.name
                    }
                  >
                    {
                      customer.name
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={
                groupFilter
              }
              onChange={(e) =>
                setGroupFilter(
                  e.target.value
                )
              }
              className="filter-select"
            >
              <option value="전체">
                전체 판매채널 그룹
              </option>

              {CHANNEL_GROUPS.map(
                (group) => (
                  <option
                    key={group}
                    value={group}
                  >
                    {group}
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
              placeholder="화주, 판매채널 코드, 판매채널명 검색"
              className="search-input"
            />

          </div>

          <div className="group-buttons">

            <FilterButton
              active={
                groupFilter ===
                "전체"
              }
              onClick={() =>
                setGroupFilter(
                  "전체"
                )
              }
            >
              전체
            </FilterButton>

            {CHANNEL_GROUPS.map(
              (group) => (
                <FilterButton
                  key={group}
                  active={
                    groupFilter ===
                    group
                  }
                  onClick={() =>
                    setGroupFilter(
                      group
                    )
                  }
                >
                  {group}
                </FilterButton>
              )
            )}

          </div>

        </section>

        {/* ===================================================
            SUMMARY
        =================================================== */}

        <section className="summary-grid">

          <SummaryCard
            title="전체 판매채널"
            value={
              totalCount
            }
            description="현재 필터 기준 판매채널"
          />

          <SummaryCard
            title="판매채널 그룹"
            value={
              groupCount
            }
            description="현재 등록된 그룹"
          />

          <SummaryCard
            title="사용중 판매채널"
            value={
              activeCount
            }
            description="현재 사용중인 채널"
          />

        </section>

        {/* ===================================================
            FORM
        =================================================== */}

        {showForm && (
          <section className="form-card">

            <div className="form-header">
              <div>
                <h2>
                  {editingId
                    ? "판매채널 수정"
                    : "판매채널 등록"}
                </h2>

                <p>
                  화주와 판매채널 정보를
                  입력해주세요.
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => {
                  resetForm();
                  setShowForm(
                    false
                  );
                }}
              >
                ×
              </button>
            </div>

            <div className="form-grid">

              <FormField label="화주">
                <select
                  value={
                    formCustomerId
                  }
                  onChange={(e) =>
                    setFormCustomerId(
                      e.target.value
                    )
                  }
                  className="form-input"
                >
                  <option value="">
                    화주 선택
                  </option>

                  {customers.map(
                    (customer) => (
                      <option
                        key={
                          customer.id
                        }
                        value={
                          customer.id
                        }
                      >
                        {
                          customer.name
                        }
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField label="판매채널 그룹">
                <select
                  value={
                    formGroup
                  }
                  onChange={(e) =>
                    setFormGroup(
                      e.target.value
                    )
                  }
                  className="form-input"
                >
                  {CHANNEL_GROUPS.map(
                    (group) => (
                      <option
                        key={group}
                        value={group}
                      >
                        {group}
                      </option>
                    )
                  )}
                </select>
              </FormField>

              <FormField label="판매채널 코드">
                <input
                  value={
                    formCode
                  }
                  onChange={(e) =>
                    setFormCode(
                      e.target.value
                    )
                  }
                  placeholder="예: C-CU"
                  className="form-input"
                />
              </FormField>

              <FormField label="판매채널">
                <input
                  value={
                    formName
                  }
                  onChange={(e) =>
                    setFormName(
                      e.target.value
                    )
                  }
                  placeholder="예: CU"
                  className="form-input"
                />
              </FormField>

              <FormField label="상태">
                <label className="active-check">
                  <input
                    type="checkbox"
                    checked={
                      formActive
                    }
                    onChange={(e) =>
                      setFormActive(
                        e.target
                          .checked
                      )
                    }
                  />

                  <span>
                    사용중
                  </span>
                </label>
              </FormField>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(
                    false
                  );
                }}
              >
                취소
              </button>

              <button
                type="button"
                className="button primary"
                onClick={
                  saveChannel
                }
                disabled={saving}
              >
                {saving
                  ? "저장중..."
                  : editingId
                  ? "수정 저장"
                  : "등록"}
              </button>

            </div>

          </section>
        )}

        {/* ===================================================
            TABLE
        =================================================== */}

        <section className="table-card">

          <div className="table-header">

            <div>
              <h2>
                판매채널 목록
              </h2>

              <p>
                화주별 판매채널과
                판매채널 코드를 관리합니다.
              </p>
            </div>

            <div className="table-count">
              {filteredChannels.length}
              건
            </div>

          </div>

          {loading ? (
            <div className="empty">
              데이터를 불러오는 중입니다.
            </div>
          ) : filteredChannels.length ===
            0 ? (
            <div className="empty">
              등록된 판매채널이 없습니다.
            </div>
          ) : (
            <div className="table-wrap">

              <table>

                <thead>
                  <tr>
                    <th>No</th>
                    <th>화주</th>
                    <th>판매채널 그룹</th>
                    <th>판매채널 코드</th>
                    <th>판매채널</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredChannels.map(
                    (
                      channel,
                      index
                    ) => (
                      <tr
                        key={
                          channel.id
                        }
                      >

                        <td>
                          {index + 1}
                        </td>

                        <td className="strong">
                          {getCustomerName(
                            channel.customer_id
                          )}
                        </td>

                        <td>
                          <span className="group-badge">
                            {
                              channel.channel_group
                            }
                          </span>
                        </td>

                        <td className="strong">
                          {
                            channel.channel_code
                          }
                        </td>

                        <td className="strong">
                          {
                            channel.channel_name
                          }
                        </td>

                        <td>
                          <button
                            type="button"
                            className={
                              channel.is_active
                                ? "status active"
                                : "status inactive"
                            }
                            onClick={() =>
                              toggleActive(
                                channel
                              )
                            }
                          >
                            {channel.is_active
                              ? "사용중"
                              : "미사용"}
                          </button>
                        </td>

                        <td>

                          <div className="manage-buttons">

                            <button
                              type="button"
                              className="small-button"
                              onClick={() =>
                                openEditForm(
                                  channel
                                )
                              }
                            >
                              수정
                            </button>

                            <button
                              type="button"
                              className="small-button danger"
                              onClick={() =>
                                deleteChannel(
                                  channel
                                )
                              }
                            >
                              삭제
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>

      {/* =====================================================
          STYLE
      ===================================================== */}

      <style jsx>{`

        .page {
          min-height: 100vh;
          background: #f5f7fa;
          color: #111827;
          font-family:
            "Malgun Gothic",
            "Noto Sans KR",
            Arial,
            sans-serif;
        }

        .page-inner {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 42px 48px 70px;
        }

        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .eyebrow {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #2563eb;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.25;
          font-weight: 800;
          letter-spacing: -1.2px;
        }

        .page-header p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 15px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .button {
          height: 44px;
          padding: 0 17px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .button.primary {
          border: 1px solid #2563eb;
          background: #2563eb;
          color: white;
        }

        .button.primary:hover {
          background: #1d4ed8;
        }

        .button.secondary {
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
        }

        .button.secondary:hover {
          background: #f8fafc;
        }

        .button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .alert {
          margin-bottom: 18px;
          padding: 15px 18px;
          border-radius: 10px;
          font-size: 13px;
          white-space: pre-line;
        }

        .alert.error {
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .alert.success {
          color: #166534;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .alert pre {
          margin: 7px 0 0;
          white-space: pre-wrap;
          font-family: inherit;
        }

        .filter-card,
        .form-card,
        .table-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
        }

        .filter-card {
          padding: 18px;
          margin-bottom: 18px;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 220px 240px 1fr;
          gap: 10px;
        }

        .filter-select,
        .search-input,
        .form-input {
          height: 44px;
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0 13px;
          background: white;
          color: #111827;
          font-size: 14px;
          outline: none;
        }

        .filter-select:focus,
        .search-input:focus,
        .form-input:focus {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px
            rgba(37, 99, 235, 0.08);
        }

        .group-buttons {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 13px;
        }

        .filter-button {
          border: none;
          border-radius: 8px;
          padding: 9px 14px;
          background: #f1f5f9;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .filter-button.active {
          background: #2563eb;
          color: white;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 21px 23px;
        }

        .summary-title {
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }

        .summary-value {
          margin-top: 8px;
          font-size: 30px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .summary-description {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 12px;
        }

        .form-card {
          padding: 23px;
          margin-bottom: 18px;
        }

        .form-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .form-header h2,
        .table-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .form-header p,
        .table-header p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .close-button {
          width: 34px;
          height: 34px;
          border: none;
          background: #f1f5f9;
          border-radius: 8px;
          font-size: 22px;
          color: #64748b;
          cursor: pointer;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(5, 1fr);
          gap: 12px;
        }

        .form-label {
          display: block;
          margin-bottom: 7px;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
        }

        .active-check {
          height: 44px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 18px;
        }

        .table-card {
          overflow: hidden;
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 21px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .table-count {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
        }

        th {
          padding: 14px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
          text-align: left;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #475569;
          font-size: 13px;
          white-space: nowrap;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .strong {
          color: #111827;
          font-weight: 800;
        }

        .group-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 6px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 12px;
          font-weight: 800;
        }

        .status {
          border: none;
          border-radius: 999px;
          padding: 6px 11px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .status.active {
          background: #dcfce7;
          color: #15803d;
        }

        .status.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .manage-buttons {
          display: flex;
          gap: 6px;
        }

        .small-button {
          padding: 7px 10px;
          border: 1px solid #d1d5db;
          border-radius: 7px;
          background: white;
          color: #374151;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .small-button:hover {
          background: #f8fafc;
        }

        .small-button.danger {
          border-color: #fecaca;
          color: #dc2626;
        }

        .empty {
          padding: 75px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        @media (max-width: 1100px) {
          .page-inner {
            padding: 30px 24px 60px;
          }

          .page-header {
            flex-direction: column;
          }

          .filter-row {
            grid-template-columns:
              1fr 1fr;
          }

          .search-input {
            grid-column: 1 / -1;
          }

          .form-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .page-inner {
            padding: 24px 16px 50px;
          }

          h1 {
            font-size: 28px;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions .button {
            flex: 1;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .search-input {
            grid-column: auto;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .table-header {
            padding: 18px;
          }
        }

      `}</style>
    </main>
  );
}

/*
 * =========================================================
 * COMPONENTS
 * =========================================================
 */

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="summary-card">
      <div className="summary-title">
        {title}
      </div>

      <div className="summary-value">
        {value.toLocaleString()}
      </div>

      <div className="summary-description">
        {description}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "filter-button active"
          : "filter-button"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="form-label">
        {label}
      </label>

      {children}
    </div>
  );
}