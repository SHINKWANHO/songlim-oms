"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type MenuItem = {
  name: string;
  href: string;
};

type MenuSectionProps = {
  title: string;
  icon: string;
  menuKey: string;
  items: MenuItem[];
  active: boolean;
  openMenu: string | null;
  setOpenMenu: (value: string | null) => void;
};

function MenuSection({
  title,
  icon,
  menuKey,
  items,
  active,
  openMenu,
  setOpenMenu,
}: MenuSectionProps) {
  const pathname = usePathname();
  const isOpen = openMenu === menuKey;

  return (
    <div style={{ marginTop: "4px" }}>
      <button
        type="button"
        onClick={() =>
          setOpenMenu(isOpen ? null : menuKey)
        }
        style={{
          width: "100%",
          height: "44px",
          border: "none",
          borderRadius: "8px",
          background: active
            ? "rgba(255,255,255,0.10)"
            : "transparent",
          color: "#cbd5e1",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 700,
          textAlign: "left",
        }}
      >
        <span
          style={{
            width: "20px",
            marginRight: "10px",
            textAlign: "center",
            fontSize: "15px",
          }}
        >
          {icon}
        </span>

        <span style={{ flex: 1 }}>
          {title}
        </span>

        <span
          style={{
            color: "#94a3b8",
            fontSize: "12px",
          }}
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            marginLeft: "16px",
            paddingLeft: "8px",
            borderLeft:
              "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {items.map((item) => {
            const itemActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: "38px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  color: itemActive
                    ? "#ffffff"
                    : "#94a3b8",
                  background: itemActive
                    ? "#2563eb"
                    : "transparent",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: itemActive
                    ? 700
                    : 500,
                }}
              >
                <span
                  style={{
                    marginRight: "8px",
                    fontSize: "8px",
                  }}
                >
                  ●
                </span>

                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  /*
   * 현재 URL에 맞는 메뉴를 자동으로 펼친다.
   * 사용자가 다른 메뉴를 클릭하면 기존 동작대로
   * 열림 / 닫힘이 가능하다.
   */
  useEffect(() => {
    if (
      pathname.startsWith("/orders")
    ) {
      setOpenMenu("주문관리");
      return;
    }

    if (
      pathname.startsWith("/order-collection")
    ) {
      setOpenMenu("주문수집");
      return;
    }

    if (
      pathname.startsWith("/sales-channels") ||
      pathname.startsWith("/sales-channel-groups")
    ) {
      setOpenMenu("판매채널관리");
      return;
    }

    if (
      pathname.startsWith("/customers") ||
      pathname.startsWith("/customer-products") ||
      pathname.startsWith("/delivery-targets") ||
      pathname.startsWith("/stores")
    ) {
      setOpenMenu("거래처관리");
      return;
    }

    setOpenMenu(null);
  }, [pathname]);

  const isOrderActive =
    pathname.startsWith("/orders");

  const isCollectionActive =
    pathname.startsWith("/order-collection");

  const isSalesChannelActive =
    pathname.startsWith("/sales-channels") ||
    pathname.startsWith("/sales-channel-groups");

  const isCustomerActive =
    pathname.startsWith("/customers") ||
    pathname.startsWith("/customer-products") ||
    pathname.startsWith("/delivery-targets") ||
    pathname.startsWith("/stores");

  return (
    <aside
      style={{
        width: "230px",
        minHeight: "100vh",
        background: "#0f172a",
        color: "#ffffff",
        padding: "20px 12px",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {/* LOGO */}
      <div
        style={{
          padding: "0 12px 20px",
          borderBottom:
            "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1.8px",
            color: "#94a3b8",
          }}
        >
          SONGLIM LOGISTICS
        </div>

        <div
          style={{
            marginTop: "7px",
            fontSize: "20px",
            fontWeight: 900,
          }}
        >
          송림물류 OMS
        </div>
      </div>

      {/* MENU */}
      <nav
        style={{
          marginTop: "16px",
        }}
      >
        {/* 대시보드 */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            height: "44px",
            padding: "0 12px",
            borderRadius: "8px",
            color:
              pathname === "/"
                ? "#ffffff"
                : "#cbd5e1",
            background:
              pathname === "/"
                ? "#2563eb"
                : "transparent",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 700,
            marginBottom: "4px",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              width: "20px",
              marginRight: "10px",
              textAlign: "center",
            }}
          >
            ▦
          </span>

          대시보드
        </Link>

        {/* 주문관리 */}
        <MenuSection
          title="주문관리"
          icon="▤"
          menuKey="주문관리"
          active={isOrderActive}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          items={[
            {
              name: "전체 주문",
              href: "/orders",
            },
            {
              name: "신규 주문",
              href: "/orders/new",
            },
            {
              name: "주문 확정",
              href: "/orders/confirmed",
            },
            {
              name: "주문 취소",
              href: "/orders/cancelled",
            },
            {
              name: "주문 조회",
              href: "/orders/search",
            },
          ]}
        />

        {/* 주문수집 */}
        <MenuSection
          title="주문수집"
          icon="↻"
          menuKey="주문수집"
          active={isCollectionActive}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          items={[
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
          ]}
        />

        {/* 판매채널관리 */}
        <MenuSection
          title="판매채널관리"
          icon="◎"
          menuKey="판매채널관리"
          active={isSalesChannelActive}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          items={[
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
          ]}
        />

        {/* 거래처관리 */}
        <MenuSection
          title="거래처관리"
          icon="▣"
          menuKey="거래처관리"
          active={isCustomerActive}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          items={[
            {
              name: "거래처",
              href: "/customers",
            },
            {
              name: "거래처별 상품",
              href: "/customer-products",
            },
            {
              name: "납품처 관리",
              href: "/delivery-targets",
            },
            {
              name: "점포 관리",
              href: "/stores",
            },
          ]}
        />
      </nav>
    </aside>
  );
}
