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

type ShipperSummary = {
  id: string;
  name: string;
  today: number;
  todayQty: number;
  pending: number;
  confirmed: number;
  cancelled: number;
};

const menus: Menu[] = [
  {
    name: "대시보드",
    icon: "▣",
    href: "/",
  },
  {
    name: "주문관리",
    icon: "□",
    children: [
      { name: "전체주문", href: "/orders" },
      { name: "신규주문", href: "/orders/new" },
      { name: "주문확정", href: "/orders/confirmed" },
      { name: "주문취소", href: "/orders/cancelled" },
      { name: "주문조회", href: "/orders/search" },
    ],
  },
  {
    name: "주문수집",
    icon: "↓",
    children: [
      {
        name: "판매채널별 주문수집",
        href: "/order-collection",
      },
      {
        name: "수집이력",
        href: "/order-collection/history",
      },
      {
        name: "수집오류",
        href: "/order-collection/errors",
      },
    ],
  },
  {
    name: "판매채널관리",
    icon: "→",
    children: [
      {
        name: "판매채널",
        href: "/sales-channels",
      },
      {
        name: "채널그룹",
        href: "/sales-channels/groups",
      },
      {
        name: "API 연결관리",
        href: "/sales-channels/api",
      },
    ],
  },
  {
    name: "거래처관리",
    icon: "≡",
    children: [
      {
        name: "고객사",
        href: "/customers",
      },
      {
        name: "납품처",
        href: "/delivery-places",
      },
      {
        name: "배송지",
        href: "/delivery-addresses",
      },
    ],
  },
  {
    name: "시스템관리",
    icon: "⚙",
    children: [
      {
        name: "사용자관리",
        href: "/system/users",
      },
      {
        name: "환경설정",
        href: "/system/settings",
      },
    ],
  },
];

