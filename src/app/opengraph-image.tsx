import { ImageResponse } from "next/og";

// Default Open Graph image for any page that doesn't supply its own (product
// pages set the product photo via generateMetadata). Branded 1200×630 card.
export const alt = "MyShop — Your one-stop online store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -2 }}>
          MyShop
        </div>
        <div style={{ fontSize: 40, color: "#a5b4fc", marginTop: 16 }}>
          Your one-stop online store
        </div>
      </div>
    ),
    { ...size }
  );
}
