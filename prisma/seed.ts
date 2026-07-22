import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, "..", "data_siswa");

function parseStudentSheet(
  filePath: string,
  sheetName: string,
  angkatan: number
): { kelasNama: string; siswa: { nis: string; nisn: string; nama: string; jk: string }[] } | null {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return null;

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  window: for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    const siswa: { nis: string; nisn: string; nama: string; jk: string }[] = [];

    for (let j = i; j < rows.length; j++) {
      const r = rows[j];
      if (!r) continue;

      const colA = String(r[0] || "").trim();
      const colB = String(r[1] || "").trim();
      const colC = String(r[2] || "").trim();
      const colD = String(r[3] || "").trim();
      const colE = String(r[4] || "").trim();

      const studentNo = parseInt(colA);
      if (isNaN(studentNo) || studentNo < 1) {
        if (siswa.length > 0) break;
        continue;
      }

      if (
        colB.length >= 3 &&
        colC.length >= 5 &&
        colD.length > 3 &&
        (colE === "L" || colE === "P")
      ) {
        siswa.push({
          nis: colB,
          nisn: colC,
          nama: colD,
          jk: colE,
        });
      }
    }

    if (siswa.length >= 5) {
      return {
        kelasNama: sheetName,
        siswa,
      };
    }
    return null;
  }

  return null;
}

function getAngkatanFromFilename(filename: string): number {
  const name = filename.toUpperCase();
  if (name.includes("XII") || name.includes("XII")) return 12;
  if (name.includes("XI")) return 11;
  if (name.includes(" X-") || name.includes("X-")) return 10;
  return 10;
}

async function main() {
  console.log("🌱 Seeding database SIPEKA...\n");

  await prisma.absensi.deleteMany();
  await prisma.riwayat.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = await hashPassword("admin123");
  await prisma.user.create({
    data: {
      username: "admin",
      password: adminPass,
      nama: "Administrator",
      role: "admin",
    },
  });
  console.log("✅ User admin created (admin / admin123)");

  const guruList = [
    { username: "shelly", password: "shelly123", nama: "Shelly Marini, S.Pd." },
    { username: "sofayanto", password: "sofa123", nama: "Sofayanto, S.Pd" },
    { username: "alif", password: "alif123", nama: "Alif Amalia Riski R., S.Pd" },
    { username: "fahris", password: "fahris123", nama: "Fahris Shiyam, S.Pd.I" },
    { username: "sulaihah", password: "sulaihah123", nama: "Sulaihah, S.Pd" },
  ];

  for (const g of guruList) {
    const pass = await hashPassword(g.password);
    await prisma.user.create({
      data: { username: g.username, password: pass, nama: g.nama, role: "guru" },
    });
  }
  console.log(`✅ ${guruList.length} guru BK created`);

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".xlsx"));
  let totalSiswa = 0;
  let totalKelas = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const angkatan = getAngkatanFromFilename(file);
    const workbook = XLSX.readFile(filePath);

    console.log(`\n📄 ${file} (Angkatan ${angkatan})`);

    for (const sheetName of workbook.SheetNames) {
      if (sheetName.startsWith("Sheet")) continue;

      const result = parseStudentSheet(filePath, sheetName, angkatan);
      if (!result || result.siswa.length === 0) continue;

      let kelas = await prisma.kelas.findUnique({
        where: { nama: result.kelasNama },
      });

      if (!kelas) {
        kelas = await prisma.kelas.create({
          data: {
            nama: result.kelasNama,
            angkatan,
          },
        });
        totalKelas++;
      }

      let imported = 0;
      for (const s of result.siswa) {
        try {
          await prisma.siswa.upsert({
            where: {
              nis_kelasId: {
                nis: s.nis,
                kelasId: kelas.id,
              },
            },
            update: {
              nisn: s.nisn,
              nama: s.nama,
              jenisKelamin: s.jk,
            },
            create: {
              nis: s.nis,
              nisn: s.nisn,
              nama: s.nama,
              jenisKelamin: s.jk,
              kelasId: kelas.id,
            },
          });
          imported++;
        } catch {
          // skip duplicates
        }
      }
      totalSiswa += imported;
      console.log(`   📋 ${result.kelasNama}: ${imported} siswa`);
    }
  }

  console.log(`\n🎉 Seed complete!`);
  console.log(`   Kelas: ${totalKelas}`);
  console.log(`   Siswa: ${totalSiswa}`);
  console.log(`   User: admin + ${guruList.length} guru BK`);
  console.log(`\n   Login: admin / admin123`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
