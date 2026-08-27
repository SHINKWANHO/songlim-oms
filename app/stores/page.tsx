import StoreManager from "./StoreManager";

export default function StoresPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px",
        fontFamily:
          "Arial, 'Malgun Gothic', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              color: "#64748b",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            SONGLIM LOGISTICS OMS
          </div>

          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "36px",
              color: "#111827",
            }}
          >
            배송처 관리
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#64748b",
              fontSize: "16px",
            }}
          >
            화주별 판매채널 배송처 관리
          </p>
        </div>

        <StoreManager />
      </div>
    </main>
  );
}