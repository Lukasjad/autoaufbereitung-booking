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
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <img
                src="/logo.png"
                alt="Elbe Smart Repair"
                className="h-10 w-auto"
              />
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Buchung
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} ELB Smart Repair</p>
            <nav className="flex items-center gap-4">
              <Link href="/datenschutz" className="hover:text-gray-700 transition-colors">
                Datenschutz
              </Link>
              <Link href="/impressum" className="hover:text-gray-700 transition-colors">
                Impressum
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
