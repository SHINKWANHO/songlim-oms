"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MenuItem = {
  name: string;
  href: string;
};

type Menu = {
  name: string;
  icon: string;
  href?: string;
  children?: MenuItem[];
};

type Customer = {
  id: string;
  name: string;
};

type Order = {
  id: string;
  order_number: string | null;
  order_no: string | null;
  customer_id: string | null;
  order_date: string | null;
  total_qty: number | null;
  status: string | null;
};

type CustomerSummary = {
  id: string;
  name: string;
  todayOrders: number;
  todayQty: number;
  pending: number;
  confirmed: number;
  cancelled: number;
};

const menus: Menu[] = [
  {
    name: "대시보드",
    icon: "▦",
    href: "/",
  },
  {
    name: "주문관리",
    icon: "▤",
    children: [
      { name: "전체 주문", href: "/orders" },
      { name: "신규 주문", href: "/orders/new" },
      { name: "주문 확정", href: "/orders/confirmed" },
      { name: "주문 취소", href: "/orders/cancelled" },
      { name: "주문 조회", href: "/orders/search" },
    ],
  },
  {
    name: "주문수집",
    icon: "↻",
    children: [
      {
        name: "판매채널별 주문수집",
        href: "/order-collection",
      },
      {
        name: "수집 이력",
        href: "/order-collection/history",
      },
      {
        name: "수집 오류",
        href: "/order-collection/errors",
      },
    ],
  },
  {
    name: "판매채널관리",
    icon: "◎",
    children: [
      {
        name: "판매채널",
        href: "/sales-channels",
      },
      {
        name: "채널 그룹",
        href: "/sales-channel-groups",
      },
      {
        name: "API 연결관리",
        href: "/sales-channels/api",
      },
    ],
  },
  {
    name: "거래처관리",
    icon: "▣",
    children: [
      {
        name: "거래처",
        href: "/customers",
      },
      {
        name: "거래처 상품",
        href: "/customer-products",
      },
      {
        name: "납품처",
        href: "/delivery-targets",
      },
      {
        name: "매장",
        href: "/stores",
      },
    ],
  },
];

