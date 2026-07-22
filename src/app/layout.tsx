import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIPEKA - Sistem Presensi SMANSA Pamekasan",
  description: "Sistem Presensi Siswa SMAN 1 Pamekasan",
  manifest: "/manifest.json",
  icons: { icon: "/logo1.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
