-- Jalankan di Supabase SQL Editor untuk project bbgprwjboiazbqlwxqmb

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

-- Seed users
INSERT INTO "User" (username, password, nama, role) VALUES
('admin', '$2a$10$YZGQbz4Fy0.Vej4P5suwmev8w7vfuT4ikoiAmg4Mujb58Rcm34DWK', 'Administrator', 'admin'),
('shelly', '$2a$10$/61jw4OIVapCsUORHQE8LeEk67sF6a6NtM2.2O.HG2zstPkX9CCuO', 'Shelly Marini, S.Pd.', 'guru'),
('sofayanto', '$2a$10$h0cg2R/CZPicN7tsDCTspeRZ/2jRO8mmGbfr8SJqwGg2Q.irthWkG', 'Sofayanto, S.Pd', 'guru'),
('alif', '$2a$10$LMLa05dfhiBMgy0vgm/8Dul2lEu6mHjn0n8DwJop9tMMQEKe072eS', 'Alif Amalia Riski R., S.Pd', 'guru'),
('fahris', '$2a$10$i4JdwbRKxmZJ1LZ/OcnTFuB/Lb9ZWvlI92M.w6i37sGYfyAtESOJK', 'Fahris Shiyam, S.Pd.I', 'guru'),
('sulaihah', '$2a$10$nAPu.x2wpAGTokmvBhKG..TTVpLOZ8hSd.8Nbt/qOcfjyHfW4FJUe', 'Sulaihah, S.Pd', 'guru');
