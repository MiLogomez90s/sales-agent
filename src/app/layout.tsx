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
  title: "Sales Agent",
  description: "Conversational sales agent with tool integrations",
};

const navItems = [
  { href: "/", label: "Chat" },
  { href: "/memory", label: "Memory" },
  { href: "/settings", label: "Settings" },
  { href: "/tools", label: "Tools" },
  { href: "/logs", label: "Logs" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="flex h-screen">
          <aside className="w-56 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-lg font-bold text-gray-900">Sales Agent</h1>
              <p className="text-xs text-gray-500 mt-0.5">Conversational AI</p>
            </div>
            <nav className="flex-1 p-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">v0.1.0</p>
            </div>
          </aside>
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
