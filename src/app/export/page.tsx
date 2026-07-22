'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthLayout from '@/components/layout/AuthLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { toast } from '@/hooks/useToast';

interface Kelas {
  id: number;
  nama: string;
  angkatan: number;
  waliKelas: string | null;
}

const ANGKATAN_OPTIONS = [
  { value: '', label: 'Semua Angkatan' },
  { value: '10', label: 'Angkatan 10' },
  { value: '11', label: 'Angkatan 11' },
  { value: '12', label: 'Angkatan 12' },
];

const KATEGORI_OPTIONS = [
  { value: '', label: 'Semua Kategori' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'bolos', label: 'Bolos' },
  { value: 'alpa', label: 'Alpa' },
  { value: 'hadir', label: 'Hadir' },
  { value: 'terlambat', label: 'Terlambat' },
];

export default function ExportPage() {
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [kategori, setKategori] = useState('');

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [downloading, setDownloading] = useState(false);

  const fetchKelas = useCallback(async () => {
    try {
      const res = await fetch('/api/kelas', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setKelasList(json.data);
      }
    } catch {
      toast.error('Gagal memuat data kelas');
    }
  }, []);

  useEffect(() => {
    fetchKelas();
  }, [fetchKelas]);

  const filteredKelasOptions = kelasList
    .filter((k) => (angkatan ? k.angkatan === parseInt(angkatan) : true))
    .map((k) => ({ value: String(k.id), label: k.nama }));

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (tanggalMulai) params.set('tanggalMulai', tanggalMulai);
      if (tanggalSelesai) params.set('tanggalSelesai', tanggalSelesai);
      if (angkatan) params.set('angkatan', angkatan);
      if (kelasId) params.set('kelasId', kelasId);
      if (kategori) params.set('kategori', kategori);

      const res = await fetch(`/api/export?${params}`, { credentials: 'include' });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.message || 'Gagal mengunduh data');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const start = tanggalMulai || 'awal';
      const end = tanggalSelesai || 'akhir';
      a.download = `absensi_siswa_${start}_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('File berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh data');
    } finally {
      setDownloading(false);
    }
  };

  const hasFilters = tanggalMulai || tanggalSelesai || angkatan || kelasId || kategori;

  return (
    <AuthLayout title="Export Data">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card padding="none">
          <div className="px-5 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Export Absensi</h2>
            <p className="mt-1 text-sm text-gray-500">
              Pilih filter dan unduh data absensi siswa ke file Excel.
            </p>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Periode Waktu
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Tanggal Mulai"
                  name="tanggalMulai"
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                />
                <Input
                  label="Tanggal Selesai"
                  name="tanggalSelesai"
                  type="date"
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Target
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Angkatan"
                  name="angkatan"
                  value={angkatan}
                  onChange={(e) => {
                    setAngkatan(e.target.value);
                    setKelasId('');
                  }}
                  options={ANGKATAN_OPTIONS}
                />
                <Select
                  label="Kelas"
                  name="kelasId"
                  value={kelasId}
                  onChange={(e) => setKelasId(e.target.value)}
                  options={[
                    { value: '', label: 'Semua Kelas' },
                    ...filteredKelasOptions,
                  ]}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Kategori
              </h3>
              <Select
                label="Kategori Absensi"
                name="kategori"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                options={KATEGORI_OPTIONS}
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleDownload}
              loading={downloading}
            >
              {downloading ? (
                'Mengunduh...'
              ) : (
                <>
                  <svg className={`h-5 w-5 ${downloading ? '' : 'group-hover:animate-bounce'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Excel
                </>
              )}
            </Button>
          </div>
        </Card>

        {!hasFilters && !downloading && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <svg className="h-7 w-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-900">
              Siap untuk mengekspor data
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Atur filter di atas, lalu klik tombol Download untuk mengunduh file Excel.
            </p>
          </div>
        )}

        {downloading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center animate-pulse">
            <Spinner size="lg" />
            <p className="mt-4 text-sm font-medium text-gray-900">
              Menyiapkan file Excel...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Mohon tunggu sebentar
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
