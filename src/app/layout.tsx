import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800", "900"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Lumieré",
  description: "A cinematic scroll-driven journey into Lumieré.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} dark bg-black`}>
      <body className="bg-black text-white antialiased selection:bg-white selection:text-black min-h-screen">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
