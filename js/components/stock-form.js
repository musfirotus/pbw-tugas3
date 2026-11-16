/* =========================================================
   stock-form.js  ->  <ba-stock-form>
   Template: templates/stock-form.html (#tpl-stock-form)

   Formulir kecil untuk menambah (create) dan memperbarui
   (update) bahan ajar. Komponen ini hanya memvalidasi dan
   mengirim hasilnya lewat event; yang menyimpan ke daftar
   stok adalah root (app.js).

   Props : mode ('tambah' | 'edit'), nilai-awal, items,
           upbjj-list, kategori-list
   Event : simpan (data bahan ajar yang sudah bersih), batal
   Keyboard: Enter di isian mana pun = simpan
   ========================================================= */
function formStokKosong() {
  return {
    kode: '', judul: '', kategori: '', upbjj: '', lokasiRak: '',
    harga: null, qty: null, safety: null, catatanHTML: ''
  };
}

function bilanganBulat(n) {
  return typeof n === 'number' && Number.isInteger(n);
}

/* Catatan ditampilkan dengan v-html, jadi isian pengguna harus
   dibersihkan dulu agar tidak bisa menyisipkan script (XSS).
   Semua karakter HTML di-escape, lalu hanya tag format
   sederhana tanpa atribut yang dikembalikan. */
function bersihkanHTML(teks) {
  var aman = String(teks || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return aman.replace(/&lt;(\/?)(em|strong|i|u|b)&gt;/gi, '<$1$2>');
}

Vue.component('ba-stock-form', {
  template: '#tpl-stock-form',

  props: {
    mode: { type: String, default: 'tambah' },
    nilaiAwal: { type: Object, default: null },
    indeksEdit: { type: Number, default: -1 },
    items: { type: Array, required: true },
    upbjjList: { type: Array, required: true },
    kategoriList: { type: Array, required: true }
  },

  // data() berupa fungsi: setiap form punya salinan isiannya sendiri
  data: function () {
    return {
      form: Object.assign(formStokKosong(), this.nilaiAwal || {}),
      catatanAsli: this.nilaiAwal ? this.nilaiAwal.catatanHTML : '',
      tersentuh: {},
      sudahDicoba: false
    };
  },

  computed: {
    // Aturan validasi. Objek kosong = form valid.
    galat() {
      var f = this.form;
      var g = {};
      var kode = (f.kode || '').trim();
      var indeksEdit = this.indeksEdit;

      if (!kode) g.kode = 'Kode mata kuliah wajib diisi.';
      else if (!/^[A-Z]{3,5}\d{4}$/.test(kode)) g.kode = 'Format: 3-5 huruf lalu 4 angka, contoh EKMA4116.';
      else if (f.upbjj && this.items.some(function (s, i) {
        return i !== indeksEdit && s.kode === kode && s.upbjj === f.upbjj;
      })) g.kode = 'Kode ' + kode + ' sudah tercatat di UT-Daerah ' + f.upbjj + '.';

      var judul = (f.judul || '').trim();
      if (!judul) g.judul = 'Judul mata kuliah wajib diisi.';
      else if (judul.length < 3) g.judul = 'Judul minimal 3 karakter.';

      if (!f.kategori) g.kategori = 'Pilih kategori mata kuliah.';
      if (!f.upbjj) g.upbjj = 'Pilih UT-Daerah.';

      var rak = (f.lokasiRak || '').trim();
      if (!rak) g.lokasiRak = 'Lokasi rak wajib diisi.';
      else if (!/^R\d{1,2}-[A-Z]\d{1,2}$/i.test(rak)) g.lokasiRak = 'Format rak: R<angka>-<huruf><angka>, contoh R1-A3.';

      if (f.harga === null || f.harga === '') g.harga = 'Harga wajib diisi.';
      else if (!bilanganBulat(f.harga) || f.harga < 1000) g.harga = 'Harga berupa bilangan bulat minimal 1.000.';
      else if (f.harga > 10000000) g.harga = 'Harga maksimal Rp 10.000.000.';

      if (f.qty === null || f.qty === '') g.qty = 'Jumlah stok wajib diisi.';
      else if (!bilanganBulat(f.qty) || f.qty < 0) g.qty = 'Stok berupa bilangan bulat 0 atau lebih.';
      else if (f.qty > 100000) g.qty = 'Stok maksimal 100.000.';

      if (f.safety === null || f.safety === '') g.safety = 'Safety stock wajib diisi.';
      else if (!bilanganBulat(f.safety) || f.safety < 1) g.safety = 'Safety stock berupa bilangan bulat minimal 1.';

      if ((f.catatanHTML || '').length > 200) g.catatanHTML = 'Catatan maksimal 200 karakter.';
      return g;
    },

    jumlahGalat() {
      return Object.keys(this.galat).length;
    },

    // Status yang akan didapat setelah disimpan (pratinjau)
    statusPratinjau() {
      var f = this.form;
      if (!bilanganBulat(f.qty) || !bilanganBulat(f.safety)) return '';
      if (f.qty === 0) return 'kosong';
      if (f.qty < f.safety) return 'menipis';
      return 'aman';
    },

    pratinjauCatatan() {
      return bersihkanHTML(this.form.catatanHTML);
    }
  },

  methods: {
    tandai(kolom) {
      this.$set(this.tersentuh, kolom, true);
    },

    // Pesan error baru muncul setelah kolom ditinggalkan atau Simpan ditekan
    pesanGalat(kolom) {
      if (this.tersentuh[kolom] || this.sudahDicoba) return this.galat[kolom] || '';
      return '';
    },

    /* @keydown.enter di <form>: Enter di input mana pun langsung
       menyimpan. Kalau fokus sedang di tombol (misal "Batal"),
       Enter dibiarkan menjalankan tombol itu. */
    tekanEnter(e) {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      this.kirim();
    },

    kirim() {
      this.sudahDicoba = true;
      if (this.jumlahGalat > 0) {
        var pertama = Object.keys(this.galat)[0];
        var el = this.$el.querySelector('#sf-' + pertama);
        if (el) el.focus();
        this.$emit('notif', 'Masih ada ' + this.jumlahGalat + ' isian yang perlu diperbaiki.', 'error');
        return;
      }

      var f = this.form;
      this.$emit('simpan', {
        kode: f.kode.trim(),
        judul: f.judul.trim(),
        kategori: f.kategori,
        upbjj: f.upbjj,
        lokasiRak: f.lokasiRak.trim().toUpperCase(),
        harga: f.harga,
        qty: f.qty,
        safety: f.safety,
        // catatan lama dari JSON dipertahankan; yang diketik ulang dibersihkan
        catatanHTML: f.catatanHTML === this.catatanAsli ? f.catatanHTML : bersihkanHTML(f.catatanHTML)
      });
    }
  },

  watch: {
    // Kode otomatis huruf kapital tanpa spasi saat diketik ("ekma 4116" -> "EKMA4116")
    'form.kode'(baru) {
      var bersih = (baru || '').toUpperCase().replace(/\s+/g, '');
      if (bersih !== baru) this.form.kode = bersih;
    }
  }
});
