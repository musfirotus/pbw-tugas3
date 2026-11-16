/* =========================================================
   api.js - data service
   Satu-satunya tempat yang tahu dari mana data berasal:
   file data/dataBahanAjar.json (dibaca dengan fetch) dan
   salinan perubahan di localStorage. Komponen tidak pernah
   memanggil fetch atau localStorage secara langsung.

   Fungsi publik:
   - Api.ambilData()     : baca JSON lalu rapikan bentuknya
   - Api.muatState()     : ambilData + timpa dengan data tersimpan
   - Api.simpan(nama, v) : simpan 'stok' / 'tracking' ke localStorage
   - Api.hapusSimpanan() : buang data tersimpan (kembali ke JSON)
   ========================================================= */
var Api = (function () {
  var URL_DATA = 'data/dataBahanAjar.json';
  var KUNCI = { stok: 'sitta3-stok', tracking: 'sitta3-tracking' };

  /* Di JSON, tracking berupa array berisi objek ber-key nomor DO:
       [ { "DO2025-0001": {...} }, { "DO2025-0001": {...} } ]
     dan entri DO2025-0001 tercatat dua kali. Bentuk ini diratakan
     menjadi array [{ nomor: "DO2025-0001", nim: ..., ... }] dan
     nomor yang dobel hanya diambil sekali. */
  function ratakanTracking(daftar) {
    var hasil = [];
    var sudahAda = {};
    (daftar || []).forEach(function (obj) {
      Object.keys(obj).forEach(function (nomor) {
        if (sudahAda[nomor]) return;
        sudahAda[nomor] = true;
        hasil.push(Object.assign({ nomor: nomor }, obj[nomor]));
      });
    });
    return hasil;
  }

  function ambilData() {
    return fetch(URL_DATA, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Gagal membaca ' + URL_DATA + ' (HTTP ' + res.status + ')');
        return res.json();
      })
      .then(function (json) {
        return {
          upbjjList: json.upbjjList || [],
          kategoriList: json.kategoriList || [],
          pengirimanList: json.pengirimanList || [],
          paket: json.paket || [],
          stok: json.stok || [],
          tracking: ratakanTracking(json.tracking)
        };
      });
  }

  function bacaLokal(nama) {
    try {
      var teks = localStorage.getItem(KUNCI[nama]);
      return teks ? JSON.parse(teks) : null;
    } catch (e) {
      return null; // storage diblokir atau isinya rusak
    }
  }

  // Data referensi (daftar UPBJJ, paket, dll.) selalu dari JSON;
  // hanya stok dan tracking yang bisa berubah lewat aplikasi.
  function muatState() {
    return ambilData().then(function (data) {
      var stok = bacaLokal('stok');
      var tracking = bacaLokal('tracking');
      if (Array.isArray(stok)) data.stok = stok;
      if (Array.isArray(tracking)) data.tracking = tracking;
      return data;
    });
  }

  function simpan(nama, nilai) {
    try {
      localStorage.setItem(KUNCI[nama], JSON.stringify(nilai));
      return true;
    } catch (e) {
      return false;
    }
  }

  function hapusSimpanan() {
    try {
      localStorage.removeItem(KUNCI.stok);
      localStorage.removeItem(KUNCI.tracking);
    } catch (e) { /* abaikan */ }
  }

  return {
    ambilData: ambilData,
    muatState: muatState,
    simpan: simpan,
    hapusSimpanan: hapusSimpanan
  };
})();
