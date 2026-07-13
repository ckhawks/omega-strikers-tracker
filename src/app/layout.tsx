import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.scss";

export const metadata: Metadata = {
  title: "Omega Strikers Tracker",
  description: "We are so good at this game",
};

// const inter = Inter({ subsets: ["latin"] });

import "bootstrap/dist/css/bootstrap.min.css";
import NewMatchBanner from "@/components/NewMatchBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <NewMatchBanner />
      </body>
    </html>
  );
}