export default function Home() {
  const pathname = usePathname();

  const supabase = createClient();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  const toggleMenu = (menuName: string) => {
    setOpenMenu((current) =>
      current === menuName ? null : menuName
    );
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [customersResult, ordersResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, name")
            .order("name", { ascending: true }),

          supabase
            .from("orders")
            .select(
              "id, order_number, order_no, customer_id, order_date, total_qty, status"
            )
            .order("order_date", {
              ascending: false,
            }),
        ]);

      if (customersResult.error) {
        console.error(
          "화주사 조회 오류:",
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
      console.error(
        "대시보드 조회 오류:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  const todayString =
    new Date().toISOString().slice(0, 10);

  const todayOrders = orders.filter((order) =>
    order.order_date?.startsWith(todayString)
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

  const shipperSummary: ShipperSummary[] =
  customers.map((customer) => {
    const customerOrders = orders.filter(
      (order) =>
        order.customer_id === customer.id
    );

    const todayOrders =
      customerOrders.filter((order) =>
        order.order_date?.startsWith(
          todayString
        )
      );

    const today = todayOrders.length;

    const todayQty = todayOrders.reduce(
      (sum, order) =>
        sum + (order.total_qty ?? 0),
      0
    );

    const pending =
      customerOrders.filter((order) =>
        isPendingStatus(order.status)
      ).length;

    const confirmed =
      customerOrders.filter((order) =>
        isConfirmedStatus(order.status)
      ).length;

    const cancelled =
      customerOrders.filter((order) =>
        isCancelledStatus(order.status)
      ).length;

    return {
      id: customer.id,
      name: customer.name,
      today,
      todayQty,
      pending,
      confirmed,
      cancelled,
    };
  }); 

  return (
    <div className="min-h-screen bg-[#f3f5f8]">
      {/* =========================
          LEFT SIDEBAR
      ========================== */}
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col bg-[#111827] text-white">
        {/* LOGO */}
        <div className="h-[72px] border-b border-white/10 px-5 py-4">
          <div className="text-[9px] font-bold tracking-widest text-slate-400">
            SONGLIM LOGISTICS
          </div>

          <div className="mt-1 text-[17px] font-black">
            송림물류 OMS
          </div>
        </div>

        {/* SIDE MENU */}
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
    menu.href &&
    pathname.startsWith(menu.href));

const hasActiveChild =
  menu.children?.some(
    (child) =>
      pathname === child.href ||
      pathname.startsWith(`${child.href}/`)
  ) ?? false;

              if (
                !hasChildren &&
                menu.href
              ) {
                return (
                  <Link
                    key={menu.name}
                    href={menu.href}
                    className={`flex h-10 items-center rounded-md px-3 text-[13px] font-semibold transition ${
                      isMainActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="mr-3 flex w-4 justify-center text-[12px]">
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
                    className={`flex h-10 w-full items-center rounded-md px-3 text-left text-[13px] font-semibold transition ${
                      isOpen ||
                      hasActiveChild
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="mr-3 flex w-4 justify-center text-[12px]">
                      {menu.icon}
                    </span>

                    <span className="flex-1">
                      {menu.name}
                    </span>

                    <span className="text-[13px] text-slate-400">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="ml-4 mt-1 border-l border-white/10 pl-2">
                      {menu.children?.map(
                        (child) => {
                          const childActive =
  pathname === child.href ||
  pathname.startsWith(
    `${child.href}/`
  );

                          return (
                            <Link
                              key={child.href}
                              href={
                                child.href
                              }
                              className={`flex min-h-[36px] items-center rounded-md px-3 text-[12px] transition ${
                                childActive
                                  ? "bg-blue-600 text-white"
                                  : "text-slate-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="mr-2">
                                ·
                              </span>

                              {
                                child.name
                              }
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

        {/* USER */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="text-[10px] text-slate-500">
            LOGIN USER
          </div>

          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs font-semibold">
              관리자
            </span>

            <button
              type="button"
              className="text-[10px] text-slate-400 hover:text-white"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* =========================
          RIGHT CONTENT
      ========================== */}
      <div className="ml-[220px] min-h-screen">
        {/* TOP */}
        <header className="h-[72px] border-b border-slate-200 bg-white">
          <div className="flex h-full items-center justify-between px-7">
            <div>
              <div className="text-[9px] font-bold tracking-widest text-slate-400">
                SONGLIM LOGISTICS
              </div>

              <h1 className="mt-1 text-[18px] font-bold text-slate-900">
                OMS 대시보드
              </h1>
            </div>

            <div className="flex gap-2">
              <Link
                href="/order-collection"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                주문 수집
              </Link>

              <Link
                href="/orders/new"
                className="rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                + 주문 등록
              </Link>
            </div>
          </div>
        </header>

        {/* DASHBOARD */}
        <main className="p-7">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900">
              OMS 대시보드
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              화주사별 주문 및 OMS 처리 현황
            </p>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-4 gap-4">
            <DashboardCard
              title="오늘 주문"
              value={
                loading
                  ? "-"
                  : todayOrders.length.toLocaleString()
              }
              description="오늘 접수된 주문"
            />

            <DashboardCard
              title="전체 주문"
              value={
                loading
                  ? "-"
                  : orders.length.toLocaleString()
              }
              description="누적 주문"
            />

            <DashboardCard
              title="주문확정"
              value={
                loading
                  ? "-"
                  : confirmedOrders.length.toLocaleString()
              }
              description="확정된 주문"
            />

            <DashboardCard
              title="미처리 주문"
              value={
                loading
                  ? "-"
                  : pendingOrders.length.toLocaleString()
              }
              description="처리 대기 주문"
            />
          </div>

          {/* =========================
    화주사 현황
========================= */}
<section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
    <div>
      <h3 className="text-sm font-bold text-slate-900">
        화주사 현황
      </h3>

      <p className="mt-1 text-[11px] text-slate-400">
        화주사별 오늘 주문 및 처리 현황
      </p>
    </div>

    <Link
      href="/customers"
      className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
    >
      화주사 관리 →
    </Link>
  </div>

  {loading ? (
    <div className="py-16 text-center text-xs text-slate-400">
      화주사 현황을 불러오는 중입니다.
    </div>
  ) : shipperSummary.length === 0 ? (
    <div className="py-16 text-center">
      <div className="text-sm font-semibold text-slate-500">
        등록된 화주사가 없습니다.
      </div>

      <Link
        href="/customers"
        className="mt-3 inline-block rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white"
      >
        화주사 등록
      </Link>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="w-[32%] px-5 py-3 text-left font-bold text-slate-500">
              화주사
            </th>

            <th className="w-[13%] px-4 py-3 text-center font-bold text-slate-500">
              오늘 주문
            </th>

            <th className="w-[13%] px-4 py-3 text-center font-bold text-slate-500">
              주문수량
            </th>

            <th className="w-[13%] px-4 py-3 text-center font-bold text-slate-500">
              미처리
            </th>

            <th className="w-[13%] px-4 py-3 text-center font-bold text-slate-500">
              주문확정
            </th>

            <th className="w-[13%] px-4 py-3 text-center font-bold text-slate-500">
              취소/반품
            </th>

            <th className="w-[8%] px-4 py-3 text-center font-bold text-slate-500">
              상태
            </th>
          </tr>
        </thead>

        <tbody>
          {shipperSummary.map((shipper) => (
            <tr
              key={shipper.id}
              onClick={() => {
                window.location.href =
                  `/orders/search?customer_id=${shipper.id}`;
              }}
              className="cursor-pointer border-b border-slate-100 transition hover:bg-blue-50"
            >
              {/* 화주사 */}
              <td className="px-4 py-4">
                <div className="text-[20px] font-bold text-slate-900">
                  {shipper.name}
                </div>

                <div className="mt-1 text-[12px] text-slate-400">
                  화주사 주문관리
                </div>
              </td>

              {/* 오늘 주문 */}
              <td className="px-4 py-4 text-center">
                <span className="font-bold text-slate-900">
                  {shipper.today.toLocaleString()}
                </span>

                <span className="ml-2 text-[15px] text-slate-400">
                  건
                </span>
              </td>

              {/* 주문수량 */}
              <td className="px-4 py-4 text-center">
                <span className="font-bold text-slate-900">
                  {shipper.todayQty.toLocaleString()}
                </span>

                <span className="ml-2 text-[15px] text-slate-400">
                  EA
                </span>
              </td>

              {/* 미처리 */}
              <td className="px-4 py-4 text-center">
                <span
                  className={`font-bold ${
                    shipper.pending > 0
                      ? "text-orange-600"
                      : "text-slate-400"
                  }`}
                >
                  {shipper.pending.toLocaleString()}
                </span>

                <span className="ml-2 text-[15px] text-slate-400">
                  건
                </span>
              </td>

              {/* 주문확정 */}
              <td className="px-4 py-4 text-center">
                <span className="font-bold text-blue-600">
                  {shipper.confirmed.toLocaleString()}
                </span>

                <span className="ml-2 text-[15px] text-slate-400">
                  건
                </span>
              </td>

              {/* 취소/반품 */}
              <td className="px-4 py-4 text-center">
                <span
                  className={`font-bold ${
                    shipper.cancelled > 0
                      ? "text-red-500"
                      : "text-slate-400"
                  }`}
                >
                  {shipper.cancelled.toLocaleString()}
                </span>

                <span className="ml-2 text-[15px] text-slate-400">
                  건
                </span>
              </td>

              {/* 상태 */}
              <td className="px-4 py-4 text-center">
                <span
                  className={`inline-flex min-w-[60px] justify-center rounded-full px-3 py-1 text-[15px] font-bold ${
                    shipper.pending > 0
                      ? "bg-orange-50 text-orange-600"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {shipper.pending > 0
                    ? "처리중"
                    : "정상"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

{/* RECENT ORDER */}
          <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  최근 주문
                </h3>

                <p className="mt-1 text-[11px] text-slate-400">
                  최근 등록된 주문 현황
                </p>
              </div>

              <Link
                href="/orders"
                className="text-[11px] font-bold text-blue-600"
              >
                전체보기 →
              </Link>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <th className="px-5 py-3">
                    주문번호
                  </th>

                  <th className="px-5 py-3">
                    주문일
                  </th>

                  <th className="px-5 py-3">
                    화주사
                  </th>

                  <th className="px-5 py-3">
                    수량
                  </th>

                  <th className="px-5 py-3">
                    상태
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-slate-400"
                    >
                      주문을 불러오는 중입니다.
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-16 text-center text-slate-400"
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
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {order.order_number ||
                              order.order_no ||
                              "-"}
                          </td>

                          <td className="px-5 py-3 text-slate-500">
                            {formatDate(
                              order.order_date
                            )}
                          </td>

                          <td className="px-5 py-3 font-semibold text-slate-700">
                            {customer?.name ||
                              "-"}
                          </td>

                          <td className="px-5 py-3">
                            {(
                              order.total_qty ??
                              0
                            ).toLocaleString()}
                          </td>

                          <td className="px-5 py-3">
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
          </section>
        </main>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-semibold text-slate-500">
        {title}
      </div>

      <div className="mt-3 text-3xl font-black text-slate-900">
        {value}
        <span className="ml-1 text-xs font-semibold text-slate-500">
          건
        </span>
      </div>

      <div className="mt-2 text-[10px] text-slate-400">
        {description}
      </div>
    </div>
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
    className =
      "bg-blue-50 text-blue-600";
  }

  if (isCancelledStatus(status)) {
    className =
      "bg-red-50 text-red-600";
  }

  if (isPendingStatus(status)) {
    className =
      "bg-orange-50 text-orange-600";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${className}`}
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