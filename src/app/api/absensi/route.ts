import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateAbsensi } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tanggal = searchParams.get('tanggal');
    const siswaId = searchParams.get('siswaId');
    const angkatan = searchParams.get('angkatan');
    const kelasId = searchParams.get('kelasId');

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
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { siswaIds, tanggal, jamPelajaran: jamArray, kategori, keterangan } = body;

    if (!Array.isArray(siswaIds) || siswaIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'siswaIds harus berupa array dan tidak boleh kosong' },
        { status: 400 },
      );
    }

    if (!Array.isArray(jamArray) || jamArray.length === 0) {
      return NextResponse.json(
        { success: false, message: 'jamPelajaran harus berupa array dan tidak boleh kosong' },
        { status: 400 },
      );
    }

    const firstSiswaId = siswaIds[0];
    const firstJam = jamArray[0];
    const { valid, errors } = validateAbsensi({
      siswaId: firstSiswaId,
      tanggal,
      jamPelajaran: firstJam,
      kategori,
      keterangan,
    });

    if (!valid) {
      return NextResponse.json(
        { success: false, message: errors.join(', ') },
        { status: 400 },
      );
    }

    const absensiDate = new Date(tanggal);

    const siswaRecords = await prisma.siswa.findMany({
      where: { id: { in: siswaIds }, isActive: true },
      select: { id: true, nama: true, nis: true },
    });

    const validSiswaIds = siswaRecords.map((s) => s.id);
    const invalidIds = siswaIds.filter((id) => !validSiswaIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, message: `Siswa dengan ID ${invalidIds.join(', ')} tidak ditemukan` },
        { status: 404 },
      );
    }

    let count = 0;

    for (const sId of siswaIds) {
      for (const jam of jamArray) {
        const existing = await prisma.absensi.findFirst({
          where: {
            siswaId: sId,
            tanggal: {
              gte: new Date(absensiDate.getFullYear(), absensiDate.getMonth(), absensiDate.getDate()),
              lt: new Date(absensiDate.getFullYear(), absensiDate.getMonth(), absensiDate.getDate() + 1),
            },
            jamPelajaran: jam,
          },
        });

        if (existing) {
          await prisma.absensi.update({
            where: { id: existing.id },
            data: {
              kategori,
              keterangan: keterangan || null,
              userId: session.userId,
            },
          });
        } else {
          await prisma.absensi.create({
            data: {
              siswaId: sId,
              tanggal: absensiDate,
              jamPelajaran: jam,
              kategori,
              keterangan: keterangan || null,
              userId: session.userId,
            },
          });
        }

        count++;
      }
    }

    const siswaMap = new Map(siswaRecords.map((s) => [s.id, s]));
    const detailSiswa: string[] = [];
    for (const sId of siswaIds) {
      const s = siswaMap.get(sId);
      if (s) detailSiswa.push(`${s.nama} (${s.nis})`);
    }

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'ABSENSI_MASSAL',
        detail: `Mencatat absensi ${kategori} untuk ${detailSiswa.join(', ')} pada ${tanggal} jam ke-${jamArray.join(', ')}`,
        target: `siswa/${siswaIds.join(',')}`,
      },
    });

    return NextResponse.json({ success: true, count }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
