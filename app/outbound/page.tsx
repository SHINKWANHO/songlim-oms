import OutboundManager from "./OutboundManager";

export default function OutboundPage() {
  return (
    <main
      style={{
        padding: "30px",
        background: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <OutboundManager />
    </main>
  );
}