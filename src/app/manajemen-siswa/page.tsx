'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AuthLayout from '@/components/layout/AuthLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from '@/hooks/useToast';

interface Siswa {
  id: number;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  kelasId: number;
  kelas: {
    id: number;
    nama: string;
    angkatan: number;
  };
  isActive: boolean;
}

interface Kelas {
  id: number;
  nama: string;
  angkatan: number;
  waliKelas: string | null;
  _count?: { siswa: number };
}

const ANGKATAN_OPTIONS = [
  { value: '', label: 'Semua Angkatan' },
  { value: '10', label: 'Angkatan 10' },
  { value: '11', label: 'Angkatan 11' },
  { value: '12', label: 'Angkatan 12' },
];

export default function ManajemenSiswaPage() {
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedAngkatan, setSelectedAngkatan] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');

  const [showTambahModal, setShowTambahModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    nama: '',
    jenisKelamin: 'L',
    kelasId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchSiswa = useCallback(async () => {
    if (!selectedAngkatan) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('angkatan', selectedAngkatan);
      if (selectedKelasId) params.set('kelasId', selectedKelasId);

      const res = await fetch(`/api/siswa?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setSiswaList(json.data);
      }
    } catch {
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  }, [selectedAngkatan, selectedKelasId]);

  useEffect(() => {
    fetchKelas();
  }, [fetchKelas]);

  useEffect(() => {
    fetchSiswa();
  }, [fetchSiswa]);

  const filteredKelasOptions = kelasList
    .filter((k) => (selectedAngkatan ? k.angkatan === parseInt(selectedAngkatan) : true))
    .map((k) => ({ value: String(k.id), label: k.nama }));

  const openTambahModal = () => {
    setFormData({ nis: '', nisn: '', nama: '', jenisKelamin: 'L', kelasId: '' });
    setFormErrors({});
    setShowTambahModal(true);
  };

  const openEditModal = (siswa: Siswa) => {
    setEditingSiswa(siswa);
    setFormData({
      nis: siswa.nis,
      nisn: siswa.nisn,
      nama: siswa.nama,
      jenisKelamin: siswa.jenisKelamin,
      kelasId: String(siswa.kelasId),
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nis.trim()) errors.nis = 'NIS wajib diisi';
    if (!formData.nisn.trim()) errors.nisn = 'NISN wajib diisi';
    if (!formData.nama.trim()) errors.nama = 'Nama wajib diisi';
    if (!formData.kelasId) errors.kelasId = 'Kelas wajib dipilih';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTambah = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/siswa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: formData.nis.trim(),
          nisn: formData.nisn.trim(),
          nama: formData.nama.trim(),
          jenisKelamin: formData.jenisKelamin,
          kelasId: parseInt(formData.kelasId),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Siswa berhasil ditambahkan');
        setShowTambahModal(false);
        fetchSiswa();
      } else {
        toast.error(json.message || 'Gagal menambahkan siswa');
      }
    } catch {
      toast.error('Gagal menambahkan siswa');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingSiswa || !validateForm()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/siswa/${editingSiswa.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nis: formData.nis.trim(),
          nisn: formData.nisn.trim(),
          nama: formData.nama.trim(),
          jenisKelamin: formData.jenisKelamin,
          kelasId: parseInt(formData.kelasId),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Data siswa berhasil diubah');
        setShowEditModal(false);
        setEditingSiswa(null);
        fetchSiswa();
      } else {
        toast.error(json.message || 'Gagal mengubah data siswa');
      }
    } catch {
      toast.error('Gagal mengubah data siswa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/siswa/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Siswa berhasil dinonaktifkan');
        setDeleteTarget(null);
        fetchSiswa();
      } else {
        toast.error(json.message || 'Gagal menonaktifkan siswa');
      }
    } catch {
      toast.error('Gagal menonaktifkan siswa');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'NIS,NISN,Nama Siswa,L/P\n12345,0012345678,Nama Siswa,L\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_siswa.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        toast.error('File CSV kosong atau tidak valid');
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const header = lines[0].toLowerCase();
      if (!header.includes('nis') && !header.includes('nama')) {
        toast.error('Format CSV tidak sesuai. Gunakan template yang disediakan.');
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const dataRows = lines.slice(1);
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const cols = dataRows[i].split(/[,\t;]/).map((c) => c.trim());
        if (cols.length < 4) {
          failCount++;
          continue;
        }

        const [nis, nisn, nama, jkRaw] = cols;
        const jenisKelamin =
          jkRaw.toUpperCase() === 'P' || jkRaw.toUpperCase() === 'PEREMPUAN' ? 'P' : 'L';

        setImportProgress(`Mengimpor ${i + 1}/${dataRows.length} siswa...`);

        try {
          const res = await fetch('/api/siswa', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nis,
              nisn,
              nama,
              jenisKelamin,
              kelasId: selectedKelasId ? parseInt(selectedKelasId) : 0,
            }),
          });
          const json = await res.json();
          if (json.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      setImportProgress('');

      if (successCount > 0) {
        toast.success(`Berhasil mengimpor ${successCount} siswa`);
      }
      if (failCount > 0) {
        toast.error(`Gagal mengimpor ${failCount} siswa. Periksa format dan pastikan kelas sudah dipilih.`);
      }
      if (successCount === 0 && failCount === 0) {
        toast('Tidak ada data yang diimpor');
      }

      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchSiswa();
    };

    reader.onerror = () => {
      toast.error('Gagal membaca file');
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <AuthLayout title="Manajemen Siswa">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Angkatan"
            name="angkatan"
            value={selectedAngkatan}
            onChange={(e) => {
              setSelectedAngkatan(e.target.value);
              setSelectedKelasId('');
            }}
            options={ANGKATAN_OPTIONS}
          />
          <Select
            label="Kelas"
            name="kelasId"
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            options={[
              { value: '', label: 'Semua Kelas' },
              ...filteredKelasOptions,
            ]}
          />
        </div>

        <Card padding="none">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Daftar Siswa
                {siswaList.length > 0 && (
                  <span className="ml-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                    {siswaList.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="gradient"
                size="sm"
                onClick={openTambahModal}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Siswa
              </Button>
              <Button size="sm" variant="outline" onClick={downloadTemplate}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Template CSV
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                loading={importing}
                disabled={!selectedAngkatan || !selectedKelasId}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </div>
          </div>

          {!selectedAngkatan ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
                <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-semibold text-gray-900">Pilih Angkatan &amp; Kelas</h3>
              <p className="mt-1 text-sm text-gray-500">Silakan pilih filter angkatan dan kelas untuk menampilkan data siswa.</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : importProgress ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-gray-600">{importProgress}</p>
            </div>
          ) : siswaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
                <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-semibold text-gray-900">Belum ada siswa</h3>
              <p className="mt-1 text-sm text-gray-500">Tambahkan siswa baru melalui tombol Tambah Siswa di atas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/80 backdrop-blur-sm text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="pl-5 pr-3 py-3.5 w-10">No</th>
                    <th className="px-3 py-3.5">NIS</th>
                    <th className="px-3 py-3.5">NISN</th>
                    <th className="px-3 py-3.5">Nama</th>
                    <th className="px-3 py-3.5 w-14">L/P</th>
                    <th className="px-3 py-3.5">Kelas</th>
                    <th className="px-3 py-3.5 pr-5 w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {siswaList.map((siswa, i) => (
                    <tr
                      key={siswa.id}
                      className={`transition-colors duration-150 hover:bg-blue-50/20 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="pl-5 pr-3 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-600">{siswa.nis}</td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-600">{siswa.nisn}</td>
                      <td className="px-3 py-3 font-semibold text-gray-900">{siswa.nama}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            siswa.jenisKelamin === 'L'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-pink-100 text-pink-700'
                          }`}
                        >
                          {siswa.jenisKelamin}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          {siswa.kelas.nama}
                        </span>
                      </td>
                      <td className="px-3 pr-5 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditModal(siswa)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit siswa"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(siswa)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Nonaktifkan siswa"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Tambah Siswa Modal */}
      <Modal
        isOpen={showTambahModal}
        onClose={() => setShowTambahModal(false)}
        title="Tambah Siswa"
      >
        <SiswaForm
          formData={formData}
          errors={formErrors}
          kelasOptions={kelasList.map((k) => ({ value: String(k.id), label: `${k.nama} (Angkatan ${k.angkatan})` }))}
          onChange={handleFormChange}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowTambahModal(false)}>
            Batal
          </Button>
          <Button size="sm" onClick={handleTambah} loading={saving}>
            Simpan
          </Button>
        </div>
      </Modal>

      {/* Edit Siswa Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSiswa(null);
        }}
        title="Edit Siswa"
      >
        <SiswaForm
          formData={formData}
          errors={formErrors}
          kelasOptions={kelasList.map((k) => ({ value: String(k.id), label: `${k.nama} (Angkatan ${k.angkatan})` }))}
          onChange={handleFormChange}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowEditModal(false);
              setEditingSiswa(null);
            }}
          >
            Batal
          </Button>
          <Button size="sm" onClick={handleEdit} loading={saving}>
            Update
          </Button>
        </div>
      </Modal>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Nonaktifkan Siswa"
        message={`Apakah Anda yakin ingin menonaktifkan ${deleteTarget?.nama} (${deleteTarget?.nis})? Data absensi yang sudah ada tetap tersimpan.`}
        confirmLabel={deleting ? 'Menonaktifkan...' : 'Nonaktifkan'}
        variant="danger"
      />
    </AuthLayout>
  );
}

function SiswaForm({
  formData,
  errors,
  kelasOptions,
  onChange,
}: {
  formData: { nis: string; nisn: string; nama: string; jenisKelamin: string; kelasId: string };
  errors: Record<string, string>;
  kelasOptions: { value: string; label: string }[];
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="NIS"
        name="nis"
        value={formData.nis}
        onChange={(e) => onChange('nis', e.target.value)}
        placeholder="Masukkan NIS"
        error={errors.nis}
        required
      />
      <Input
        label="NISN"
        name="nisn"
        value={formData.nisn}
        onChange={(e) => onChange('nisn', e.target.value)}
        placeholder="Masukkan NISN"
        error={errors.nisn}
        required
      />
      <Input
        label="Nama"
        name="nama"
        value={formData.nama}
        onChange={(e) => onChange('nama', e.target.value)}
        placeholder="Masukkan nama lengkap"
        error={errors.nama}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-700">Jenis Kelamin</label>
        <div className="flex gap-8 pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="jenisKelamin"
              value="L"
              checked={formData.jenisKelamin === 'L'}
              onChange={(e) => onChange('jenisKelamin', e.target.value)}
              className="h-4 w-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Laki-laki</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="jenisKelamin"
              value="P"
              checked={formData.jenisKelamin === 'P'}
              onChange={(e) => onChange('jenisKelamin', e.target.value)}
              className="h-4 w-4 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Perempuan</span>
          </label>
        </div>
      </div>
      <Select
        label="Kelas"
        name="kelasId"
        value={formData.kelasId}
        onChange={(e) => onChange('kelasId', e.target.value)}
        options={kelasOptions}
        placeholder="Pilih kelas"
        error={errors.kelasId}
      />
    </div>
  );
}
