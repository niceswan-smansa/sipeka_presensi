'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthLayout from '@/components/layout/AuthLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, cn } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

interface RiwayatItem {
  id: number;
  userId: number;
  aksi: string;
  detail: string;
  target: string;
  createdAt: string;
  user: {
    id: number;
    nama: string;
    username: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface User {
  id: number;
  nama: string;
  username: string;
}

type AksiVariant = 'info' | 'warning' | 'danger' | 'success';

const AKTIVITAS_BADGE: Record<string, { label: string; variant: AksiVariant }> = {
  CREATE_SISWA: { label: 'Input', variant: 'info' },
  UPDATE_SISWA: { label: 'Edit', variant: 'warning' },
  DELETE_SISWA: { label: 'Hapus', variant: 'danger' },
  CREATE_KELAS: { label: 'Input', variant: 'info' },
  UPDATE_KELAS: { label: 'Edit', variant: 'warning' },
  DELETE_KELAS: { label: 'Hapus', variant: 'danger' },
  CREATE_ABSENSI: { label: 'Input', variant: 'info' },
  UPDATE_ABSENSI: { label: 'Edit', variant: 'warning' },
  DELETE_ABSENSI: { label: 'Hapus', variant: 'danger' },
  LOGIN: { label: 'Login', variant: 'success' },
  LOGOUT: { label: 'Logout', variant: 'success' },
};

const AKSI_COLORS: Record<AksiVariant, { bg: string; text: string; ring: string }> = {
  info: { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200' },
  danger: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200' },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
};

function getAksiBadge(aksi: string): { label: string; variant: AksiVariant } {
  const mapping = AKTIVITAS_BADGE[aksi];
  if (mapping) return mapping;

  if (aksi.includes('CREATE') || aksi.includes('INPUT')) {
    return { label: 'Input', variant: 'info' };
  }
  if (aksi.includes('UPDATE') || aksi.includes('EDIT')) {
    return { label: 'Edit', variant: 'warning' };
  }
  if (aksi.includes('DELETE') || aksi.includes('HAPUS')) {
    return { label: 'Hapus', variant: 'danger' };
  }
  if (aksi.includes('LOGIN') || aksi.includes('LOGOUT')) {
    return { label: 'Login', variant: 'success' };
  }
  return { label: aksi, variant: 'info' };
}

export default function RiwayatPage() {
  const [riwayatList, setRiwayatList] = useState<RiwayatItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  const [userList, setUserList] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/riwayat?limit=1000', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        const uniqueUsers: User[] = [];
        const seen = new Set<number>();
        for (const item of json.data as RiwayatItem[]) {
          if (!seen.has(item.user.id)) {
            seen.add(item.user.id);
            uniqueUsers.push(item.user);
          }
        }
        setUserList(uniqueUsers.sort((a, b) => a.nama.localeCompare(b.nama)));
      }
    } catch {
      // silently fail: user list is supplementary
    }
  }, []);

  const fetchRiwayat = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '20');
        if (selectedUserId) params.set('userId', selectedUserId);
        if (tanggalMulai) params.set('tanggalMulai', tanggalMulai);
        if (tanggalSelesai) params.set('tanggalSelesai', tanggalSelesai);

        const res = await fetch(`/api/riwayat?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setRiwayatList(json.data);
          setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        }
      } catch {
        toast.error('Gagal memuat data riwayat');
      } finally {
        setLoading(false);
      }
    },
    [selectedUserId, tanggalMulai, tanggalSelesai],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRiwayat(1);
  }, [fetchRiwayat]);

  const handleFilter = () => {
    fetchRiwayat(1);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchRiwayat(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchRiwayat(pagination.page + 1);
    }
  };

  const clearFilters = () => {
    setSelectedUserId('');
    setTanggalMulai('');
    setTanggalSelesai('');
  };

  const hasFilters = selectedUserId || tanggalMulai || tanggalSelesai;

  return (
    <AuthLayout title="Riwayat Aktivitas">
      <div className="space-y-6">
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              Filter Aktivitas
            </h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="User"
                name="userId"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                options={[
                  { value: '', label: 'Semua User' },
                  ...userList.map((u) => ({
                    value: String(u.id),
                    label: u.nama,
                  })),
                ]}
              />
              <Input
                label="Dari Tanggal"
                name="tanggalMulai"
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
              />
              <Input
                label="Sampai Tanggal"
                name="tanggalSelesai"
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
              />
              <Button size="md" onClick={handleFilter}>
                Filter
              </Button>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="rounded-full px-4 py-2 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {hasFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUserId && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 border border-sky-100">
                    User: {userList.find((u) => String(u.id) === selectedUserId)?.nama}
                  </span>
                )}
                {tanggalMulai && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-100">
                    Dari: {tanggalMulai}
                  </span>
                )}
                {tanggalSelesai && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-100">
                    Sampai: {tanggalSelesai}
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Log Aktivitas</h2>
              {pagination.total > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {pagination.total} entri ditemukan
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : riwayatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
                <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="22" rx="2" />
                  <line x1="8" y1="9" x2="16" y2="9" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="12" y2="17" />
                </svg>
              </div>
              <h3 className="mt-5 text-base font-semibold text-gray-900">Belum ada riwayat</h3>
              <p className="mt-1 text-sm text-gray-500">Aktivitas yang dilakukan oleh pengguna akan muncul di sini.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="pl-5 pr-3 py-3.5">Waktu</th>
                      <th className="px-3 py-3.5">User</th>
                      <th className="px-3 py-3.5">Aksi</th>
                      <th className="px-3 py-3.5 pr-5">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {riwayatList.map((item) => {
                      const badge = getAksiBadge(item.aksi);
                      const colorSet = AKSI_COLORS[badge.variant];
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/50 transition-colors duration-150"
                        >
                          <td className="pl-5 pr-3 py-3 whitespace-nowrap">
                            <p className="text-xs text-gray-400">
                              {formatDate(item.createdAt, 'short')}
                            </p>
                            <p className="text-[10px] text-gray-300 mt-0.5">
                              {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-gray-900 text-xs">{item.user?.nama || '-'}</p>
                            <p className="text-[10px] text-gray-400">@{item.user.username}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset',
                                colorSet.bg,
                                colorSet.text,
                                colorSet.ring,
                              )}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-3 pr-5 py-3 text-xs text-gray-600 max-w-sm truncate">
                            {item.detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/30 rounded-b-2xl">
                  <p className="text-xs font-medium text-gray-500">
                    Halaman {pagination.page} dari {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={pagination.page <= 1}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Sebelumnya
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={pagination.page >= pagination.totalPages}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white bg-primary border border-primary hover:bg-primary-dark transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Selanjutnya
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AuthLayout>
  );
}
