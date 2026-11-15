import { ImageResponse } from "next/og";

export const alt =
  "Minder : la maison est vendue, on se partage les objets en famille";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const squares = [];
  for (let x = 0; x < 1200; x += 70)
    squares.push(
      <div
        key={`c${x}`}
        style={{
          position: "absolute",
          left: x,
          top: 0,
          width: 35,
          height: 630,
          background: "rgba(35,67,166,0.45)",
        }}
      />,
    );
  for (let y = 0; y < 630; y += 70)
    squares.push(
      <div
        key={`r${y}`}
        style={{
          position: "absolute",
          left: 0,
          top: y,
          width: 1200,
          height: 35,
          background: "rgba(35,67,166,0.45)",
        }}
      />,
    );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#fdfcf8",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {squares}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "#fdfcf8",
          borderRadius: 40,
          padding: "56px 64px",
          width: 860,
          boxShadow: "0 30px 60px -20px rgba(18,26,58,0.5)",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, color: "#2343a6" }}>
          Minder
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#121a3a",
            lineHeight: 1.05,
            marginTop: 18,
          }}
        >
          La maison est vendue. Les souvenirs, on se les partage.
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 36 }}>
          <div
            style={{
              display: "flex",
              padding: "16px 30px",
              borderRadius: 999,
              border: "4px solid #121a3a",
              fontSize: 28,
              fontWeight: 800,
              color: "#121a3a",
            }}
          >
            Non merci
          </div>
          <div
            style={{
              display: "flex",
              padding: "16px 30px",
              borderRadius: 999,
              background: "#17704a",
              fontSize: 28,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            Je le veux
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
