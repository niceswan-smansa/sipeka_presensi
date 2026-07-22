export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(
  date: string | Date,
  format?: 'full' | 'short' | 'time',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  if (format === 'time') {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}, ${d.getDate()} ${bulan[d.getMonth()]}`;
  }

  const dayName = hari[d.getDay()];
  const day = d.getDate();
  const month = bulan[d.getMonth()];
  const year = d.getFullYear();

  if (format === 'short') {
    return `${day} ${month} ${year}`;
  }
  return `${dayName}, ${day} ${month} ${year}`;
}

export function getKategoriColor(kategori: string): 'danger' | 'warning' | 'info' | 'default' {
  switch (kategori.toLowerCase()) {
    case 'bolos':
    case 'alpa':
      return 'danger';
    case 'sakit':
      return 'warning';
    case 'izin':
      return 'info';
    default:
      return 'default';
  }
}
