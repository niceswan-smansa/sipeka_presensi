'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
} from 'date-fns';
import { id } from 'date-fns/locale';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Spinner from '@/components/ui/Spinner';
import AuthLayout from '@/components/layout/AuthLayout';
import { toast } from '@/hooks/useToast';
import { SiswaWithKelas } from '@/types';

interface Kelas {
  id: number;
  nama: string;
  angkatan: number;
}

interface SelectedData {
  kategori: string;
  jamPelajaran: number[];
  keterangan: string;
}

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const ANGKATAN_CONFIG: Record<number, { label: string; gradient: string; border: string; badge: string }> = {
  10: { label: 'Kelas 10', gradient: 'from-emerald-50 to-teal-50', border: 'border-emerald-200 data-[selected]:border-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  11: { label: 'Kelas 11', gradient: 'from-blue-50 to-indigo-50', border: 'border-blue-200 data-[selected]:border-blue-500', badge: 'bg-blue-100 text-blue-700' },
  12: { label: 'Kelas 12', gradient: 'from-purple-50 to-violet-50', border: 'border-purple-200 data-[selected]:border-purple-500', badge: 'bg-purple-100 text-purple-700' },
};

export default function InputAbsensiPage() {
  const router = useRouter();

  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [angkatan, setAngkatan] = useState<number | null>(null);
  const [kelasId, setKelasId] = useState<number | null>(null);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaWithKelas[]>([]);
  const [selectedSiswa, setSelectedSiswa] = useState<
    Map<number, SelectedData>
  >(new Map());
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'pilih' | 'isi'>('pilih');
  const [loadingKelas, setLoadingKelas] = useState(false);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  // ── Calendar helpers ──────────────────────────────────────────

  const buildCalendarGrid = () => {
    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    const daysInMonth = lastDay.getDate();
    const startDow = getDay(firstDay);
    const offset = startDow === 0 ? 6 : startDow - 1;

    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  };

  const handleDayClick = (day: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setTanggal(`${y}-${m}-${d}`);
  };

  const isSelectedDate = (day: number | null) => {
    if (day === null) return false;
    const parts = tanggal.split('-').map(Number);
    const selYear = parts[0];
    const selMonth = parts[1];
    const selDay = parts[2];
    return (
      selYear === currentMonth.getFullYear() &&
      selMonth === currentMonth.getMonth() + 1 &&
      selDay === day
    );
  };

  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return (
      today.getFullYear() === currentMonth.getFullYear() &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getDate() === day
    );
  };

  // ── Fetch kelas when angkatan changes ─────────────────────────

  useEffect(() => {
    if (angkatan === null) {
      setKelasList([]);
      setKelasId(null);
      return;
    }
    const fetchKelas = async () => {
      setLoadingKelas(true);
      try {
        const res = await fetch(`/api/kelas?angkatan=${angkatan}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Gagal memuat kelas');
        const data = await res.json();
        setKelasList(data.data);
        setKelasId(null);
      } catch {
        toast.error('Gagal memuat daftar kelas');
      } finally {
        setLoadingKelas(false);
      }
    };
    fetchKelas();
  }, [angkatan]);

  // ── Fetch siswa when kelas changes ────────────────────────────

  useEffect(() => {
    if (kelasId === null) {
      setSiswaList([]);
      return;
    }
    const fetchSiswa = async () => {
      setLoadingSiswa(true);
      try {
        const res = await fetch(`/api/siswa?kelasId=${kelasId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Gagal memuat siswa');
        const data = await res.json();
        setSiswaList(data.data);
      } catch {
        toast.error('Gagal memuat daftar siswa');
      } finally {
        setLoadingSiswa(false);
      }
    };
    fetchSiswa();
  }, [kelasId]);

  // ── Selection helpers ─────────────────────────────────────────

  const handleToggleSiswa = (siswaId: number) => {
    setSelectedSiswa((prev) => {
      const next = new Map(prev);
      if (next.has(siswaId)) {
        next.delete(siswaId);
      } else {
        next.set(siswaId, { kategori: '', jamPelajaran: [], keterangan: '' });
      }
      return next;
    });
  };

  const selectAll = () => {
    const next = new Map<number, SelectedData>();
    siswaList.forEach((s) => {
      const existing = selectedSiswa.get(s.id);
      next.set(s.id, existing ?? { kategori: '', jamPelajaran: [], keterangan: '' });
    });
    setSelectedSiswa(next);
  };

  const deselectAll = () => {
    setSelectedSiswa(new Map());
  };

  const allSelected =
    siswaList.length > 0 && selectedSiswa.size === siswaList.length;

  // ── Update individual selected student fields ─────────────────

  const updateSelected = (
    siswaId: number,
    patch: Partial<SelectedData>,
  ) => {
    setSelectedSiswa((prev) => {
      const next = new Map(prev);
      const current = next.get(siswaId);
      if (current) {
        next.set(siswaId, { ...current, ...patch });
      }
      return next;
    });
  };

  const toggleJam = (siswaId: number, jam: number) => {
    setSelectedSiswa((prev) => {
      const next = new Map(prev);
      const current = next.get(siswaId);
      if (!current) return next;
      const jamPelajaran = current.jamPelajaran.includes(jam)
        ? current.jamPelajaran.filter((j) => j !== jam)
        : [...current.jamPelajaran, jam];
      next.set(siswaId, { ...current, jamPelajaran });
      return next;
    });
  };

  const toggleSeharian = (siswaId: number) => {
    setSelectedSiswa((prev) => {
      const next = new Map(prev);
      const current = next.get(siswaId);
      if (!current) return next;
      const isFull = current.jamPelajaran.length === 10;
      next.set(siswaId, {
        ...current,
        jamPelajaran: isFull
          ? []
          : Array.from({ length: 10 }, (_, i) => i + 1),
      });
      return next;
    });
  };

  // ── Navigation ────────────────────────────────────────────────

  const handleLanjut = () => {
    if (!angkatan || !kelasId) return;
    setStep('isi');
  };

  const handleKembali = () => {
    setStep('pilih');
  };

  // ── Save ──────────────────────────────────────────────────────

  const handleSave = async () => {
    const selected = Array.from(selectedSiswa.entries());
    if (selected.length === 0) {
      toast.error('Pilih minimal satu siswa');
      return;
    }

    for (const [, data] of selected) {
      if (!data.kategori) {
        toast.error('Pilih kategori untuk setiap siswa yang dipilih');
        return;
      }
      if (data.jamPelajaran.length === 0) {
        toast.error('Pilih jam pelajaran untuk setiap siswa yang dipilih');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = selected.flatMap(([siswaId, data]) =>
        data.jamPelajaran.map((jam) => ({
          siswaId,
          tanggal,
          jamPelajaran: jam,
          kategori: data.kategori,
          keterangan: data.keterangan,
        })),
      );

      const res = await fetch('/api/absensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Gagal menyimpan data');
      }

      toast.success('Data absensi berhasil disimpan');
      router.push('/dashboard');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Gagal menyimpan data',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Calendar weeks ────────────────────────────────────────────

  const weeks = buildCalendarGrid();

  // ── Render ────────────────────────────────────────────────────

  return (
    <AuthLayout title="Input Absensi">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ── Step: Pilih ─────────────────────────────────── */}
        {step === 'pilih' && (
          <>
            {/* Calendar */}
            <Card padding="lg">
              <div className="mb-1">
                <h2 className="text-sm font-semibold text-gray-700">
                  Pilih Tanggal
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tentukan tanggal untuk pencatatan absensi
                </p>
              </div>

              <div className="mt-4 mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-base font-bold text-gray-900">
                  {MONTH_NAMES[currentMonth.getMonth()]}{' '}
                  {currentMonth.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {d}
                  </div>
                ))}
                {weeks.map((week, wi) =>
                  week.map((day, di) => {
                    const selected = isSelectedDate(day);
                    const today = isToday(day);
                    return (
                      <div key={`${wi}-${di}`} className="aspect-square p-0.5">
                        {day !== null ? (
                          <button
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`flex h-full w-full items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 ${
                              selected
                                ? 'bg-gradient-to-br from-primary to-primary-light text-white shadow-md shadow-primary/30 scale-105'
                                : today
                                  ? 'text-primary ring-2 ring-primary/60 hover:bg-primary/5'
                                  : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {day}
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  }),
                )}
              </div>

              <p className="mt-4 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-xl py-2">
                {format(new Date(tanggal), 'EEEE, d MMMM yyyy', { locale: id })}
              </p>
            </Card>

            {/* Angkatan */}
            <Card padding="lg">
              <div className="mb-1">
                <h2 className="text-sm font-semibold text-gray-700">
                  Pilih Angkatan
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pilih tingkat kelas yang akan diabsen
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[10, 11, 12].map((a) => {
                  const config = ANGKATAN_CONFIG[a];
                  const isSelected = angkatan === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAngkatan(a)}
                      className={`rounded-2xl border-2 px-4 py-7 text-center transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-br ${config.gradient} border-current shadow-lg ring-2 ring-offset-1 ${
                              a === 10 ? 'ring-emerald-400 border-emerald-400' :
                              a === 11 ? 'ring-blue-400 border-blue-400' :
                              'ring-purple-400 border-purple-400'
                            }`
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${config.badge}`}>
                        Angkatan
                      </span>
                      <p className={`mt-2 text-xl font-bold ${
                        isSelected
                          ? a === 10 ? 'text-emerald-700' : a === 11 ? 'text-blue-700' : 'text-purple-700'
                          : 'text-gray-700'
                      }`}>
                        {a}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Kelas List */}
            {angkatan !== null && (
              <Card padding="lg">
                <div className="mb-1">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Pilih Kelas
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Pilih kelas spesifik untuk menampilkan daftar siswa
                  </p>
                </div>
                {loadingKelas ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : kelasList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">
                    Tidak ada kelas untuk angkatan ini.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {kelasList.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setKelasId(k.id)}
                        className={`rounded-full border-2 px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                          kelasId === k.id
                            ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {k.nama}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Lanjut */}
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={!tanggal || !angkatan || !kelasId}
              onClick={handleLanjut}
            >
              Lanjut ke Pengisian
            </Button>
          </>
        )}

        {/* ── Step: Isi ──────────────────────────────────── */}
        {step === 'isi' && (
          <>
            {loadingSiswa ? (
              <div className="flex justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : siswaList.length === 0 ? (
              <Card padding="lg">
                <p className="py-8 text-center text-sm text-gray-500">
                  Tidak ada siswa di kelas ini.
                </p>
                <div className="text-center">
                  <Button variant="secondary" onClick={handleKembali}>
                    Kembali
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Student selection list */}
                <Card padding="lg">
                  <div className="mb-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-gray-700">
                        Daftar Siswa
                      </h2>
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                        {siswaList.length} siswa
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Centang siswa yang akan dicatat absensinya
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {allSelected ? (
                      <Button variant="secondary" size="sm" onClick={deselectAll}>
                        Hapus Centang
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={selectAll}>
                        Centang Semua
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                          <th className="w-12 pb-3 pt-3 pl-4" />
                          <th className="w-10 pb-3 pt-3">No</th>
                          <th className="pb-3 pt-3">Nama</th>
                          <th className="pb-3 pt-3 pr-4">NIS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {siswaList.map((siswa, idx) => (
                          <tr
                            key={siswa.id}
                            className={`border-b border-gray-50 last:border-0 transition-colors ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                            } ${selectedSiswa.has(siswa.id) ? 'bg-blue-50/30' : ''}`}
                          >
                            <td className="py-2.5 pl-4">
                              <Checkbox
                                checked={selectedSiswa.has(siswa.id)}
                                onChange={() => handleToggleSiswa(siswa.id)}
                              />
                            </td>
                            <td className="py-2.5 text-gray-400">{idx + 1}</td>
                            <td className="py-2.5 font-medium text-gray-900">
                              {siswa.nama}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500">{siswa.nis}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs font-medium text-gray-500">
                    {selectedSiswa.size} siswa dipilih
                  </p>
                </Card>

                {/* Selected students detail forms */}
                {Array.from(selectedSiswa.entries()).map(
                  ([siswaId, data]) => {
                    const siswa = siswaList.find((s) => s.id === siswaId);
                    if (!siswa) return null;

                    const isSeharian = data.jamPelajaran.length === 10;

                    return (
                      <Card key={siswaId} padding="lg" className="!bg-blue-50/30 !border-blue-100">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {siswa.nama.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">
                              {siswa.nama}
                            </h3>
                            <p className="text-xs text-gray-500">{siswa.nis}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Kategori */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Kategori <span className="text-red-500">*</span>
                            </label>
                            <Select
                              name={`kategori-${siswaId}`}
                              value={data.kategori}
                              onChange={(e) =>
                                updateSelected(siswaId, {
                                  kategori: e.target.value,
                                })
                              }
                              placeholder="Pilih kategori"
                              options={[
                                { value: 'izin', label: 'Izin' },
                                { value: 'sakit', label: 'Sakit' },
                                { value: 'bolos', label: 'Bolos' },
                              ]}
                            />
                          </div>

                          {/* Jam Pelajaran */}
                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Jam Pelajaran <span className="text-red-500">*</span>
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={isSeharian}
                                  onChange={() => toggleSeharian(siswaId)}
                                />
                                <span className="text-xs font-medium text-gray-500 mr-2">
                                  Seharian
                                </span>
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: 10 }, (_, i) => i + 1).map(
                                (jam) => (
                                  <label
                                    key={jam}
                                    className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150 ${
                                      data.jamPelajaran.includes(jam)
                                        ? 'bg-gradient-to-br from-primary to-primary-light text-white shadow-md shadow-primary/20 scale-105'
                                        : 'border-2 border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={data.jamPelajaran.includes(jam)}
                                      onChange={() =>
                                        toggleJam(siswaId, jam)
                                      }
                                    />
                                    {jam}
                                  </label>
                                ),
                              )}
                            </div>
                          </div>

                          {/* Keterangan */}
                          <Input
                            label="Keterangan"
                            name={`keterangan-${siswaId}`}
                            value={data.keterangan}
                            onChange={(e) =>
                              updateSelected(siswaId, {
                                keterangan: e.target.value,
                              })
                            }
                            placeholder="Contoh: Sakit demam"
                          />
                        </div>
                      </Card>
                    );
                  },
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={handleKembali}
                  >
                    Kembali
                  </Button>
                  <Button
                    variant="gradient"
                    size="lg"
                    className="flex-1"
                    loading={saving}
                    disabled={saving}
                    onClick={handleSave}
                  >
                    Simpan Data
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
}
