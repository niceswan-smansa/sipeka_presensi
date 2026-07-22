export function validateLogin(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be an object');
    return { valid: false, errors };
  }

  if (!body.username || typeof body.username !== 'string' || body.username.trim().length < 3) {
    errors.push('Username minimal 3 karakter');
  }

  if (!body.password || typeof body.password !== 'string' || body.password.trim().length < 6) {
    errors.push('Password minimal 6 karakter');
  }

  return { valid: errors.length === 0, errors };
}

export function validateAbsensi(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be an object');
    return { valid: false, errors };
  }

  if (!body.siswaId || typeof body.siswaId !== 'number' || body.siswaId < 1) {
    errors.push('Siswa ID tidak valid');
  }

  if (!body.tanggal || typeof body.tanggal !== 'string' || isNaN(Date.parse(body.tanggal))) {
    errors.push('Tanggal tidak valid');
  }

  if (
    body.jamPelajaran === undefined ||
    body.jamPelajaran === null ||
    typeof body.jamPelajaran !== 'number' ||
    body.jamPelajaran < 1 ||
    body.jamPelajaran > 12
  ) {
    errors.push('Jam pelajaran harus antara 1-12');
  }

  const kategoriValid = ['izin', 'sakit', 'bolos', 'alpa', 'hadir', 'terlambat'];
  if (!body.kategori || typeof body.kategori !== 'string' || !kategoriValid.includes(body.kategori.toLowerCase())) {
    errors.push(`Kategori harus salah satu dari: ${kategoriValid.join(', ')}`);
  }

  if (body.keterangan !== undefined && body.keterangan !== null && body.keterangan !== '') {
    if (typeof body.keterangan !== 'string') {
      errors.push('Keterangan harus berupa string');
    } else if (body.keterangan.length > 255) {
      errors.push('Keterangan maksimal 255 karakter');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSiswa(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be an object');
    return { valid: false, errors };
  }

  if (!body.nis || typeof body.nis !== 'string' || body.nis.trim().length < 1) {
    errors.push('NIS wajib diisi');
  }

  if (!body.nisn || typeof body.nisn !== 'string' || body.nisn.trim().length < 1) {
    errors.push('NISN wajib diisi');
  }

  if (!body.nama || typeof body.nama !== 'string' || body.nama.trim().length < 1) {
    errors.push('Nama wajib diisi');
  }

  const jkValid = ['L', 'P', 'LAKI-LAKI', 'PEREMPUAN'];
  if (!body.jenisKelamin || typeof body.jenisKelamin !== 'string' || !jkValid.includes(body.jenisKelamin.toUpperCase())) {
    errors.push('Jenis kelamin tidak valid');
  }

  if (!body.kelasId || typeof body.kelasId !== 'number' || body.kelasId < 1) {
    errors.push('Kelas ID tidak valid');
  }

  return { valid: errors.length === 0, errors };
}

export function validateKelas(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Request body must be an object');
    return { valid: false, errors };
  }

  if (!body.nama || typeof body.nama !== 'string' || body.nama.trim().length < 1) {
    errors.push('Nama kelas wajib diisi');
  }

  if (
    body.angkatan === undefined ||
    body.angkatan === null ||
    typeof body.angkatan !== 'number' ||
    body.angkatan < 10 ||
    body.angkatan > 12
  ) {
    errors.push('Angkatan harus 10, 11, atau 12');
  }

  if (body.waliKelas !== undefined && body.waliKelas !== null && body.waliKelas !== '') {
    if (typeof body.waliKelas !== 'string') {
      errors.push('Wali kelas harus berupa string');
    }
  }

  return { valid: errors.length === 0, errors };
}
