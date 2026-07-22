export interface SiswaWithKelas {
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

export interface AbsensiWithRelations {
  id: number;
  siswaId: number;
  siswa: {
    nama: string;
    nis: string;
  };
  tanggal: Date;
  jamPelajaran: number;
  kategori: string;
  keterangan: string | null;
  user: {
    nama: string;
  };
  createdAt: Date;
}

export interface DayDetail {
  tanggal: string;
  items: AbsensiWithRelations[];
}

export interface StatKategori {
  kategori: string;
  count: number;
  color: string;
}

export interface StatBulan {
  bulan: string;
  count: number;
}
