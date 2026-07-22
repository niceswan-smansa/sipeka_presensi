import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateKelas } from '@/lib/validators';

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

    const existing = await prisma.kelas.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Kelas tidak ditemukan' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { valid, errors } = validateKelas({ ...existing, ...body });

    if (!valid) {
      return NextResponse.json(
        { success: false, message: errors.join(', ') },
        { status: 400 },
      );
    }

    const changes: string[] = [];
    const updateData: any = {};

    if (body.nama && body.nama.trim() !== existing.nama) {
      const duplicate = await prisma.kelas.findUnique({ where: { nama: body.nama.trim() } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { success: false, message: `Kelas dengan nama ${body.nama.trim()} sudah ada` },
          { status: 400 },
        );
      }
      updateData.nama = body.nama.trim();
      changes.push(`Nama: ${existing.nama} → ${body.nama.trim()}`);
    }

    if (body.angkatan !== undefined && body.angkatan !== existing.angkatan) {
      updateData.angkatan = body.angkatan;
      changes.push(`Angkatan: ${existing.angkatan} → ${body.angkatan}`);
    }

    if (body.waliKelas !== undefined && body.waliKelas !== existing.waliKelas) {
      updateData.waliKelas = body.waliKelas?.trim() || null;
      changes.push(`Wali Kelas: ${existing.waliKelas || '-'} → ${body.waliKelas || '-'}`);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: existing });
    }

    const updated = await prisma.kelas.update({
      where: { id },
      data: updateData,
    });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'UPDATE_KELAS',
        detail: `Mengubah kelas ${existing.nama}: ${changes.join(', ')}`,
        target: `kelas/${id}`,
      },
    });

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

    const existing = await prisma.kelas.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Kelas tidak ditemukan' },
        { status: 404 },
      );
    }

    const siswaCount = await prisma.siswa.count({
      where: { kelasId: id, isActive: true },
    });

    if (siswaCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Tidak dapat menghapus kelas. Masih terdapat ${siswaCount} siswa aktif di kelas ini. Pindahkan atau nonaktifkan siswa terlebih dahulu.`,
        },
        { status: 400 },
      );
    }

    await prisma.kelas.delete({ where: { id } });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'DELETE_KELAS',
        detail: `Menghapus kelas ${existing.nama} (Angkatan ${existing.angkatan})`,
        target: `kelas/${id}`,
      },
    });

    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
