import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayCount, monthCount, totalSiswa, absenPerKelasRaw, recentActivities] =
      await Promise.all([
        prisma.absensi.count({
          where: {
            tanggal: { gte: todayStart, lt: todayEnd },
          },
        }),

        prisma.absensi.count({
          where: {
            tanggal: { gte: monthStart },
          },
        }),

        prisma.siswa.count({
          where: { isActive: true },
        }),

        prisma.absensi.groupBy({
          by: ['siswaId'],
          where: {
            tanggal: { gte: todayStart, lt: todayEnd },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),

        prisma.riwayat.findMany({
          include: {
            user: { select: { id: true, nama: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const siswaIds = absenPerKelasRaw.map((a) => a.siswaId);

    const siswaData =
      siswaIds.length > 0
        ? await prisma.siswa.findMany({
            where: { id: { in: siswaIds } },
            select: { id: true, kelasId: true, kelas: { select: { id: true, nama: true, angkatan: true } } },
          })
        : [];

    const siswaMap = new Map(siswaData.map((s) => [s.id, s]));

    const kelasCountMap: Record<string, { kelasId: number; nama: string; angkatan: number; count: number }> = {};

    for (const item of absenPerKelasRaw) {
      const s = siswaMap.get(item.siswaId);
      if (s) {
        const key = `${s.kelasId}`;
        if (!kelasCountMap[key]) {
          kelasCountMap[key] = {
            kelasId: s.kelasId,
            nama: s.kelas.nama,
            angkatan: s.kelas.angkatan,
            count: 0,
          };
        }
        kelasCountMap[key].count += item._count.id;
      }
    }

    const absenPerKelas = Object.values(kelasCountMap);

    return NextResponse.json({
      success: true,
      data: {
        todayCount,
        monthCount,
        totalSiswa,
        absenPerKelas,
        recentActivities,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
