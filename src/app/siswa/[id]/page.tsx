'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AuthLayout from '@/components/layout/AuthLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Checkbox from '@/components/ui/Checkbox';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { cn, formatDate } from '@/lib/utils';

interface SiswaDetail {
  id: number;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  kelasId: number;
  kelas: { id: number; nama: string; angkatan: number; waliKelas?: string | null };
  isActive: boolean;
  absensi: AbsensiItem[];
  stats: {
    total: number;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    terlambat: number;
  };
}

interface AbsensiItem {
  id: number;
  siswaId: number;
  tanggal: string;
  jamPelajaran: number;
  kategori: string;
  keterangan: string | null;
  userId: number;
  createdAt: string;
  siswa?: { nama: string; nis: string };
  user?: { id: number; nama: string };
}

interface DayGroup {
  tanggal: string;
  items: AbsensiItem[];
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const JAM_COUNT = 10;
const PIE_COLORS = {
  bolos: '#ef4444',
  alpa: '#ef4444',
  sakit: '#f59e0b',
  izin: '#3b82f6',
  hadir: '#22c55e',
};

const KATEGORI_CONFIG: Record<string, { bg: string; text: string; ring: string; color: string }> = {
  bolos: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', color: '#ef4444' },
  alpa: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', color: '#ef4444' },
  sakit: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', color: '#f59e0b' },
  izin: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', color: '#3b82f6' },
};

const KATEGORI_OPTIONS = [
  { value: 'bolos', label: 'Bolos' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'izin', label: 'Izin' },
];

export default function SiswaDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [siswa, setSiswa] = useState<SiswaDetail | null>(null);
  const [allAbsensi, setAllAbsensi] = useState<AbsensiItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAbsensi, setEditingAbsensi] = useState<AbsensiItem | null>(null);
  const [editKategori, setEditKategori] = useState('');
  const [editJam, setEditJam] = useState<number[]>([]);
  const [editSeharian, setEditSeharian] = useState(false);
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDate, setDeletingDate] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [siswaRes, absensiRes] = await Promise.all([
        fetch(`/api/siswa/${id}`),
        fetch(`/api/absensi?siswaId=${id}`),
      ]);
      const siswaJson = await siswaRes.json();
      const absensiJson = await absensiRes.json();

      if (siswaJson.success) {
        setSiswa(siswaJson.data);
      }
      if (absensiJson.success && Array.isArray(absensiJson.data)) {
        setAllAbsensi(absensiJson.data);
      }
    } catch {
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const bulanDays = useCallback(() => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const days: { day: number; dateStr: string; categories: string[] }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const matching = allAbsensi.filter((a) => a.tanggal.startsWith(dateStr));
      const categories = Array.from(new Set(matching.map((a) => a.kategori)));
      days.push({ day: d, dateStr, categories });
    }

    return { days, offset };
  }, [calYear, calMonth, allAbsensi]);

  const getDayColorClass = (categories: string[]) => {
    if (categories.length === 0) return '';
    const prior = ['bolos', 'alpa', 'sakit', 'izin'];
    for (const p of prior) {
      if (categories.some((c) => c.toLowerCase() === p)) {
        const colors: Record<string, string> = {
          bolos: 'bg-red-100 text-red-800 hover:bg-red-200',
          alpa: 'bg-red-100 text-red-800 hover:bg-red-200',
          sakit: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
          izin: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        };
        return colors[p] || '';
      }
    }
    return '';
  };

  const getBadgeVariant = (kategori: string): 'danger' | 'warning' | 'info' | 'success' | 'default' => {
    const map: Record<string, 'danger' | 'warning' | 'info' | 'success'> = {
      bolos: 'danger',
      alpa: 'danger',
      sakit: 'warning',
      izin: 'info',
    };
    return map[kategori.toLowerCase()] || 'default';
  };

  const pieData = () => {
    const bolos = allAbsensi.filter((a) => a.kategori === 'bolos' || a.kategori === 'alpa').length;
    const sakit = allAbsensi.filter((a) => a.kategori === 'sakit').length;
    const izin = allAbsensi.filter((a) => a.kategori === 'izin').length;

    return [
      { name: 'Bolos', value: bolos, color: PIE_COLORS.bolos },
      { name: 'Sakit', value: sakit, color: PIE_COLORS.sakit },
      { name: 'Izin', value: izin, color: PIE_COLORS.izin },
    ].filter((d) => d.value > 0);
  };

  const barData = () => {
    const now = new Date();
    const months: { name: string; bolos: number; sakit: number; izin: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: BULAN[m.getMonth()].substring(0, 3),
        bolos: 0,
        sakit: 0,
        izin: 0,
      });
    }

    for (const a of allAbsensi) {
      const d = new Date(a.tanggal);
      const idx = months.findIndex(
        (m) => m.name === BULAN[d.getMonth()].substring(0, 3),
      );
      if (idx >= 0) {
        if (a.kategori === 'bolos' || a.kategori === 'alpa') months[idx].bolos++;
        else if (a.kategori === 'sakit') months[idx].sakit++;
        else if (a.kategori === 'izin') months[idx].izin++;
      }
    }

    return months;
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const handleDayClick = (dateStr: string) => {
    const items = allAbsensi.filter((a) => a.tanggal.startsWith(dateStr));
    if (items.length === 0) return;
    setSelectedDay({ tanggal: dateStr, items });
  };

  const openEditModal = () => {
    if (!selectedDay || selectedDay.items.length === 0) return;
    const first = selectedDay.items[0];
    setEditingAbsensi(first);
    setEditKategori(first.kategori);

    const allJams = selectedDay.items.map((a) => a.jamPelajaran);
    setEditJam(allJams);
    setEditSeharian(allJams.length === JAM_COUNT);
    setEditKeterangan(first.keterangan || '');
    setEditModalOpen(true);
  };

  const handleSeharianToggle = (checked: boolean) => {
    setEditSeharian(checked);
    if (checked) {
      const all = Array.from({ length: JAM_COUNT }, (_, i) => i + 1);
      setEditJam(all);
    }
  };

  const handleJamToggle = (jam: number) => {
    setEditJam((prev) =>
      prev.includes(jam) ? prev.filter((j) => j !== jam) : [...prev, jam],
    );
  };

  const handleSaveEdit = async () => {
    if (!editingAbsensi) return;
    if (editJam.length === 0) {
      toast.error('Pilih minimal satu jam pelajaran');
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(`/api/absensi/${editingAbsensi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kategori: editKategori,
          jamPelajaran: editJam[0],
          keterangan: editKeterangan || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Absensi berhasil diperbarui');
        setEditModalOpen(false);
        loadData();
      } else {
        toast.error(json.message || 'Gagal memperbarui absensi');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setEditSaving(false);
    }
  };

  const openDeleteConfirm = () => {
    if (!selectedDay) return;
    setDeletingDate(selectedDay.tanggal);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDay || selectedDay.items.length === 0) return;
    setDeleteLoading(true);

    try {
      const results = await Promise.allSettled(
        selectedDay.items.map((a) =>
          fetch(`/api/absensi/${a.id}`, { method: 'DELETE' }),
        ),
      );
      const allOk = results.every((r) => r.status === 'fulfilled');
      if (allOk) {
        toast.success('Absensi berhasil dihapus');
      }
      setDeleteDialogOpen(false);
      setSelectedDay(null);
      loadData();
    } catch {
      toast.error('Gagal menghapus absensi');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Detail Siswa">
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    );
  }

  if (!siswa) {
    return (
      <AuthLayout title="Detail Siswa">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50">
            <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 className="mt-5 text-lg font-semibold text-gray-900">Siswa tidak ditemukan</h2>
          <p className="mt-1 text-sm text-gray-500">Data siswa yang Anda cari tidak tersedia.</p>
        </div>
      </AuthLayout>
    );
  }

  const { days, offset } = bulanDays();
  const sortedHistory = [...allAbsensi].sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
  );
  const totalPages = Math.ceil(sortedHistory.length / PER_PAGE);
  const pagedHistory = sortedHistory.slice(
    (historyPage - 1) * PER_PAGE,
    historyPage * PER_PAGE,
  );

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <AuthLayout title={`Detail Siswa: ${siswa.nama}`}>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Profile Card */}
        <Card padding="none" className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary via-primary to-primary-light px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {siswa.nama.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{siswa.nama}</h2>
                <p className="text-sm text-white/70 mt-0.5">
                  {siswa.kelas.nama} &middot; Angkatan {siswa.kelas.angkatan}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: 'NIS', value: siswa.nis },
              { label: 'NISN', value: siswa.nisn },
              { label: 'Wali Kelas', value: siswa.kelas.waliKelas || '-' },
              { label: 'Jenis Kelamin', value: siswa.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan' },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {item.label}
                </span>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Calendar */}
        <Card padding="lg">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-gray-700">Kalender Absensi</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Klik tanggal berwarna untuk melihat detail absensi
            </p>
          </div>

          <div className="mt-4 mb-4 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-base font-bold text-gray-900">
              {BULAN[calMonth]} {calYear}
            </h3>
            <button
              onClick={nextMonth}
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
              <div
                key={d}
                className="py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400"
              >
                {d}
              </div>
            ))}

            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map(({ day, dateStr, categories }) => {
              const colorClass = getDayColorClass(categories);
              const isSelected = selectedDay?.tanggal === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl text-sm font-medium transition-all duration-150',
                    colorClass
                      ? colorClass + ' shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100',
                    isSelected && 'ring-2 ring-offset-1 ring-primary scale-110 shadow-md',
                    isToday && !colorClass && 'ring-2 ring-primary/60',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs">
            {[
              { label: 'Bolos', color: 'bg-red-100 border-red-300' },
              { label: 'Sakit', color: 'bg-amber-100 border-amber-300' },
              { label: 'Izin', color: 'bg-blue-100 border-blue-300' },
              { label: 'Masuk', color: 'bg-white border-gray-300' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-gray-600">
                <span className={`inline-block h-3 w-3 rounded border ${item.color}`} />
                {item.label}
              </span>
            ))}
          </div>
        </Card>

        {/* Day Detail Panel */}
        {selectedDay && (
          <Card padding="lg" className="animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {formatDate(selectedDay.tanggal, 'full')}
                  </h3>
                  <div className="mt-1.5 flex gap-2">
                    {Array.from(
                      new Set(selectedDay.items.map((a) => a.kategori)),
                    ).map((kat) => {
                      const cfg = KATEGORI_CONFIG[kat.toLowerCase()] || KATEGORI_CONFIG.izin;
                      return (
                        <span
                          key={kat}
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset',
                            cfg.bg, cfg.text, cfg.ring,
                          )}
                        >
                          {kat.toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Jam Pelajaran
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Array.from({ length: JAM_COUNT }, (_, i) => i + 1).map(
                    (jam) => {
                      const match = selectedDay.items.find(
                        (a) => a.jamPelajaran === jam,
                      );
                      if (match) {
                        const kat = match.kategori.toLowerCase();
                        const cfg = KATEGORI_CONFIG[kat] || KATEGORI_CONFIG.izin;
                        return (
                          <span
                            key={jam}
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                              cfg.bg, cfg.text,
                            )}
                          >
                            {jam}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={jam}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium bg-gray-100 text-gray-300"
                        >
                          {jam}
                        </span>
                      );
                    },
                  )}
                </div>
              </div>

              {selectedDay.items[0].keterangan && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Keterangan
                  </span>
                  <p className="mt-1 text-sm text-gray-700">
                    {selectedDay.items[0].keterangan}
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {selectedDay.items[0].user?.nama || '-'}
                <span className="mx-1">&middot;</span>
                {selectedDay.items[0].createdAt
                  ? formatDate(selectedDay.items[0].createdAt, 'short')
                  : '-'}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={openEditModal}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={openDeleteConfirm}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Distribusi Kategori
            </h3>
            <p className="text-xs text-gray-400 mb-4">Ringkasan absensi berdasarkan kategori</p>
            {pieData().length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                Belum ada data absensi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value, percent }) =>
                      `${name} ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  >
                    {pieData().map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card padding="lg">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Tren Absensi
            </h3>
            <p className="text-xs text-gray-400 mb-4">Absensi per bulan (6 bulan terakhir)</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData()} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} allowDecimals={false} tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                />
                <Bar dataKey="bolos" name="Bolos" fill={PIE_COLORS.bolos} radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="sakit" name="Sakit" fill={PIE_COLORS.sakit} radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="izin" name="Izin" fill={PIE_COLORS.izin} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* History Table */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Riwayat Absensi</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {sortedHistory.length} entri tercatat
            </p>
          </div>
          {sortedHistory.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 mb-3">
                <svg className="h-7 w-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="22" rx="2" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Belum ada riwayat absensi</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="pl-5 pr-3 py-3">Tanggal</th>
                      <th className="px-3 py-3">Kategori</th>
                      <th className="px-3 py-3">Jam</th>
                      <th className="px-3 py-3">Keterangan</th>
                      <th className="px-3 pr-5 py-3">Dicatat Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedHistory.map((a) => {
                      const katCfg = KATEGORI_CONFIG[a.kategori.toLowerCase()] || KATEGORI_CONFIG.izin;
                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50/50 transition-colors duration-150"
                        >
                          <td className="pl-5 pr-3 py-2.5 text-gray-900 text-xs font-medium">
                            {formatDate(a.tanggal, 'short')}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset',
                              katCfg.bg, katCfg.text, katCfg.ring,
                            )}>
                              {a.kategori.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs">
                            {a.jamPelajaran}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[180px] truncate">
                            {a.keterangan || '-'}
                          </td>
                          <td className="px-3 pr-5 py-2.5 text-gray-400 text-xs">
                            {a.user?.nama || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                  <span className="text-xs font-medium text-gray-500">
                    Halaman {historyPage} dari {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Sebelumnya
                    </button>
                    <button
                      disabled={historyPage >= totalPages}
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Absensi"
      >
        <div className="space-y-4">
          <Select
            name="kategori"
            label="Kategori"
            value={editKategori}
            onChange={(e) => setEditKategori(e.target.value)}
            options={KATEGORI_OPTIONS}
          />

          <div>
            <span className="text-sm font-semibold text-gray-700">
              Jam Pelajaran
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: JAM_COUNT }, (_, i) => i + 1).map(
                (jam) => (
                  <Checkbox
                    key={jam}
                    checked={editJam.includes(jam)}
                    onChange={() => handleJamToggle(jam)}
                    label={`Jam ke-${jam}`}
                  />
                ),
              )}
            </div>
            <div className="mt-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={editSeharian}
                  onChange={(e) => handleSeharianToggle(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                <span className="ml-2 text-sm font-medium text-gray-600">Seharian penuh</span>
              </label>
            </div>
          </div>

          <Input
            name="keterangan"
            label="Keterangan"
            value={editKeterangan}
            onChange={(e) => setEditKeterangan(e.target.value)}
            placeholder="Tambahkan keterangan..."
          />

          <div className="flex justify-end gap-3 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              loading={editSaving}
              disabled={editSaving}
            >
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Absensi"
        message={`Apakah Anda yakin ingin menghapus semua data absensi pada tanggal ${deletingDate ? formatDate(deletingDate, 'full') : ''}?`}
        confirmLabel="Hapus"
        variant="danger"
      />
    </AuthLayout>
  );
}
