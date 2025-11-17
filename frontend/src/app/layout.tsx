import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenLiQ - Real-time Quiz Game",
  description: "An open-source real-time quiz game platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
