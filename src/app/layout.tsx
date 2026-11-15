import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { Snow } from "@/components/snow";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const body = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Secret Santa",
  description: "Our Secret Santa: draw names, share wishlists and ask anonymous questions.",
};

export const viewport: Viewport = {
  themeColor: "#741e27",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Snow />
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-16 sm:pt-6">{children}</main>
      </body>
    </html>
  );
}
