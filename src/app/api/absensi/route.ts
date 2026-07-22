import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');
    const siswaId = searchParams.get('siswaId');
    const siswaIdsRaw = searchParams.get('siswaIds');
    const angkatan = searchParams.get('angkatan');
    const kelasId = searchParams.get('kelasId');

    if (siswaIdsRaw) {
      const ids = siswaIdsRaw.split(',').map(Number).filter((n) => !isNaN(n));
      const dateFilter = tanggal ? new Date(tanggal) : new Date();
      const startOfMonth = new Date(dateFilter.getFullYear(), dateFilter.getMonth(), 1);
      const endOfMonth = new Date(dateFilter.getFullYear(), dateFilter.getMonth() + 1, 0, 23, 59, 59, 999);

      const counts: Record<number, number> = {};
      if (ids.length > 0) {
        const results = await prisma.absensi.groupBy({
          by: ['siswaId'],
          where: {
            siswaId: { in: ids },
            tanggal: { gte: startOfMonth, lte: endOfMonth },
          },
          _count: { id: true },
        });
        for (const r of results) {
          counts[r.siswaId] = r._count.id;
        }
      }
      for (const id of ids) {
        if (!(id in counts)) counts[id] = 0;
      }
      return NextResponse.json({ success: true, data: { counts } });
    }

    const where: any = {};

    if (tanggal) {
      const startOfDay = new Date(tanggal);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(tanggal);
      endOfDay.setHours(23, 59, 59, 999);
      where.tanggal = { gte: startOfDay, lte: endOfDay };
    }

    if (siswaId) {
      where.siswaId = parseInt(siswaId);
    }

    if (kelasId) {
      where.siswa = { kelasId: parseInt(kelasId) };
    }

    if (angkatan) {
      where.siswa = {
        ...(where.siswa || {}),
        kelas: { angkatan: parseInt(angkatan) },
      };
    }

    const absensi = await prisma.absensi.findMany({
      where,
      include: {
        siswa: {
          select: { id: true, nama: true, nis: true, kelas: { select: { id: true, nama: true, angkatan: true } } },
        },
        user: { select: { id: true, nama: true } },
      },
      orderBy: [{ tanggal: 'desc' }, { jamPelajaran: 'asc' }],
    });

    return NextResponse.json({ success: true, data: absensi });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Data harus berupa array dan tidak boleh kosong' },
        { status: 400 },
      );
    }

    const entries = body as {
      siswaId: number;
      tanggal: string;
      jamPelajaran: number;
      kategori: string;
      keterangan?: string;
    }[];

    const siswaIds = Array.from(new Set(entries.map((e) => e.siswaId)));
    const siswaRecords = await prisma.siswa.findMany({
      where: { id: { in: siswaIds }, isActive: true },
      select: { id: true, nama: true, nis: true },
    });

    const validIds = new Set(siswaRecords.map((s) => s.id));
    for (const e of entries) {
      if (!validIds.has(e.siswaId)) {
        return NextResponse.json(
          { success: false, message: `Siswa ID ${e.siswaId} tidak ditemukan` },
          { status: 404 },
        );
      }
      if (!['izin', 'sakit', 'bolos'].includes(e.kategori)) {
        return NextResponse.json(
          { success: false, message: `Kategori tidak valid: ${e.kategori}` },
          { status: 400 },
        );
      }
    }

    let count = 0;
    for (const entry of entries) {
      const absensiDate = new Date(entry.tanggal);
      const dayStart = new Date(absensiDate.getFullYear(), absensiDate.getMonth(), absensiDate.getDate());
      const dayEnd = new Date(absensiDate.getFullYear(), absensiDate.getMonth(), absensiDate.getDate() + 1);

      const existing = await prisma.absensi.findFirst({
        where: {
          siswaId: entry.siswaId,
          tanggal: { gte: dayStart, lt: dayEnd },
          jamPelajaran: entry.jamPelajaran,
        },
      });

      if (existing) {
        await prisma.absensi.update({
          where: { id: existing.id },
          data: {
            kategori: entry.kategori,
            keterangan: entry.keterangan || null,
            userId: session.userId,
          },
        });
      } else {
        await prisma.absensi.create({
          data: {
            siswaId: entry.siswaId,
            tanggal: absensiDate,
            jamPelajaran: entry.jamPelajaran,
            kategori: entry.kategori,
            keterangan: entry.keterangan || null,
            userId: session.userId,
          },
        });
      }
      count++;
    }

    const namaSiswa = siswaRecords.map((s) => `${s.nama}`).join(', ');
    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'ABSENSI_MASSAL',
        detail: `${count} catatan absensi untuk: ${namaSiswa}`,
        target: `siswa/${siswaIds.join(',')}`,
      },
    });

    return NextResponse.json({ success: true, data: { count } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
