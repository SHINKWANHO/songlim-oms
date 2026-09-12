"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  {
    name: "관리자",
    icon: "⚙",
    children: [
      {
        name: "사용자 관리",
        href: "/admin/users",
      },
      {
        name: "판매채널 API",
        href: "/sales-channels/api",
      },
      {
        name: "시스템 설정",
        href: "/admin/settings",
      },
    ],
  },
];

export default function OmsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(
  () => createClient(),
  []
);
  const [openMenu, setOpenMenu] =
    useState<string | null>("주문관리");

    const [userRole, setUserRole] =
  useState<"ADMIN" | "MANAGER" | "USER" | null>(null);

  useEffect(() => {
  const activeMenu = menus.find((menu) =>
    menu.children?.some(
      (child) =>
        pathname === child.href ||
        pathname.startsWith(`${child.href}/`)
    )
  );

  if (activeMenu) {
    setOpenMenu(activeMenu.name);
  }
}, [pathname]);


useEffect(() => {
  async function loadUserRole() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserRole(null);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("oms_users")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    console.log("현재 Auth 사용자:", user.id);
    console.log("OMS 사용자:", data);
    console.log("OMS 조회 오류:", error);

    if (error || !data) {
      setUserRole(null);
      return;
    }

    setUserRole(data.role);
  }

  loadUserRole();
}, [supabase]);

function toggleMenu(name: string) {
    setOpenMenu((current) =>
      current === name ? null : name
    );
  }

  async function handleLogout() {
  const confirmed =
    window.confirm("로그아웃하시겠습니까?");

  if (!confirmed) return;

  await supabase.auth.signOut();

  router.replace("/login");
  router.refresh();
}

  function isChildActive(href: string) {
    /*
      /orders가 /orders/new까지 같이 활성화되는 문제 방지
    */
    if (href === "/orders") {
      return pathname === "/orders";
    }

    /*
      /order-collection이
      /order-collection/history까지 같이 활성화되는 문제 방지
    */
    if (href === "/order-collection") {
      return pathname === "/order-collection";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
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

          {menus
  .filter(
    (menu) =>
      menu.name !== "관리자" ||
      userRole === "ADMIN"
  )
  .map((menu) => {
            const hasChildren =
              !!menu.children &&
              menu.children.length > 0;

            const isOpen =
              openMenu === menu.name;

            const isMainActive =
              menu.href === pathname ||
              (
                menu.href !== "/" &&
                !!menu.href &&
                pathname.startsWith(menu.href)
              );

            const hasActiveChild =
              menu.children?.some((child) =>
                isChildActive(child.href)
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

                    {menu.children?.map((child) => {
                      const childActive =
                        isChildActive(child.href);

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
                    })}

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

  <div className="mt-2">
    {userRole === "ADMIN" && (
  <Link
    href="/admin"
    className="block text-sm font-semibold text-white hover:text-blue-300"
  >
    관리자
  </Link>
)}  

    <button
      type="button"
      onClick={handleLogout}
      className="mt-2 text-[11px] text-slate-400 hover:text-white"
    >
      로그아웃
    </button>
  </div>
</div>

    </aside>
  );
}