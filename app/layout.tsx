import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aspik — Rizal Hidayat Putra",
  description: "From raw code to pure vision. Data, AI, analytics and digital work by Rizal Hidayat Putra.",
  metadataBase: new URL("https://aspik.dev"),
  openGraph: {
    title: "Aspik — Rizal Hidayat Putra",
    description: "From raw code to pure vision.",
    url: "https://aspik.dev",
    siteName: "Aspik",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
