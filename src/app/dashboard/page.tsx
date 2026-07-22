'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import AuthLayout from '@/components/layout/AuthLayout';

interface PerKelas {
  nama: string;
  count: number;
}

interface AktivitasItem {
  id: number;
  createdAt: string;
  user: { nama: string };
  aksi: string;
  detail: string;
}

interface DashboardData {
  todayCount: number;
  monthCount: number;
  totalSiswa: number;
  absenPerKelas: PerKelas[];
  recentActivities: AktivitasItem[];
}

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const barGradients = [
  'bg-gradient-to-r from-blue-400 to-blue-500',
  'bg-gradient-to-r from-cyan-400 to-cyan-500',
  'bg-gradient-to-r from-indigo-400 to-indigo-500',
  'bg-gradient-to-r from-sky-400 to-sky-500',
  'bg-gradient-to-r from-violet-400 to-violet-500',
  'bg-gradient-to-r from-teal-400 to-teal-500',
  'bg-gradient-to-r from-blue-400 to-indigo-500',
  'bg-gradient-to-r from-emerald-400 to-teal-500',
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [userName, setUserName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, userRes] = await Promise.all([
        fetch('/api/dashboard', { credentials: 'include' }),
        fetch('/api/auth/me', { credentials: 'include' }),
      ]);

      if (!dashRes.ok) {
        const errJson = await dashRes.json().catch(() => null);
        throw new Error(errJson?.message || `Server error (${dashRes.status})`);
      }
      const json = await dashRes.json();
      setData(json.data);

      if (userRes.ok) {
        const userJson = await userRes.json();
        if (userJson?.data?.nama) {
          setUserName(userJson.data.nama);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <AuthLayout title="Dashboard" userName={userName}>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  if (error || !data) {
    return (
      <AuthLayout title="Dashboard" userName={userName}>
        <EmptyState
          icon={<svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          title="Gagal Memuat Data"
          description={error || 'Data tidak tersedia.'}
          action={{ label: 'Coba Lagi', onClick: fetchData }}
        />
      </AuthLayout>
    );
  }

  const todayStr = formatDate(new Date(), 'full');
  const now = new Date();
  const monthStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  const maxPerKelas = Math.max(...data.absenPerKelas.map((k: PerKelas) => k.count), 1);

  return (
    <AuthLayout title="Dashboard" userName={userName}>
      <div className="space-y-8 p-6">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-dark via-primary to-primary-light p-8 text-white shadow-lg">
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="batik" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                  <circle cx="30" cy="30" r="20" fill="none" stroke="white" strokeWidth="1"/>
                  <circle cx="30" cy="30" r="8" fill="white" opacity="0.5"/>
                  <path d="M10 10 Q30 0 50 10 Q30 20 10 10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6"/>
                  <path d="M10 50 Q30 40 50 50 Q30 60 10 50" fill="none" stroke="white" strokeWidth="0.5" opacity="0.6"/>
                  <line x1="0" y1="30" x2="60" y2="30" stroke="white" strokeWidth="0.3" opacity="0.3"/>
                  <line x1="30" y1="0" x2="30" y2="60" stroke="white" strokeWidth="0.3" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#batik)"/>
            </svg>
          </div>
          <div className="relative">
            <h2 className="text-sm font-medium uppercase tracking-widest text-white/70">
              Selamat datang, {userName}
            </h2>
            <h1 className="mt-2 text-3xl font-extrabold text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/60">{todayStr}</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-white">
            <div className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-500">Hari Ini</div>
            <div className="mt-2 text-4xl font-bold text-blue-600">
              {data.todayCount}
            </div>
            <div className="mt-1 text-sm text-gray-600">siswa tidak masuk</div>
            <div className="mt-1 text-xs text-gray-400">{todayStr}</div>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-white">
            <div className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-500">Bulan Ini</div>
            <div className="mt-2 text-4xl font-bold text-amber-600">
              {data.monthCount}
            </div>
            <div className="mt-1 text-sm text-gray-600">siswa tidak masuk</div>
            <div className="mt-1 text-xs text-gray-400">{monthStr}</div>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-white">
            <div className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-500">Total Siswa</div>
            <div className="mt-2 text-4xl font-bold text-emerald-600">
              {data.totalSiswa}
            </div>
            <div className="mt-1 text-sm text-gray-600">siswa aktif</div>
          </Card>
        </div>

        {/* Charts & Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-t-[3px] border-t-blue-500">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              Absensi Hari Ini per Kelas
            </h2>
            {data.absenPerKelas.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Belum ada data absensi hari ini.
              </p>
            ) : (
              <div className="space-y-4">
                {data.absenPerKelas.map((item, idx) => (
                  <div key={item.nama} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm font-medium text-gray-700">
                      {item.nama}
                    </span>
                    <div className="h-7 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${barGradients[idx % barGradients.length]}`}
                        style={{
                          width: `${Math.max(Math.round((item.count / maxPerKelas) * 100), 4)}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-bold text-gray-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-t-[3px] border-t-amber-500">
            <h2 className="mb-6 text-lg font-semibold text-gray-900">
              Aktivitas Terbaru
            </h2>
            {data.recentActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Belum ada aktivitas.
              </p>
            ) : (
              <ul className="space-y-0">
                {data.recentActivities.map((item, idx) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 border-l-[3px] border-l-blue-100 py-3 pl-4 pr-2 transition-colors hover:bg-blue-50/50 hover:border-l-blue-400"
                  >
                    <span className="mt-0.5 flex h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">{item.user.nama}</span>{' '}
                        {item.aksi} &mdash; {item.detail}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(item.createdAt, 'time')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Quick actions */}
        <Card className="border-t-[3px] border-t-primary">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">Aksi Cepat</h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => router.push('/input')}
              className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Input Absensi
            </button>
            <button
              onClick={() => router.push('/cari')}
              className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:from-gray-800 hover:to-gray-900 hover:shadow-lg"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Cari Siswa
            </button>
            <button
              onClick={() => router.push('/export')}
              className="flex flex-1 items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-6 py-4 text-base font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-lg"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Data
            </button>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}
