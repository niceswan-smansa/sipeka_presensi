import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DATA_DIR = path.join(__dirname, "..", "data_siswa");

const SKIP_SHEETS = new Set([
  "INDUK", "semua kls", "KELAS", "no-induk",
  "Data Siswa", "IPS", "Wali Kelas",
  "Sheet1", "Sheet2", "Sheet3", "Sheet2 (2)",
]);

interface SiswaRow {
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
}

function parseFormatA(rows: any[][]): SiswaRow[] {
  const result: SiswaRow[] = [];
  let started = false;
  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue;
    const noVal = String(row[0] || "").trim();
    const no = parseInt(noVal);
    if (!isNaN(no) && no >= 1) {
      const nis = String(row[1] || "").trim();
      const nisn = String(row[2] || "").trim();
      const nama = String(row[3] || "").trim();
      const jk = String(row[4] || "").trim().toUpperCase();
      if (nis.length >= 3 && nisn.length >= 5 && nama.length > 3 && (jk === "L" || jk === "P")) {
        started = true;
        result.push({ nis, nisn, nama, jenisKelamin: jk });
      }
    } else if (started) {
      break;
    }
  }
  return result;
}

function parseFormatB(rows: any[][]): SiswaRow[] {
  const result: SiswaRow[] = [];
  let started = false;
  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue;
    const noVal = String(row[0] || "").trim();
    const no = parseInt(noVal);
    if (!isNaN(no) && no >= 1) {
      const combined = String(row[1] || "").trim();
      const nama = String(row[2] || "").trim();
      const jk = String(row[3] || "").trim().toUpperCase();

      let nis = "";
      let nisn = "";
      const parts = combined.split("/");
      if (parts.length === 2) {
        const a = parts[0].trim();
        const b = parts[1].trim();
        if (a.length >= 10 && b.length >= 4) {
          nisn = a;
          nis = b;
        } else if (b.length >= 10 && a.length >= 4) {
          nisn = b;
          nis = a;
        }
      }

      if (nis && nisn && nama.length > 3 && (jk === "L" || jk === "P")) {
        started = true;
        result.push({ nis, nisn, nama, jenisKelamin: jk });
      }
    } else if (started) {
      break;
    }
  }
  return result;
}

function detectFormat(rows: any[][]): "A" | "B" | null {
  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue;
    const noVal = String(row[0] || "").trim();
    const no = parseInt(noVal);
    if (!isNaN(no) && no >= 1) {
      const col1 = String(row[1] || "").trim();
      const col2 = String(row[2] || "").trim();
      const col3 = String(row[3] || "").trim();
      const col4 = String(row[4] || "").trim();

      if (col1.includes("/")) return "B";
      if (col1.length >= 3 && col2.length >= 5 && col3.length > 3 && (col4 === "L" || col4 === "P")) return "A";
      if (col1.length >= 3 && col2.length >= 5 && col3.length > 3) return "A";
    }
  }
  return null;
}

function getAngkatan(filename: string): number {
  const n = filename.toUpperCase();
  if (n.includes("XII")) return 12;
  if (n.includes("XI")) return 11;
  return 10;
}

async function main() {
  console.log("🌱 Seeding database SIPEKA...\n");

  const existingAbsen = await prisma.absensi.count();
  if (existingAbsen > 0) {
    console.log("✅ Data absensi sudah ada. Skip seed.");
    return;
  }

  console.log("🧹 Membersihkan data lama...");
  await prisma.absensi.deleteMany();
  await prisma.riwayat.deleteMany();
  await prisma.siswa.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Bersih");

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
  console.log("✅ 6 user dibuat");

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".xlsx")).sort();

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const angkatan = getAngkatan(file);
    const workbook = XLSX.readFile(filePath);

    console.log(`\n📄 ${file} → Angkatan ${angkatan}`);

    for (const sheetName of workbook.SheetNames) {
      const cleanName = sheetName.trim();

      if (SKIP_SHEETS.has(cleanName) || cleanName.startsWith("Sheet")) {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!rows || rows.length < 5) continue;

      const format = detectFormat(rows);
      if (!format) {
        console.log(`   ⏭️  ${cleanName}: tidak terdeteksi format`);
        continue;
      }

      const siswaRows = format === "A" ? parseFormatA(rows) : parseFormatB(rows);
      if (siswaRows.length === 0) {
        console.log(`   ⏭️  ${cleanName}: 0 siswa terdeteksi`);
        continue;
      }

      let kelas = await prisma.kelas.findUnique({ where: { nama: cleanName } });
      if (!kelas) {
        let displayNama = cleanName;
        if (angkatan === 10 && cleanName.startsWith("X-")) {
          const num = parseInt(cleanName.replace("X-", ""));
          if (num >= 1 && num <= 10) {
            const letter = String.fromCharCode(64 + num);
            displayNama = `10-${letter}`;
          }
        }
        kelas = await prisma.kelas.create({ data: { nama: displayNama, angkatan } });
      }

      await prisma.siswa.createMany({
        data: siswaRows.map((s) => ({ ...s, kelasId: kelas!.id })),
        skipDuplicates: true,
      });

      console.log(`   ✅ ${cleanName}: ${siswaRows.length} siswa (format ${format})`);
    }
  }

  const totalKelas = await prisma.kelas.count();
  const totalSiswa = await prisma.siswa.count();
  console.log(`\n🎉 Selesai! ${totalKelas} kelas · ${totalSiswa} siswa`);
}

main()
  .catch((e) => {
    console.error("❌ Gagal:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
