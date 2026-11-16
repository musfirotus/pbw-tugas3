/* =========================================================
   filters.js - filter global Vue untuk memformat teks
   Filter hanya mengubah tampilan di layar. Nilai di data
   tetap angka/teks mentah, jadi sort dan hitungan tidak
   terganggu. Dipakai di template dengan tanda pipa:
     {{ item.harga | rupiah }}         -> Rp 65.000
     {{ item.qty | satuan('buah') }}   -> 28 buah
     {{ d.tanggalKirim | tanggalIndo }} -> 25 Agustus 2025

   Isi file:
   1. Format : fungsi bantu tanggal/waktu lokal
   2. Vue.filter : rupiah, satuan, tanggalIndo, waktuIndo, inisial
   ========================================================= */

/* ---------- 1. Fungsi bantu tanggal ---------- */
var Format = {
  NAMA_BULAN: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
               'Agustus', 'September', 'Oktober', 'November', 'Desember'],

  duaDigit: function (n) {
    return String(n).padStart(2, '0');
  },

  /* Tanggal lokal YYYY-MM-DD. Tidak memakai toISOString() karena
     hasilnya UTC: pukul 00.00-07.00 WIB tanggalnya mundur sehari. */
  tanggalLokal: function (d) {
    return d.getFullYear() + '-' + Format.duaDigit(d.getMonth() + 1) + '-' + Format.duaDigit(d.getDate());
  },

  // "YYYY-MM-DD HH:mm:ss", sama dengan bentuk "waktu" di dataBahanAjar.json
  waktuLokal: function (d) {
    return Format.tanggalLokal(d) + ' ' + Format.duaDigit(d.getHours()) + ':' +
           Format.duaDigit(d.getMinutes()) + ':' + Format.duaDigit(d.getSeconds());
  }
};

/* ---------- 2. Filter global ---------- */

// 65000 -> "Rp 65.000"
Vue.filter('rupiah', function (angka) {
  if (angka === null || angka === undefined || angka === '' || isNaN(angka)) return '-';
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
});

// 28 -> "28 buah". Argumen kedua boleh diganti, misal satuan('eksemplar')
Vue.filter('satuan', function (n, unit) {
  if (n === null || n === undefined || n === '') return '-';
  return Number(n).toLocaleString('id-ID') + ' ' + (unit || 'buah');
});

// "2025-08-25" -> "25 Agustus 2025" (memakai split, seperti contoh filter di materi)
Vue.filter('tanggalIndo', function (teks) {
  if (!teks) return '-';
  var b = String(teks).split('-');
  if (b.length !== 3) return teks;
  return parseInt(b[2], 10) + ' ' + Format.NAMA_BULAN[parseInt(b[1], 10) - 1] + ' ' + b[0];
});

// "2025-08-25 10:12:20" -> "25 Agustus 2025, 10.12"
Vue.filter('waktuIndo', function (teks) {
  if (!teks) return '-';
  var bagian = String(teks).split(' ');
  var jam = (bagian[1] || '').slice(0, 5).replace(':', '.');
  return Vue.filter('tanggalIndo')(bagian[0]) + (jam ? ', ' + jam : '');
});

// "Rina Wulandari" -> "RW" untuk avatar (split + charAt + toUpperCase)
Vue.filter('inisial', function (nama) {
  return String(nama || '?').trim().split(/\s+/).slice(0, 2)
    .map(function (kata) { return kata.charAt(0).toUpperCase(); })
    .join('');
});
