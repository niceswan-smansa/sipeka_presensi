import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateSiswa } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const angkatan = searchParams.get('angkatan');
    const kelasId = searchParams.get('kelasId');
    const search = searchParams.get('search');

    const where: any = { isActive: true };

    if (angkatan) {
      where.kelas = { angkatan: parseInt(angkatan) };
    }

    if (kelasId) {
      where.kelasId = parseInt(kelasId);
    }

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
      ];
    }

    const siswa = await prisma.siswa.findMany({
      where,
      include: {
        kelas: { select: { id: true, nama: true, angkatan: true } },
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({ success: true, data: siswa });
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
    const { valid, errors } = validateSiswa(body);

    if (!valid) {
      return NextResponse.json(
        { success: false, message: errors.join(', ') },
        { status: 400 },
      );
    }

    const { nis, nisn, nama, jenisKelamin, kelasId } = body;

    const kelasExists = await prisma.kelas.findUnique({ where: { id: kelasId } });
    if (!kelasExists) {
      return NextResponse.json(
        { success: false, message: 'Kelas tidak ditemukan' },
        { status: 404 },
      );
    }

    const existing = await prisma.siswa.findFirst({
      where: { nis, kelasId },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Siswa dengan NIS ${nis} sudah ada di kelas ini` },
        { status: 400 },
      );
    }

    const siswa = await prisma.siswa.create({
      data: {
        nis: nis.trim(),
        nisn: nisn.trim(),
        nama: nama.trim(),
        jenisKelamin: jenisKelamin.toUpperCase(),
        kelasId,
      },
      include: {
        kelas: { select: { id: true, nama: true, angkatan: true } },
      },
    });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'CREATE_SISWA',
        detail: `Menambahkan siswa baru: ${siswa.nama} (${siswa.nis}) di kelas ${siswa.kelas.nama}`,
        target: `siswa/${siswa.id}`,
      },
    });

    return NextResponse.json({ success: true, data: siswa }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
