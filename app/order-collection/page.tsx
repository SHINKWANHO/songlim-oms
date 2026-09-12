import { Suspense } from "react";
import OrderCollectionManager from "./OrderCollectionManager";

export default function OrderCollectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            주문수집 화면을 불러오는 중입니다.
          </div>
        </div>
      }
    >
      <OrderCollectionManager />
    </Suspense>
  );
}