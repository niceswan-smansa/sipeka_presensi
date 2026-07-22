"use client";

import Link from "next/link";
import Image from "next/image";

const features = [
  {
    icon: (
      <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    title: "Input Cepat",
    description:
      "Catat kehadiran puluhan siswa sekaligus dalam satu formulir yang ringkas. Efisiensi waktu tanpa mengorbankan akurasi data.",
  },
  {
    icon: (
      <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Kalender Presensi",
    description:
      "Jelajahi riwayat kehadiran tiap siswa melalui tampilan kalender interaktif. Pantau pola dan tren dalam sekali pandang.",
  },
  {
    icon: (
      <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Statistik Detail",
    description:
      "Visualisasikan data presensi dalam grafik dan diagram yang informatif. Setiap angka bercerita, setiap tren memberi wawasan.",
  },
  {
    icon: (
      <svg className="h-10 w-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    title: "Export Excel",
    description:
      "Unduh laporan lengkap dalam format spreadsheet kapan pun dibutuhkan. Siap cetak, siap arsip, siap untuk rapat bersama.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-lg lg:px-12 shadow-sm">
        <div className="flex items-center gap-3">
          <Image
            src="/logo1.png"
            alt="SIPEKA Logo"
            width={60}
            height={60}
            className="h-12 w-auto"
          />
          <span className="text-xl font-extrabold text-primary-dark">SIPEKA</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-64px)] flex-col">
        <div className="absolute inset-0 z-0">
          <Image
            src="/BG_landingpage.png"
            alt="Background"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 text-center">
          <h1
            className="text-5xl font-extrabold text-white sm:text-6xl lg:text-7xl"
            style={{ textShadow: "0 0 40px rgba(255,255,255,0.25)" }}
          >
            Sistem Presensi Siswa
          </h1>

          <div className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <p className="mt-6 text-lg font-light uppercase tracking-[0.2em] text-white/80 sm:text-xl">
            SMAN 1 Pamekasan
          </p>

          <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white/70 sm:text-lg">
            Jejak kehadiran yang tertata rapi, menjadi fondasi disiplin dan
            cerminan tanggung jawab setiap insan pelajar.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-dark px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/40"
            >
              Mulai
            </Link>
            <button
              onClick={() => {
                document.getElementById("fitur")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/60 px-8 py-3.5 text-base font-semibold text-white transition-all hover:scale-105 hover:border-white hover:bg-white/10 hover:backdrop-blur-sm"
            >
              Pelajari Lebih Lanjut
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="fitur"
        className="scroll-mt-20 bg-gradient-to-b from-white to-gray-50 px-6 py-24 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Fitur SIPEKA
            </h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-primary-light" />
            <p className="mx-auto mt-4 max-w-lg text-base font-medium text-gray-500">
              Dirancang dengan kesederhanaan dan ketepatan, agar setiap proses
              presensi terasa ringan dan bermakna.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl border border-gray-100/80 bg-white p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative bg-gray-900 px-6 py-10 lg:px-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm font-medium text-gray-400">
            &copy; 2026 SIPEKA. Seluruh hak cipta dilindungi.
          </p>
          <p className="text-sm font-medium uppercase tracking-wider text-gray-400">
            SMAN 1 Pamekasan
          </p>
        </div>
      </footer>
    </div>
  );
}
