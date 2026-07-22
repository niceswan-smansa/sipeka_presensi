import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
    const userId = searchParams.get('userId');
    const tanggalMulai = searchParams.get('tanggalMulai');
    const tanggalSelesai = searchParams.get('tanggalSelesai');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = parseInt(userId);
    }

    if (tanggalMulai || tanggalSelesai) {
      where.createdAt = {};
      if (tanggalMulai) {
        const start = new Date(tanggalMulai);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (tanggalSelesai) {
        const end = new Date(tanggalSelesai);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [riwayat, total] = await Promise.all([
      prisma.riwayat.findMany({
        where,
        include: {
          user: { select: { id: true, nama: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.riwayat.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: riwayat,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
