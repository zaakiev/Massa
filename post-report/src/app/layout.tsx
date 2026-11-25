import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Отчёт поста МТП Махачкала",
  description: "Оперативный отчёт таможенного поста",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Отчёт поста МТП Махачкала",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
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