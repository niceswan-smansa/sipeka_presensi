import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { exportAbsensiToExcel } from '@/lib/excel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const tanggalMulai = searchParams.get('tanggalMulai');
    const tanggalSelesai = searchParams.get('tanggalSelesai');
    const angkatan = searchParams.get('angkatan');
    const kelasId = searchParams.get('kelasId');
    const kategori = searchParams.get('kategori');

    const where: any = {};

    if (tanggalMulai || tanggalSelesai) {
      where.tanggal = {};
      if (tanggalMulai) {
        const start = new Date(tanggalMulai);
        start.setHours(0, 0, 0, 0);
        where.tanggal.gte = start;
      }
      if (tanggalSelesai) {
        const end = new Date(tanggalSelesai);
        end.setHours(23, 59, 59, 999);
        where.tanggal.lte = end;
      }
    }

    if (kategori) {
      where.kategori = kategori;
    }

    const siswaWhere: any = {};
    if (kelasId) {
      siswaWhere.kelasId = parseInt(kelasId);
    }
    if (angkatan) {
      siswaWhere.kelas = { angkatan: parseInt(angkatan) };
    }
    if (Object.keys(siswaWhere).length > 0) {
      where.siswa = siswaWhere;
    }

    const absensi = await prisma.absensi.findMany({
      where,
      include: {
        siswa: {
          select: {
            nama: true,
            nis: true,
            nisn: true,
            jenisKelamin: true,
            kelas: { select: { nama: true, angkatan: true } },
          },
        },
        user: { select: { nama: true } },
      },
      orderBy: [{ tanggal: 'asc' }, { jamPelajaran: 'asc' }],
    });

    const rows = absensi.map((a) => ({
      Tanggal: new Date(a.tanggal).toISOString().split('T')[0],
      'Jam ke': a.jamPelajaran,
      Nama: a.siswa.nama,
      NIS: a.siswa.nis,
      NISN: a.siswa.nisn,
      'Jenis Kelamin': a.siswa.jenisKelamin,
      Kelas: a.siswa.kelas.nama,
      Angkatan: a.siswa.kelas.angkatan,
      Kategori: a.kategori,
      Keterangan: a.keterangan || '',
      'Dicatat Oleh': a.user.nama,
    }));

    const buffer = await exportAbsensiToExcel(
      rows,
      `absensi_${tanggalMulai || 'all'}_${tanggalSelesai || 'all'}`,
    );

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="absensi_${tanggalMulai || 'all'}_${tanggalSelesai || 'all'}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
