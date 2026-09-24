import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#090d16",
        }}
      >
        {/* Left: brand + text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 64px",
            flex: 1,
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 15,
              color: "#ea580c",
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            Travel CRM Software
          </div>
          <div
            style={{
              fontSize: 50,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            For Tour Operators &amp; Travel Agencies
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#94a3b8",
              lineHeight: 1.5,
              maxWidth: 440,
            }}
          >
            WhatsApp leads · Day-wise itineraries · GST quotes · Payment tracking
          </div>
          <div style={{ fontSize: 17, color: "#ea580c", fontWeight: 600 }}>
            ezzysync.com
          </div>
        </div>

        {/* Right: Indian CRM pipeline mini cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            justifyContent: "center",
            padding: "60px 48px 60px 0",
            width: 340,
          }}
        >
          {[
            {
              name: "Rahul Sharma",
              dest: "Goa 4N/5D",
              amount: "₹48,500",
              status: "Quote sent",
            },
            {
              name: "Priya Patel",
              dest: "Kashmir 6D",
              amount: "₹85,000",
              status: "Follow-up due",
            },
            {
              name: "Amit Verma",
              dest: "Dubai 5D",
              amount: "₹1,20,000",
              status: "Advance paid",
            },
            {
              name: "Pooja Malhotra",
              dest: "Kerala 5D",
              amount: "₹54,000",
              status: "Voucher issued",
            },
          ].map((item) => (
            <div
              key={item.name}
              style={{
                background: "#1e293b",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                border: "1px solid #334155",
              }}
            >
              <div
                style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 14 }}
              >
                {item.name}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                {`${item.dest} · ${item.amount}`}
              </div>
              <div
                style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}
              >
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
