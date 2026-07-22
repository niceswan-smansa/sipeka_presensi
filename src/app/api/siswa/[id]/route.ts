import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateSiswa } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'ID tidak valid' },
        { status: 400 },
      );
    }

    const siswa = await prisma.siswa.findUnique({
      where: { id },
      include: {
        kelas: { select: { id: true, nama: true, angkatan: true } },
        absensi: {
          orderBy: { tanggal: 'desc' },
          take: 100,
        },
      },
    });

    if (!siswa) {
      return NextResponse.json(
        { success: false, message: 'Siswa tidak ditemukan' },
        { status: 404 },
      );
    }

    const totalAbsensi = await prisma.absensi.count({
      where: { siswaId: id },
    });

    const hadirCount = await prisma.absensi.count({
      where: { siswaId: id, kategori: 'hadir' },
    });

    const izinCount = await prisma.absensi.count({
      where: { siswaId: id, kategori: 'izin' },
    });

    const sakitCount = await prisma.absensi.count({
      where: { siswaId: id, kategori: 'sakit' },
    });

    const alpaCount = await prisma.absensi.count({
      where: { siswaId: id, kategori: { in: ['alpa', 'bolos'] } },
    });

    const keterlambatanCount = await prisma.absensi.count({
      where: { siswaId: id, kategori: 'terlambat' },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...siswa,
        stats: {
          total: totalAbsensi,
          hadir: hadirCount,
          izin: izinCount,
          sakit: sakitCount,
          alpa: alpaCount,
          terlambat: keterlambatanCount,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

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

    const existing = await prisma.siswa.findUnique({
      where: { id },
      include: { kelas: { select: { nama: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Siswa tidak ditemukan' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { valid, errors } = validateSiswa({ ...existing, ...body });

    if (!valid) {
      return NextResponse.json(
        { success: false, message: errors.join(', ') },
        { status: 400 },
      );
    }

    const changes: string[] = [];
    const updateData: any = {};

    if (body.nis && body.nis.trim() !== existing.nis) {
      updateData.nis = body.nis.trim();
      changes.push(`NIS: ${existing.nis} → ${body.nis.trim()}`);
    }

    if (body.nisn && body.nisn.trim() !== existing.nisn) {
      updateData.nisn = body.nisn.trim();
      changes.push(`NISN: ${existing.nisn} → ${body.nisn.trim()}`);
    }

    if (body.nama && body.nama.trim() !== existing.nama) {
      updateData.nama = body.nama.trim();
      changes.push(`Nama: ${existing.nama} → ${body.nama.trim()}`);
    }

    if (body.jenisKelamin && body.jenisKelamin.toUpperCase() !== existing.jenisKelamin) {
      updateData.jenisKelamin = body.jenisKelamin.toUpperCase();
      changes.push(`Jenis Kelamin: ${existing.jenisKelamin} → ${body.jenisKelamin.toUpperCase()}`);
    }

    if (body.kelasId && body.kelasId !== existing.kelasId) {
      const newKelas = await prisma.kelas.findUnique({ where: { id: body.kelasId } });
      if (!newKelas) {
        return NextResponse.json(
          { success: false, message: 'Kelas tidak ditemukan' },
          { status: 404 },
        );
      }
      updateData.kelasId = body.kelasId;
      changes.push(`Kelas: ${existing.kelas.nama} → ${newKelas.nama}`);
    }

    if (body.isActive !== undefined && body.isActive !== existing.isActive) {
      updateData.isActive = body.isActive;
      changes.push(`Status: ${existing.isActive ? 'Aktif' : 'Nonaktif'} → ${body.isActive ? 'Aktif' : 'Nonaktif'}`);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: existing });
    }

    const updated = await prisma.siswa.update({
      where: { id },
      data: updateData,
      include: {
        kelas: { select: { id: true, nama: true, angkatan: true } },
      },
    });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'UPDATE_SISWA',
        detail: `Mengubah data siswa ${existing.nama} (${existing.nis}): ${changes.join(', ')}`,
        target: `siswa/${id}`,
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

    const existing = await prisma.siswa.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Siswa tidak ditemukan' },
        { status: 404 },
      );
    }

    const updated = await prisma.siswa.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.riwayat.create({
      data: {
        userId: session.userId,
        aksi: 'DELETE_SISWA',
        detail: `Menonaktifkan siswa ${existing.nama} (${existing.nis})`,
        target: `siswa/${id}`,
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
