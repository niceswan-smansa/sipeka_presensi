'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/layout/AuthLayout';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

interface Siswa {
  id: number;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  kelasId: number;
  kelas: { id: number; nama: string; angkatan: number };
  isActive: boolean;
}

interface Kelas {
  id: number;
  nama: string;
  angkatan: number;
}

export default function CariPage() {
  const [search, setSearch] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [absenCounts, setAbsenCounts] = useState<Record<number, number>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    fetchKelas();
  }, []);

  const fetchKelas = async () => {
    try {
      const res = await fetch('/api/kelas');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setKelasList(json.data);
      }
    } catch {
      // silently ignore
    }
  };

  const fetchAbsenCounts = async (siswaList: Siswa[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const counts: Record<number, number> = {};

    const results = await Promise.allSettled(
      siswaList.map(async (s) => {
        const res = await fetch(`/api/absensi?siswaId=${s.id}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const count = json.data.filter((a: any) => {
            const d = new Date(a.tanggal);
            return d >= thirtyDaysAgo && d <= now;
          }).length;
          counts[s.id] = count;
        }
      }),
    );

    setAbsenCounts(counts);
  };

  const fetchSiswa = useCallback(async (query: string, angkatanVal: string, kelasIdVal: string) => {
    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (angkatanVal) params.set('angkatan', angkatanVal);
      if (kelasIdVal) params.set('kelasId', kelasIdVal);

      const res = await fetch(`/api/siswa?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSiswa(json.data);
        if (json.data.length > 0) {
          fetchAbsenCounts(json.data);
        } else {
          setAbsenCounts({});
        }
      } else {
        setSiswa([]);
        setAbsenCounts({});
      }
    } catch {
      setSiswa([]);
      setAbsenCounts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSiswa(search, angkatan, kelasId);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, angkatan, kelasId, fetchSiswa]);

  const filteredKelas = angkatan
    ? kelasList.filter((k) => k.angkatan === parseInt(angkatan))
    : kelasList;

  const kelasOptions = [
    { value: '', label: 'Semua Kelas' },
    ...filteredKelas.map((k) => ({ value: String(k.id), label: k.nama })),
  ];

  const getAbsenBadgeVariant = (count: number) => {
    if (count === 0) return 'success';
    if (count <= 2) return 'warning';
    return 'danger';
  };

  const clearFilters = () => {
    setSearch('');
    setAngkatan('');
    setKelasId('');
  };

  const hasActiveFilters = search || angkatan || kelasId;

  return (
    <AuthLayout title="Cari Siswa">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="relative">
          <div
            className={cn(
              'relative rounded-2xl transition-all duration-300',
              searchFocused
                ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/5'
                : 'shadow-sm',
            )}
          >
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Cari berdasarkan nama atau NIS..."
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-14 pr-4 text-base text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
            <Select
              name="angkatan"
              value={angkatan}
              onChange={(e) => {
                setAngkatan(e.target.value);
                setKelasId('');
              }}
              options={[
                { value: '', label: 'Semua Angkatan' },
                { value: '10', label: 'Angkatan 10' },
                { value: '11', label: 'Angkatan 11' },
                { value: '12', label: 'Angkatan 12' },
              ]}
              label=""
            />
            <Select
              name="kelasId"
              value={kelasId}
              onChange={(e) => setKelasId(e.target.value)}
              options={kelasOptions}
              label=""
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-full px-4 py-2 text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Reset Filter
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {search && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-100">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                &quot;{search}&quot;
              </span>
            )}
            {angkatan && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                Angkatan {angkatan}
              </span>
            )}
            {kelasId && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-100">
                {kelasList.find((k) => String(k.id) === kelasId)?.nama || `Kelas ${kelasId}`}
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : !hasSearched || (!search && !angkatan && !kelasId) ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
              <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Cari Siswa
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Gunakan kolom pencarian dan filter untuk menemukan data siswa.
            </p>
          </div>
        ) : siswa.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-20 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
              <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="22" rx="2" />
                <line x1="8" y1="9" x2="16" y2="9" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="12" y2="17" />
              </svg>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">
              Tidak ada siswa ditemukan
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Coba ubah kata kunci pencarian atau filter yang digunakan.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3.5 w-10">No</th>
                  <th className="px-5 py-3.5">Nama Siswa</th>
                  <th className="px-5 py-3.5">Kelas</th>
                  <th className="px-5 py-3.5">NIS</th>
                  <th className="px-5 py-3.5">Absen (30 hari)</th>
                  <th className="px-5 py-3.5 w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {siswa.map((s, i) => (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50/20 transition-colors duration-150 group"
                  >
                    <td className="px-5 py-3.5 text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {s.nama}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {s.kelas.nama}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                      {s.nis}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.id in absenCounts ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
                            absenCounts[s.id] === 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : absenCounts[s.id] <= 2
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700',
                          )}
                        >
                          {absenCounts[s.id]}
                        </span>
                      ) : (
                        <span className="inline-flex h-2 w-2 rounded-full bg-gray-200 animate-pulse" />
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/siswa/${s.id}`}
                        className="text-xs font-semibold text-primary hover:text-primary-light transition-colors"
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