export default function Home() {
  const pathname = usePathname();
  const supabase = createClient();

  const [openMenu, setOpenMenu] = useState<string | null>("주문관리");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [customersResult, ordersResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name")
          .eq("active", true)
          .order("name", { ascending: true }),

        supabase
          .from("orders")
          .select(
            "id, order_number, order_no, customer_id, order_date, total_qty, status"
          )
          .order("order_date", { ascending: false })
          .limit(1000),
      ]);

      if (customersResult.error) {
        console.error(
          "거래처 조회 오류:",
          customersResult.error
        );
      }

      if (ordersResult.error) {
        console.error(
          "주문 조회 오류:",
          ordersResult.error
        );
      }

      setCustomers(customersResult.data ?? []);
      setOrders(ordersResult.data ?? []);
    } catch (error) {
      console.error("대시보드 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  }

  const todayString = new Date()
    .toISOString()
    .slice(0, 10);

  const todayOrders = orders.filter(
    (order) =>
      order.order_date?.slice(0, 10) === todayString
  );

  const todayQty = todayOrders.reduce(
    (sum, order) => sum + (order.total_qty ?? 0),
    0
  );

  const confirmedOrders = orders.filter((order) =>
    isConfirmedStatus(order.status)
  );

  const cancelledOrders = orders.filter((order) =>
    isCancelledStatus(order.status)
  );

  const pendingOrders = orders.filter((order) =>
    isPendingStatus(order.status)
  );

  const customerSummary: CustomerSummary[] =
    customers.map((customer) => {
      const customerOrders = orders.filter(
        (order) =>
          order.customer_id === customer.id
      );

      const customerTodayOrders =
        customerOrders.filter(
          (order) =>
            order.order_date?.slice(0, 10) ===
            todayString
        );

      return {
        id: customer.id,
        name: customer.name,
        todayOrders:
          customerTodayOrders.length,
        todayQty:
          customerTodayOrders.reduce(
            (sum, order) =>
              sum + (order.total_qty ?? 0),
            0
          ),
        pending:
          customerOrders.filter((order) =>
            isPendingStatus(order.status)
          ).length,
        confirmed:
          customerOrders.filter((order) =>
            isConfirmedStatus(order.status)
          ).length,
        cancelled:
          customerOrders.filter((order) =>
            isCancelledStatus(order.status)
          ).length,
      };
    });

  function toggleMenu(name: string) {
    setOpenMenu((current) =>
      current === name ? null : name
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* LEFT SIDEBAR */}
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[230px] flex-col bg-slate-900 text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
            SONGLIM LOGISTICS
          </div>

          <div className="mt-2 text-[20px] font-black">
            송림물류 OMS
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {menus.map((menu) => {
              const hasChildren =
                !!menu.children &&
                menu.children.length > 0;

              const isOpen =
                openMenu === menu.name;

              const isMainActive =
                menu.href === pathname ||
                (menu.href !== "/" &&
                  !!menu.href &&
                  pathname.startsWith(menu.href));

              const hasActiveChild =
                menu.children?.some(
                  (child) =>
                    pathname === child.href ||
                    pathname.startsWith(
                      `${child.href}/`
                    )
                ) ?? false;

              if (!hasChildren && menu.href) {
                return (
                  <Link
                    key={menu.name}
                    href={menu.href}
                    className={`flex h-11 items-center rounded-lg px-3 text-[14px] font-semibold transition ${
                      isMainActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="mr-3 flex w-5 justify-center text-[15px]">
                      {menu.icon}
                    </span>

                    {menu.name}
                  </Link>
                );
              }

              return (
                <div key={menu.name}>
                  <button
                    type="button"
                    onClick={() =>
                      toggleMenu(menu.name)
                    }
                    className={`flex h-11 w-full items-center rounded-lg px-3 text-left text-[14px] font-semibold transition ${
                      isOpen || hasActiveChild
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="mr-3 flex w-5 justify-center text-[15px]">
                      {menu.icon}
                    </span>

                    <span className="flex-1">
                      {menu.name}
                    </span>

                    <span className="text-xs text-slate-400">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="ml-4 mt-1 border-l border-white/10 pl-2">
                      {menu.children?.map(
                        (child) => {
                          const childActive =
                            pathname ===
                              child.href ||
                            pathname.startsWith(
                              `${child.href}/`
                            );

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex min-h-[38px] items-center rounded-md px-3 text-[13px] transition ${
                                childActive
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="mr-2 text-[9px]">
                                ●
                              </span>

                              {child.name}
                            </Link>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="text-[10px] font-semibold text-slate-500">
            LOGIN USER
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-sm font-semibold">
              관리자
            </span>

            <button
              type="button"
              className="text-[11px] text-slate-400 hover:text-white"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT CONTENT */}
      <div className="ml-[230px] min-h-screen">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-40 h-[76px] border-b border-slate-200 bg-white">
          <div className="flex h-full items-center justify-between px-8">
            <div>
              <div className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
                SONGLIM LOGISTICS
              </div>

              <h1 className="mt-1 text-[20px] font-bold text-slate-900">
                OMS 대시보드
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                새로고침
              </button>

              <Link
                href="/order-collection"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                주문수집
              </Link>

              <Link
                href="/orders/new"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                + 주문등록
              </Link>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="p-8">
          <div className="mb-7">
            <h2 className="text-[28px] font-black text-slate-900">
              주문 현황
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              거래처별 주문 및 OMS 처리 현황을
              확인합니다.
            </p>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-4 gap-5">
            <DashboardCard
              title="오늘 주문"
              value={
                loading
                  ? "-"
                  : todayOrders.length.toLocaleString()
              }
              unit="건"
              description={`오늘 주문수량 ${todayQty.toLocaleString()} EA`}
            />

            <DashboardCard
              title="전체 주문"
              value={
                loading
                  ? "-"
                  : orders.length.toLocaleString()
              }
              unit="건"
              description="현재 시스템에 등록된 주문"
            />

            <DashboardCard
              title="주문 확정"
              value={
                loading
                  ? "-"
                  : confirmedOrders.length.toLocaleString()
              }
              unit="건"
              description="확정 처리된 주문"
            />

            <DashboardCard
              title="미처리 주문"
              value={
                loading
                  ? "-"
                  : pendingOrders.length.toLocaleString()
              }
              unit="건"
              description="처리가 필요한 주문"
            />
          </div>

          {/* CUSTOMER SUMMARY */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  거래처별 주문 현황
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  오늘 주문 및 주문 처리 상태
                </p>
              </div>

              <Link
                href="/customers"
                className="text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                거래처 관리 →
              </Link>
            </div>

            {loading ? (
              <div className="py-20 text-center text-sm text-slate-400">
                데이터를 불러오는 중입니다.
              </div>
            ) : customerSummary.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-sm font-semibold text-slate-500">
                  등록된 거래처가 없습니다.
                </div>

                <Link
                  href="/customers"
                  className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white"
                >
                  거래처 등록
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-[30%] px-6 py-4 text-left font-bold text-slate-500">
                        거래처
                      </th>

                      <th className="px-4 py-4 text-center font-bold text-slate-500">
                        오늘 주문
                      </th>

                      <th className="px-4 py-4 text-center font-bold text-slate-500">
                        주문수량
                      </th>

                      <th className="px-4 py-4 text-center font-bold text-slate-500">
                        미처리
                      </th>

                      <th className="px-4 py-4 text-center font-bold text-slate-500">
                        주문확정
                      </th>

                      <th className="px-4 py-4 text-center font-bold text-slate-500">
                        취소/반품
                      </th>

                      <th className="px-4 py-4 text-center font-bold text-slate-500">
                        상태
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {customerSummary.map(
                      (customer) => (
                        <tr
                          key={customer.id}
                          onClick={() => {
                            window.location.href =
                              `/orders/search?customer_id=${customer.id}`;
                          }}
                          className="cursor-pointer border-b border-slate-100 hover:bg-blue-50"
                        >
                          <td className="px-6 py-5">
                            <div className="text-[17px] font-bold text-slate-900">
                              {customer.name}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              거래처 주문관리
                            </div>
                          </td>

                          <NumberCell
                            value={
                              customer.todayOrders
                            }
                          />

                          <NumberCell
                            value={
                              customer.todayQty
                            }
                            unit="EA"
                          />

                          <NumberCell
                            value={
                              customer.pending
                            }
                            warning
                          />

                          <NumberCell
                            value={
                              customer.confirmed
                            }
                            blue
                          />

                          <NumberCell
                            value={
                              customer.cancelled
                            }
                            danger
                          />

                          <td className="px-4 py-5 text-center">
                            <span
                              className={`inline-flex min-w-[68px] justify-center rounded-full px-3 py-1.5 text-xs font-bold ${
                                customer.pending >
                                0
                                  ? "bg-orange-50 text-orange-600"
                                  : "bg-green-50 text-green-600"
                              }`}
                            >
                              {customer.pending >
                              0
                                ? "처리중"
                                : "정상"}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* RECENT ORDERS */}
          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  최근 주문
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  최근 등록된 주문 10건
                </p>
              </div>

              <Link
                href="/orders"
                className="text-xs font-bold text-blue-600"
              >
                전체 주문 보기 →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <th className="px-6 py-4">
                      주문번호
                    </th>

                    <th className="px-6 py-4">
                      주문일
                    </th>

                    <th className="px-6 py-4">
                      거래처
                    </th>

                    <th className="px-6 py-4 text-right">
                      수량
                    </th>

                    <th className="px-6 py-4 text-center">
                      상태
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-20 text-center text-slate-400"
                      >
                        주문을 불러오는 중입니다.
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-20 text-center text-slate-400"
                      >
                        등록된 주문이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    orders
                      .slice(0, 10)
                      .map((order) => {
                        const customer =
                          customers.find(
                            (item) =>
                              item.id ===
                              order.customer_id
                          );

                        return (
                          <tr
                            key={order.id}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {order.order_number ||
                                order.order_no ||
                                "-"}
                            </td>

                            <td className="px-6 py-4 text-slate-500">
                              {formatDate(
                                order.order_date
                              )}
                            </td>

                            <td className="px-6 py-4 font-semibold text-slate-700">
                              {customer?.name ||
                                "-"}
                            </td>

                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                              {(
                                order.total_qty ??
                                0
                              ).toLocaleString()}{" "}
                              <span className="text-xs font-normal text-slate-400">
                                EA
                              </span>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <OrderStatus
                                status={
                                  order.status
                                }
                              />
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  unit,
  description,
}: {
  title: string;
  value: string;
  unit: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-bold text-slate-500">
        {title}
      </div>

      <div className="mt-4 flex items-end">
        <span className="text-[36px] font-black leading-none tracking-tight text-slate-900">
          {value}
        </span>

        <span className="mb-1 ml-2 text-sm font-bold text-slate-500">
          {unit}
        </span>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        {description}
      </div>
    </div>
  );
}

function NumberCell({
  value,
  unit = "건",
  warning = false,
  blue = false,
  danger = false,
}: {
  value: number;
  unit?: string;
  warning?: boolean;
  blue?: boolean;
  danger?: boolean;
}) {
  let textColor = "text-slate-900";

  if (warning) {
    textColor =
      value > 0
        ? "text-orange-600"
        : "text-slate-400";
  }

  if (blue) {
    textColor = "text-blue-600";
  }

  if (danger) {
    textColor =
      value > 0
        ? "text-red-500"
        : "text-slate-400";
  }

  return (
    <td className="px-4 py-5 text-center">
      <span
        className={`text-base font-black ${textColor}`}
      >
        {value.toLocaleString()}
      </span>

      <span className="ml-1 text-xs text-slate-400">
        {unit}
      </span>
    </td>
  );
}

function OrderStatus({
  status,
}: {
  status: string | null;
}) {
  const value = status || "미처리";

  let className =
    "bg-slate-100 text-slate-600";

  if (isConfirmedStatus(status)) {
    className = "bg-blue-50 text-blue-600";
  }

  if (isCancelledStatus(status)) {
    className = "bg-red-50 text-red-600";
  }

  if (isPendingStatus(status)) {
    className =
      "bg-orange-50 text-orange-600";
  }

  return (
    <span
      className={`inline-flex min-w-[72px] justify-center rounded-full px-3 py-1.5 text-xs font-bold ${className}`}
    >
      {value}
    </span>
  );
}

function isConfirmedStatus(
  status: string | null
) {
  if (!status) return false;

  return [
    "주문확정",
    "확정",
    "확정완료",
    "confirmed",
    "CONFIRMED",
  ].includes(status);
}

function isCancelledStatus(
  status: string | null
) {
  if (!status) return false;

  return [
    "주문취소",
    "취소",
    "반품",
    "취소/반품",
    "cancelled",
    "canceled",
    "CANCELLED",
  ].includes(status);
}

function isPendingStatus(
  status: string | null
) {
  if (!status) return true;

  return [
    "신규",
    "신규주문",
    "접수",
    "미처리",
    "대기",
    "주문접수",
    "수집완료",
    "new",
    "pending",
    "NEW",
    "PENDING",
  ].includes(status);
}

function formatDate(
  date: string | null
) {
  if (!date) return "-";

  return date.slice(0, 10);
}