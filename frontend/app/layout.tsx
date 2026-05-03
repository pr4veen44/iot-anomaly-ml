import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IoT Anomaly Detection | AI Dashboard",
  description: "Real-time IoT sensor monitoring with ML-powered anomaly detection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}