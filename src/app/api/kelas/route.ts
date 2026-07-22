import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateKelas } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const angkatanParam = searchParams.get('angkatan');

    const where: any = {};
    if (angkatanParam) {
      where.angkatan = parseInt(angkatanParam);
    }

    const kelas = await prisma.kelas.findMany({
      where,
      include: {
        _count: { select: { siswa: { where: { isActive: true } } } },
      },
      orderBy: [{ angkatan: 'asc' }, { nama: 'asc' }],
    });

    const grouped: Record<number, typeof kelas> = {};

    for (const k of kelas) {
      if (!grouped[k.angkatan]) {
        grouped[k.angkatan] = [];
      }
      grouped[k.angkatan].push(k);
    }

    return NextResponse.json({ success: true, data: kelas, grouped });
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
    const { valid, errors } = validateKelas(body);

    if (!valid) {
      return NextResponse.json(
        { success: false, message: errors.join(', ') },
        { status: 400 },
      );
    }

    const { nama, angkatan, waliKelas } = body;

    const existing = await prisma.kelas.findUnique({ where: { nama: nama.trim() } });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kelas dengan nama ${nama} sudah ada` },
        { status: 400 },
      );
    }

    const kelas = await prisma.kelas.create({
      data: {
        nama: nama.trim(),
        angkatan,
        waliKelas: waliKelas?.trim() || null,
      },
    });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'CREATE_KELAS',
        detail: `Menambahkan kelas baru: ${kelas.nama} (Angkatan ${kelas.angkatan})`,
        target: `kelas/${kelas.id}`,
      },
    });

    return NextResponse.json({ success: true, data: kelas }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
