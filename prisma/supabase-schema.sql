-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/svxkduywlkelcenvdlzk/sql/new

CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nama TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'guru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Kelas" (
    id SERIAL PRIMARY KEY,
    nama TEXT NOT NULL UNIQUE,
    angkatan INTEGER NOT NULL,
    "waliKelas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Siswa" (
    id SERIAL PRIMARY KEY,
    nis TEXT NOT NULL,
    nisn TEXT NOT NULL,
    nama TEXT NOT NULL,
    "jenisKelamin" TEXT NOT NULL,
    "kelasId" INTEGER NOT NULL REFERENCES "Kelas"(id),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Siswa_nis_kelasId_key" UNIQUE (nis, "kelasId")
);

CREATE TABLE "Absensi" (
    id SERIAL PRIMARY KEY,
    "siswaId" INTEGER NOT NULL REFERENCES "Siswa"(id),
    tanggal TIMESTAMP(3) NOT NULL,
    "jamPelajaran" INTEGER NOT NULL,
    kategori TEXT NOT NULL,
    keterangan TEXT,
    "userId" INTEGER NOT NULL REFERENCES "User"(id),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Absensi_siswaId_idx" ON "Absensi"("siswaId");
CREATE INDEX "Absensi_tanggal_idx" ON "Absensi"(tanggal);
CREATE INDEX "Absensi_userId_idx" ON "Absensi"("userId");

CREATE TABLE "Riwayat" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"(id),
    aksi TEXT NOT NULL,
    detail TEXT NOT NULL,
    target TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Riwayat_userId_idx" ON "Riwayat"("userId");
CREATE INDEX "Riwayat_createdAt_idx" ON "Riwayat"("createdAt");
