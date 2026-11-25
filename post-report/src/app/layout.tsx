import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Post Report",
  description: "Customs post operational report",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}