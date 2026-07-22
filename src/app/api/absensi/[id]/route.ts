import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'ID tidak valid' },
        { status: 400 },
      );
    }

    const existing = await prisma.absensi.findUnique({
      where: { id },
      include: { siswa: { select: { nama: true, nis: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Data absensi tidak ditemukan' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { kategori, jamPelajaran, keterangan } = body;

    const updateData: any = {};
    const changes: string[] = [];

    if (kategori !== undefined) {
      updateData.kategori = kategori;
      changes.push(`kategori: ${existing.kategori} → ${kategori}`);
    }

    if (jamPelajaran !== undefined) {
      updateData.jamPelajaran = jamPelajaran;
      changes.push(`jam pelajaran: ${existing.jamPelajaran} → ${jamPelajaran}`);
    }

    if (keterangan !== undefined) {
      updateData.keterangan = keterangan || null;
      changes.push(`keterangan: ${existing.keterangan || '-'} → ${keterangan || '-'}`);
    }

    updateData.userId = session.userId;

    const updated = await prisma.absensi.update({
      where: { id },
      data: updateData,
      include: {
        siswa: { select: { nama: true, nis: true } },
        user: { select: { nama: true } },
      },
    });

    if (changes.length > 0) {
      await prisma.riwayat.create({
        data: {
          userId: session.userId,
          aksi: 'UPDATE_ABSENSI',
          detail: `Mengubah absensi ${existing.siswa.nama} (${existing.siswa.nis}): ${changes.join(', ')}`,
          target: `absensi/${id}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'ID tidak valid' },
        { status: 400 },
      );
    }

    const existing = await prisma.absensi.findUnique({
      where: { id },
      include: { siswa: { select: { nama: true, nis: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Data absensi tidak ditemukan' },
        { status: 404 },
      );
    }

    await prisma.absensi.delete({ where: { id } });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'DELETE_ABSENSI',
        detail: `Menghapus absensi ${existing.siswa.nama} (${existing.siswa.nis}) pada ${existing.tanggal.toISOString().split('T')[0]} jam ke-${existing.jamPelajaran}`,
        target: `absensi/${id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
