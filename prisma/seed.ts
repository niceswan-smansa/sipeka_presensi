import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL! } },
});

const DATA_DIR = path.join(__dirname, "..", "data_siswa");

async function main() {
  console.log("🌱 Seeding database SIPEKA...\n");

  const hasil = await prisma.absensi.count();
  if (hasil > 0) {
    console.log("✅ Data sudah ada, skip seed.");
    return;
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("✅ Users sudah ada, skip.");
  } else {
    const bcrypt = await import("bcryptjs");
    await prisma.user.createMany({
      data: [
        { username: "admin", password: bcrypt.hashSync("admin123", 10), nama: "Administrator", role: "admin" },
        { username: "shelly", password: bcrypt.hashSync("shelly123", 10), nama: "Shelly Marini, S.Pd.", role: "guru" },
        { username: "sofayanto", password: bcrypt.hashSync("sofa123", 10), nama: "Sofayanto, S.Pd", role: "guru" },
        { username: "alif", password: bcrypt.hashSync("alif123", 10), nama: "Alif Amalia Riski R., S.Pd", role: "guru" },
        { username: "fahris", password: bcrypt.hashSync("fahris123", 10), nama: "Fahris Shiyam, S.Pd.I", role: "guru" },
        { username: "sulaihah", password: bcrypt.hashSync("sulaihah123", 10), nama: "Sulaihah, S.Pd", role: "guru" },
      ],
    });
    console.log("✅ 6 users created");
  }

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".xlsx"));

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const angkatan = file.includes("XII") ? 12 : file.includes("XI") ? 11 : 10;
    const workbook = XLSX.readFile(filePath);
    console.log(`\n📄 ${file} (Angkatan ${angkatan})`);

    for (const sheetName of workbook.SheetNames) {
      if (sheetName.startsWith("Sheet") || sheetName === "INDUK" || sheetName === "semua kls" || sheetName === "KELAS" || sheetName === "no-induk") continue;

      const rows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      const siswaBatch: { nis: string; nisn: string; nama: string; jenisKelamin: string; kelasId: number }[] = [];

      let inData = false;
      for (const row of rows) {
        if (!row || !Array.isArray(row)) continue;
        const a = String(row[0] || "").trim();
        const b = String(row[1] || "").trim();
        const c = String(row[2] || "").trim();
        const d = String(row[3] || "").trim();
        const e = String(row[4] || "").trim();
        const num = parseInt(a);
        if (!isNaN(num) && num >= 1 && b.length >= 3 && c.length >= 5 && d.length > 3 && (e === "L" || e === "P")) {
          inData = true;
          siswaBatch.push({ nis: b, nisn: c, nama: d, jenisKelamin: e });
        } else if (inData && siswaBatch.length > 0 && isNaN(num)) {
          break;
        }
      }

      if (siswaBatch.length === 0) continue;

      let kelas = await prisma.kelas.findUnique({ where: { nama: sheetName } });
      if (!kelas) {
        kelas = await prisma.kelas.create({ data: { nama: sheetName, angkatan } });
      }

      await prisma.siswa.createMany({
        data: siswaBatch.map((s) => ({ ...s, kelasId: kelas!.id })),
        skipDuplicates: true,
      });

      console.log(`   📋 ${sheetName}: ${siswaBatch.length} siswa`);
    }
  }

  const totalSiswa = await prisma.siswa.count();
  const totalKelas = await prisma.kelas.count();
  console.log(`\n🎉 Seed complete! Kelas: ${totalKelas}, Siswa: ${totalSiswa}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
