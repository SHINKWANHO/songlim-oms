"use client";

import Link from "next/link";

type SubMenu = {
  name: string;
  href: string;
};

type OMSPageHeaderProps = {
  title: string;
  description?: string;
  menus: SubMenu[];
};

export default function OMSPageHeader({
  title,
  description,
  menus,
}: OMSPageHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white">
      {/* 상단 제목 */}
      <div className="flex h-[72px] items-center justify-between px-7">
        <div>
          <div className="text-[9px] font-bold tracking-[0.18em] text-slate-400">
            SONGLIM LOGISTICS
          </div>

          <h1 className="mt-1 text-[20px] font-black text-slate-900">
            {title}
          </h1>

          {description && (
            <p className="mt-1 text-[11px] text-slate-400">
              {description}
            </p>
          )}
        </div>

        {/* 홈 버튼 */}
        <Link
          href="/"
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <span className="text-[15px]">⌂</span>
          홈
        </Link>
      </div>

      {/* 하위 메뉴 */}
      <div className="border-t border-slate-100 px-7">
        <nav className="flex h-[48px] items-center gap-1 overflow-x-auto">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="flex h-8 shrink-0 items-center rounded-md px-4 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
            >
              {menu.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}