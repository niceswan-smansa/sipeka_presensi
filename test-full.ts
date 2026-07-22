import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, test: string) {
  if (condition) { passed++; console.log(`  ✅ ${test}`); }
  else { failed++; console.log(`  ❌ ${test}`); }
}

async function main() {
  console.log("🧪 SIPEKA Full Integration Test\n");
  console.log("=" .repeat(50));

  // 1. Users exist
  console.log("\n📌 1. USERS");
  const users = await prisma.user.findMany();
  assert(users.length === 6, "6 users exist");
  const admin = users.find(u => u.username === "admin");
  assert(!!admin, "admin user exists");
  assert(admin!.role === "admin", "admin has admin role");

  // 2. Kelas exist with correct angkatan grouping
  console.log("\n📌 2. KELAS");
  const allKelas = await prisma.kelas.findMany({ orderBy: [{angkatan: 'asc'}, {nama: 'asc'}] });
  assert(allKelas.length === 30, `30 classes (got ${allKelas.length})`);

  const kelas10 = allKelas.filter(k => k.angkatan === 10);
  assert(kelas10.length === 10, "10 kelas for angkatan 10");
  assert(kelas10.every(k => k.nama.startsWith("X-")), "Kelas 10 named X-1 to X-10");

  const kelas11 = allKelas.filter(k => k.angkatan === 11);
  assert(kelas11.length === 10, "10 kelas for angkatan 11");
  assert(kelas11.some(k => k.nama === "XI-A1"), "XI-A1 exists");
  assert(kelas11.some(k => k.nama === "XI-F"), "XI-F exists");

  const kelas12 = allKelas.filter(k => k.angkatan === 12);
  assert(kelas12.length === 10, "10 kelas for angkatan 12");
  assert(kelas12.some(k => k.nama === "XII-A-1"), "XII-A-1 exists");

  // No aggregate sheets leaked
  const badNames = ["INDUK", "semua kls", "KELAS", "no-induk", "Sheet1"];
  for (const k of allKelas) {
    assert(!badNames.includes(k.nama), `No bad class: ${k.nama}`);
  }

  // 3. Siswa count per class
  console.log("\n📌 3. SISWA");
  const totalSiswa = await prisma.siswa.count({ where: { isActive: true } });
  assert(totalSiswa === 1064, `1064 siswa (got ${totalSiswa})`);

  for (const k of allKelas) {
    const count = await prisma.siswa.count({ where: { kelasId: k.id, isActive: true } });
    assert(count >= 30 && count <= 40, `${k.nama}: ${count} siswa (30-40)`);
  }

  // 4. Search siswa by partial name (case insensitive)
  console.log("\n📌 4. SEARCH");
  const searchResults = await prisma.siswa.findMany({
    where: { nama: { contains: "adil", mode: "insensitive" }, isActive: true },
    include: { kelas: true }
  });
  assert(searchResults.length > 0, `"adil" search finds students (${searchResults.length})`);
  assert(searchResults.some(s => s.nama.toUpperCase().includes("ADIL")), "Case insensitive works");

  // 5. Input absensi
  console.log("\n📌 5. ABSENSI INPUT");
  const siswa12A1 = await prisma.siswa.findFirst({
    where: { kelas: { nama: "XII-A-1" }, isActive: true }
  });
  assert(!!siswa12A1, "Found student in XII-A-1");

  const absensiEntries = [
    { siswaId: siswa12A1!.id, tanggal: new Date("2026-07-22"), jamPelajaran: 1, kategori: "sakit", keterangan: "demam", userId: admin!.id },
    { siswaId: siswa12A1!.id, tanggal: new Date("2026-07-22"), jamPelajaran: 2, kategori: "sakit", keterangan: "demam", userId: admin!.id },
    { siswaId: siswa12A1!.id, tanggal: new Date("2026-07-22"), jamPelajaran: 3, kategori: "sakit", keterangan: "demam", userId: admin!.id },
  ];

  for (const entry of absensiEntries) {
    await prisma.absensi.create({ data: entry });
  }
  const absensiCount = await prisma.absensi.count();
  assert(absensiCount === 3, `3 absensi records created (got ${absensiCount})`);

  // 6. Riwayat audit
  console.log("\n📌 6. RIWAYAT AUDIT");
  await prisma.riwayat.create({
    data: {
      userId: admin!.id,
      aksi: "ABSENSI_MASSAL",
      detail: `3 catatan absensi untuk: ${siswa12A1!.nama}`,
      target: `siswa/${siswa12A1!.id}`,
    }
  });
  const riwayatCount = await prisma.riwayat.count();
  assert(riwayatCount === 1, `1 riwayat record created (got ${riwayatCount})`);

  // 7. Dashboard query
  console.log("\n📌 7. DASHBOARD");
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayCount, monthCount, totalAktif, absenPerKelas, recentActivities] = await Promise.all([
    prisma.absensi.count({ where: { tanggal: { gte: todayStart } } }),
    prisma.absensi.count({ where: { tanggal: { gte: monthStart } } }),
    prisma.siswa.count({ where: { isActive: true } }),
    prisma.absensi.groupBy({ by: ['siswaId'], where: { tanggal: { gte: todayStart } }, _count: { id: true } }),
    prisma.riwayat.findMany({ include: { user: { select: { id: true, nama: true } } }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  assert(todayCount === 3, `todayCount = 3 (got ${todayCount})`);
  assert(monthCount >= 3, `monthCount >= 3 (got ${monthCount})`);
  assert(totalAktif === 1064, `totalSiswa = 1064 (got ${totalAktif})`);
  assert(absenPerKelas.length > 0, `absenPerKelas has data (${absenPerKelas.length} siswa)`);
  assert(recentActivities.length > 0, `recentActivities has data (${recentActivities.length})`);

  // Verify user relation works
  const latestActivity = recentActivities[0];
  assert(!!latestActivity.user, "riwayat.user relation works");
  assert(typeof latestActivity.user.nama === 'string', "user.nama is string");
  assert(typeof latestActivity.createdAt !== 'undefined', "createdAt exists");

  // 8. Export query
  console.log("\n📌 8. EXPORT ABSENSI");
  const exportData = await prisma.absensi.findMany({
    where: { tanggal: { gte: todayStart } },
    include: {
      siswa: { select: { id: true, nama: true, nis: true, kelas: { select: { nama: true } } } },
      user: { select: { nama: true } }
    },
    orderBy: { tanggal: 'desc' }
  });
  assert(exportData.length === 3, `Export has 3 rows (got ${exportData.length})`);
  assert(exportData[0].siswa.nama.length > 0, "siswa relation in export works");
  assert(exportData[0].user.nama.length > 0, "user relation in export works");

  // 9. Soft delete siswa
  console.log("\n📌 9. SOFT DELETE SISWA");
  const testSiswa = await prisma.siswa.findFirst({ where: { isActive: true }, orderBy: { id: 'desc' } });
  assert(!!testSiswa, "Found student to soft-delete");
  await prisma.siswa.update({ where: { id: testSiswa!.id }, data: { isActive: false } });
  const stillExists = await prisma.siswa.findUnique({ where: { id: testSiswa!.id } });
  assert(stillExists?.isActive === false, "Student still exists but inactive");
  const activeCount = await prisma.siswa.count({ where: { isActive: true } });
  assert(activeCount === 1063, `Active count decreased (got ${activeCount})`);

  // 10. Cleanup test data
  console.log("\n📌 10. CLEANUP");
  await prisma.absensi.deleteMany({ where: { siswaId: siswa12A1!.id } });
  await prisma.riwayat.deleteMany();
  await prisma.siswa.update({ where: { id: testSiswa!.id }, data: { isActive: true } });
  const finalCount = await prisma.siswa.count({ where: { isActive: true } });
  assert(finalCount === 1064, `Restored to 1064 (got ${finalCount})`);

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error("❌ Test crashed:", e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
