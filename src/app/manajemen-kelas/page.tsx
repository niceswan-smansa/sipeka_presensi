'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface Kelas {
  id: number;
  nama: string;
  angkatan: number;
  waliKelas: string | null;
  _count: { siswa: number };
}

interface GroupedKelas {
  [angkatan: number]: Kelas[];
}

const ANGKATAN_OPTIONS = [
  { value: '10', label: '10' },
  { value: '11', label: '11' },
  { value: '12', label: '12' },
];

const ANGKATAN_STYLES: Record<number, { label: string; border: string; badge: string; gradient: string; icon: string }> = {
  10: {
    label: 'Angkatan Sepuluh',
    border: 'border-l-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
    gradient: 'from-emerald-50 to-emerald-100/50',
    icon: 'bg-emerald-100 text-emerald-600',
  },
  11: {
    label: 'Angkatan Sebelas',
    border: 'border-l-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-50 to-blue-100/50',
    icon: 'bg-blue-100 text-blue-600',
  },
  12: {
    label: 'Angkatan Dua Belas',
    border: 'border-l-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    gradient: 'from-purple-50 to-purple-100/50',
    icon: 'bg-purple-100 text-purple-600',
  },
};

export default function ManajemenKelasPage() {
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [grouped, setGrouped] = useState<GroupedKelas>({});
  const [loading, setLoading] = useState(true);
  const [expandedAngkatan, setExpandedAngkatan] = useState<Set<number>>(new Set([10, 11, 12]));

  const [showModal, setShowModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kelas | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    angkatan: '10',
    waliKelas: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchKelas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kelas', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setKelasList(json.data);
        setGrouped(json.grouped);
      }
    } catch {
      toast.error('Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKelas();
  }, [fetchKelas]);

  const openTambahModal = () => {
    setEditingKelas(null);
    setFormData({ nama: '', angkatan: '10', waliKelas: '' });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (kelas: Kelas) => {
    setEditingKelas(kelas);
    setFormData({
      nama: kelas.nama,
      angkatan: String(kelas.angkatan),
      waliKelas: kelas.waliKelas || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.nama.trim()) errors.nama = 'Nama kelas wajib diisi';
    if (!formData.angkatan) errors.angkatan = 'Angkatan wajib dipilih';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const body = {
        nama: formData.nama.trim(),
        angkatan: parseInt(formData.angkatan),
        waliKelas: formData.waliKelas.trim() || undefined,
      };

      const url = editingKelas
        ? `/api/kelas/${editingKelas.id}`
        : '/api/kelas';
      const method = editingKelas ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(editingKelas ? 'Kelas berhasil diubah' : 'Kelas berhasil ditambahkan');
        setShowModal(false);
        setEditingKelas(null);
        fetchKelas();
      } else {
        toast.error(json.message || 'Gagal menyimpan kelas');
      }
    } catch {
      toast.error('Gagal menyimpan kelas');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/kelas/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();

      if (json.success) {
        toast.success('Kelas berhasil dihapus');
        setDeleteTarget(null);
        fetchKelas();
      } else {
        toast.error(json.message || 'Gagal menghapus kelas');
        setDeleteTarget(null);
      }
    } catch {
      toast.error('Gagal menghapus kelas');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAngkatan = (angkatan: number) => {
    setExpandedAngkatan((prev) => {
      const next = new Set(prev);
      if (next.has(angkatan)) {
        next.delete(angkatan);
      } else {
        next.add(angkatan);
      }
      return next;
    });
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

  const totalSiswa = kelasList.reduce((sum, k) => sum + k._count.siswa, 0);

  return (
    <AuthLayout title="Manajemen Kelas">
      <div className="space-y-6">
        <Card padding="none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Daftar Kelas
                {kelasList.length > 0 && (
                  <span className="ml-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                    {kelasList.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {totalSiswa} total siswa
              </p>
            </div>
            <Button variant="gradient" size="sm" onClick={openTambahModal}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Kelas
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : kelasList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
                <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6l7-3 7 3" /><path d="M4 10v11" /><path d="M20 10v11" /><path d="M8 14v3" /><path d="M12 14v3" /><path d="M16 14v3" /><path d="M8 18v3" /><path d="M12 18v3" /><path d="M16 18v3" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-semibold text-gray-900">Belum ada kelas</h3>
              <p className="mt-1 text-sm text-gray-500">Tambahkan kelas baru untuk mulai mengelola data siswa.</p>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {[10, 11, 12].map((angkatan) => {
                const items = grouped[angkatan];
                if (!items || items.length === 0) return null;
                const isExpanded = expandedAngkatan.has(angkatan);
                const style = ANGKATAN_STYLES[angkatan];

                return (
                  <div
                    key={angkatan}
                    className={`rounded-2xl border border-gray-200 overflow-hidden transition-shadow duration-200 ${
                      isExpanded ? 'shadow-sm' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleAngkatan(angkatan)}
                      className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors bg-gradient-to-r ${style.gradient}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl ${style.icon} flex items-center justify-center`}>
                          <span className="text-sm font-bold">{angkatan}</span>
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900">
                            {style.label}
                          </span>
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
                            {items.length} kelas
                          </span>
                        </div>
                      </div>
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-gray-50 bg-white">
                        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-2.5 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          <span className="col-span-3">Nama Kelas</span>
                          <span className="col-span-3">Siswa</span>
                          <span className="col-span-4">Wali Kelas</span>
                          <span className="col-span-2" />
                        </div>
                        {items.map((kelas) => (
                          <div
                            key={kelas.id}
                            className={`grid grid-cols-12 gap-4 items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors border-l-4 ${style.border} hover:shadow-sm`}
                          >
                            <div className="col-span-3">
                              <p className="text-sm font-semibold text-gray-900">{kelas.nama}</p>
                            </div>
                            <div className="col-span-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${style.badge}`}>
                                {kelas._count.siswa} siswa
                              </span>
                            </div>
                            <div className="col-span-4">
                              <p className="text-sm text-gray-500">
                                {kelas.waliKelas || (
                                  <span className="text-gray-300">-</span>
                                )}
                              </p>
                            </div>
                            <div className="col-span-2 flex justify-end gap-1">
                              <button
                                onClick={() => openEditModal(kelas)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Edit kelas"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteTarget(kelas)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Hapus kelas"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Tambah / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingKelas(null);
        }}
        title={editingKelas ? 'Edit Kelas' : 'Tambah Kelas'}
      >
        <div className="space-y-4">
          <Input
            label="Nama Kelas"
            name="nama"
            value={formData.nama}
            onChange={(e) => handleFormChange('nama', e.target.value)}
            placeholder="Contoh: 10-A, XI-A-1"
            error={formErrors.nama}
            required
          />
          <Select
            label="Angkatan"
            name="angkatan"
            value={formData.angkatan}
            onChange={(e) => handleFormChange('angkatan', e.target.value)}
            options={ANGKATAN_OPTIONS}
          />
          <Input
            label="Wali Kelas"
            name="waliKelas"
            value={formData.waliKelas}
            onChange={(e) => handleFormChange('waliKelas', e.target.value)}
            placeholder="Nama wali kelas (opsional)"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowModal(false);
              setEditingKelas(null);
            }}
          >
            Batal
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            {editingKelas ? 'Update' : 'Simpan'}
          </Button>
        </div>
      </Modal>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kelas"
        message={`Apakah Anda yakin ingin menghapus kelas ${deleteTarget?.nama}? Kelas yang masih memiliki siswa tidak dapat dihapus.`}
        confirmLabel={deleting ? 'Menghapus...' : 'Hapus'}
        variant="danger"
      />
    </AuthLayout>
  );
}
