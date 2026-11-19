#!/usr/bin/env bash
# Membuat tag versi v0.1.0 - v0.5.0 pada riwayat yang sudah ada.
# Jalankan sekali dari root repo (Git Bash / terminal), dengan identitas git kamu sendiri.
# Lihat docs/catatan/panduan-commit-dan-tag.md bagian 3.
set -euo pipefail

buat_tag() {
  local tag="$1" commit="$2" pesan="$3"
  if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    echo "Lewati $tag: sudah ada"
    return
  fi
  git tag -a "$tag" "$commit" -m "$pesan"
  echo "Dibuat $tag di $commit"
}

buat_tag v0.1.0 228930b "v0.1.0: fondasi HRIS

- feat(absensi): absen selfie, GPS dan geofence toko, deteksi perangkat
- feat(cuti): pengajuan izin dan cuti dengan approval HRD
- feat(notifikasi): notifikasi in-app dan web push
- feat(rekap): rekap absensi bulanan dan cetak PDF
- feat(karyawan): manajemen karyawan dan log absensi HRD"

buat_tag v0.2.0 b20727c "v0.2.0: broadcast dan pengingat shift

- feat(broadcast): pengumuman dengan filter penerima
- feat(cron): pengingat shift otomatis"

buat_tag v0.3.0 2e949eb "v0.3.0: payroll, lembur dan peta absensi

- feat(payroll): konfigurasi gaji, generate dan cetak slip gaji
- feat(lembur): pengajuan dan approval lembur
- feat(absensi): peta lokasi absensi untuk HRD"

buat_tag v0.4.0 ea26eb9 "v0.4.0: migrasi database ke MariaDB

- refactor(db): pindah dari Supabase PostgreSQL ke Hostinger MariaDB
- build: build next memakai webpack"

buat_tag v0.5.0 5cf4b86 "v0.5.0: role HRIS dari SSO App Access

- feat(auth): role HRIS ditentukan di satu tempat dari SSO App Access
- fix(cuti): karyawan bisa upload surat sakit sendiri, uploadSickNote dijaga
- fix(dashboard): dashboard HRD tidak hilang dari client manifest"

echo
git tag -l -n1 'v0.*'
echo
echo "Periksa daftar di atas, lalu kirim ke GitHub dengan:"
echo "  git push origin v0.1.0 v0.2.0 v0.3.0 v0.4.0 v0.5.0"
