import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import OmsSidebar from "@/components/OmsSidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "송림물류 OMS",
  description: "Songlim Logistics OMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100">
        <OmsSidebar />

        <main className="ml-[230px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}