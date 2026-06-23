import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Autoaufbereitung - Terminbuchung",
  description: "Vereinbaren Sie einen Termin für Ihre Fahrzeugaufbereitung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-sans">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900 hover:text-blue-600 transition-colors">
              Autoaufbereitung
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Buchung
              </Link>
              <Link href="/admin" className="text-gray-600 hover:text-gray-900 transition-colors">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
