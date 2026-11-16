/* =========================================================
   app.js - inisialisasi Vue root
   Root memegang seluruh data (state) dan menjadi satu-satunya
   tempat data diubah. Komponen menerima data lewat props dan
   meminta perubahan lewat event (props turun, event naik).

   Isi file:
   1. Konstanta & fungsi bantu
   2. data      : tab aktif, state dari JSON, dialog, notifikasi
   3. computed  : nomor DO berikutnya, label tab
   4. methods   : pemuatan data + handler event dari komponen
   5. watch     : tab -> URL, simpan otomatis stok & tracking, tema
   6. created   : mulai memuat data dan template
   ========================================================= */

/* ---------- 1. Konstanta & fungsi bantu ---------- */
var DAFTAR_TAB = ['stok', 'tracking', 'order'];
var KUNCI_TEMA = 'sitta3-tema';

// Routing sederhana: tab dibaca dari hash URL (#stok, #tracking, #order)
function tabDariURL() {
  var hash = window.location.hash.replace('#', '');
  return DAFTAR_TAB.indexOf(hash) !== -1 ? hash : 'stok';
}

/* Tema dibaca langsung saat data dibuat, karena watcher tema
   (immediate: true) berjalan sebelum created(). */
function temaTersimpan() {
  try { return localStorage.getItem(KUNCI_TEMA) || 'light'; } catch (e) { return 'light'; }
}

/* ---------- 2. Instance Vue root ---------- */
var app = new Vue({
  el: '#app',

  data: {
    tab: tabDariURL(),
    status: 'memuat',          // 'memuat' | 'siap' | 'gagal'
    pesanGagal: '',
    dariFile: window.location.protocol === 'file:',
    state: {
      upbjjList: [],
      kategoriList: [],
      pengirimanList: [],
      paket: [],
      stok: [],
      tracking: []
    },
    tahun: new Date().getFullYear(),
    fokusDO: '',
    dialog: { show: false, judul: '', pesan: '', tombolYa: 'Ya', bahaya: false },
    notif: { tampil: false, teks: '', jenis: 'ok' },
    tema: temaTersimpan()
  },

  /* ---------- 3. Computed ---------- */
  computed: {
    jumlahReorder() {
      return this.state.stok.filter(function (s) { return s.qty < s.safety || s.qty === 0; }).length;
    },

    daftarTab() {
      return [
        { id: 'stok', label: 'Stok Bahan Ajar', pendek: 'Stok', ikon: '📚', jumlah: this.jumlahReorder, judulJumlah: 'perlu re-order' },
        { id: 'tracking', label: 'Tracking DO', pendek: 'Tracking', ikon: '🚚', jumlah: this.state.tracking.length, judulJumlah: 'DO tercatat' },
        { id: 'order', label: 'Pemesanan', pendek: 'Pesan', ikon: '📝', jumlah: 0, judulJumlah: '' }
      ];
    },

    /* Nomor DO berikutnya: "DO" + tahun berjalan + "-" + urutan 3 digit.
       Urutan = nomor terbesar pada tahun yang sama + 1, jadi DO pertama
       tahun ini DO2026-001, lalu DO2026-002, dan seterusnya. */
    nomorDOBerikut() {
      var awalan = 'DO' + this.tahun + '-';
      var maks = 0;
      this.state.tracking.forEach(function (d) {
        if (d.nomor.indexOf(awalan) === 0) {
          var urut = parseInt(d.nomor.slice(awalan.length), 10);
          if (urut > maks) maks = urut;
        }
      });
      return awalan + String(maks + 1).padStart(3, '0');
    }
  },

  /* ---------- 4. Methods ---------- */
  methods: {
    // Template komponen dan data JSON dimuat bersamaan
    muat() {
      var self = this;
      this.status = 'memuat';
      Promise.all([TemplateLoader.muat(), Api.muatState()])
        .then(function (hasil) {
          self.pasangState(hasil[1]);
          self.status = 'siap';
        })
        .catch(function (err) {
          self.pesanGagal = err.message;
          self.status = 'gagal';
        });
    },

    /* State diganti utuh (data awal / kembalikan data). Watcher simpan
       otomatis dilewati sekali agar data JSON tidak langsung ditulis
       ke localStorage padahal belum ada yang diubah. */
    pasangState(data) {
      var self = this;
      this.lewatiSimpan = true;
      this.state = data;
      this.$nextTick(function () { self.lewatiSimpan = false; });
    },

    gantiTab(id) {
      this.tab = id;
    },

    // --- handler event dari <ba-stock-table> ---
    handleSimpanStok(e) {
      if (e.mode === 'tambah') {
        this.state.stok.push(e.data);
        this.tampilNotif(e.data.judul + ' ditambahkan ke ' + e.data.upbjj + '.');
      } else {
        // splice agar penggantian elemen array terdeteksi Vue 2
        this.state.stok.splice(e.indeks, 1, e.data);
        this.tampilNotif('Data ' + e.data.kode + ' diperbarui.');
      }
    },

    handleUbahQty(e) {
      var item = this.state.stok[e.indeks];
      item.qty = e.qty;
      if (e.qty === 0) this.tampilNotif(item.judul + ' sekarang KOSONG.', 'error');
    },

    handleHapusStok(item) {
      var self = this;
      this.konfirmasi({
        judul: 'Hapus bahan ajar?',
        pesan: item.kode + ' – ' + item.judul + ' (' + item.upbjj + ') akan dihapus dari daftar stok. Tindakan ini tidak bisa dibatalkan.',
        tombolYa: 'Ya, hapus',
        bahaya: true
      }).then(function (ya) {
        if (!ya) return;
        var indeks = self.state.stok.indexOf(item);
        if (indeks !== -1) self.state.stok.splice(indeks, 1);
        self.tampilNotif(item.kode + ' dihapus dari daftar.');
      });
    },

    // --- handler event dari <order-form> ---
    handleNewDO(doBaru) {
      this.state.tracking.push(doBaru);
      this.tampilNotif(doBaru.nomor + ' atas nama ' + doBaru.nama + ' berhasil dibuat.');
      this.fokusDO = doBaru.nomor;
      this.tab = 'tracking';
    },

    // --- handler event dari <do-tracking> ---
    handleTambahProgres(e) {
      var d = this.state.tracking.find(function (t) { return t.nomor === e.nomor; });
      if (!d) return;
      d.perjalanan.push(e.entri);
      if (e.status) d.status = e.status;
      this.tampilNotif('Progres ' + e.nomor + ' ditambahkan' + (e.status ? ', status: ' + e.status : '') + '.');
    },

    /* Pop-up konfirmasi memakai <app-modal>. Mengembalikan Promise
       yang selesai dengan true (Ya) atau false (Batal / Esc). */
    konfirmasi(opsi) {
      var self = this;
      return new Promise(function (resolve) {
        self.penjawab = resolve;
        self.dialog = {
          show: true,
          judul: opsi.judul,
          pesan: opsi.pesan,
          tombolYa: opsi.tombolYa || 'Ya',
          bahaya: !!opsi.bahaya
        };
      });
    },

    // Tombol Ya / Batal, klik di luar kotak, atau Esc
    jawabDialog(ya) {
      this.dialog.show = false;
      if (this.penjawab) {
        this.penjawab(ya);
        this.penjawab = null;
      }
    },

    kembalikanDataAwal() {
      var self = this;
      this.konfirmasi({
        judul: 'Kembalikan data awal?',
        pesan: 'Semua perubahan stok dan DO baru akan dibuang, data kembali seperti dataBahanAjar.json.',
        tombolYa: 'Ya, kembalikan',
        bahaya: true
      }).then(function (ya) {
        if (!ya) return;
        Api.hapusSimpanan();
        Api.ambilData().then(function (data) {
          self.pasangState(data);
          self.fokusDO = '';
          self.tampilNotif('Data dikembalikan ke isi dataBahanAjar.json.');
        });
      });
    },

    tampilNotif(teks, jenis) {
      var self = this;
      this.notif = { tampil: true, teks: teks, jenis: jenis || 'ok' };
      clearTimeout(this.timerNotif);
      this.timerNotif = setTimeout(function () { self.notif.tampil = false; }, 3200);
    },

    gantiTema() {
      this.tema = this.tema === 'dark' ? 'light' : 'dark';
    },

    // Pintasan keyboard: Alt+1 / Alt+2 / Alt+3 untuk pindah tab
    tanganiPintasan(e) {
      if (!e.altKey || this.status !== 'siap') return;
      var nomor = parseInt(e.key, 10);
      if (nomor >= 1 && nomor <= DAFTAR_TAB.length) {
        e.preventDefault();
        this.tab = DAFTAR_TAB[nomor - 1];
      }
    },

    sinkronDariURL() {
      this.tab = tabDariURL();
    }
  },

  /* ---------- 5. Watchers ---------- */
  watch: {
    // (1) Tab aktif ditulis ke URL dan judul halaman, sehingga
    //     refresh atau tombol Back tetap di tab yang sama
    tab: {
      immediate: true,
      handler(baru) {
        if (window.location.hash !== '#' + baru) window.location.hash = baru;
        var label = { stok: 'Stok Bahan Ajar', tracking: 'Tracking DO', order: 'Pemesanan' }[baru];
        document.title = label + ' | SITTA Vue';
        window.scrollTo(0, 0);
      }
    },

    // (2) Setiap perubahan stok (tambah, edit, +/-, hapus) disimpan.
    //     deep: true karena yang berubah sering properti di dalam objek.
    'state.stok': {
      deep: true,
      handler(baru) {
        if (!this.lewatiSimpan) Api.simpan('stok', baru);
      }
    },

    // (3) DO baru dan progres perjalanan disimpan
    'state.tracking': {
      deep: true,
      handler(baru) {
        if (!this.lewatiSimpan) Api.simpan('tracking', baru);
      }
    },

    // (4) Tema: ubah atribut data-theme di <html> dan simpan pilihan
    tema: {
      immediate: true,
      handler(baru) {
        document.documentElement.setAttribute('data-theme', baru);
        try { localStorage.setItem(KUNCI_TEMA, baru); } catch (e) { /* abaikan */ }
      }
    }
  },

  /* ---------- 6. Lifecycle ---------- */
  created() {
    // properti tanpa reaktivitas, cukup disimpan di instance
    this.lewatiSimpan = false;
    this.penjawab = null;
    this.timerNotif = null;
    window.addEventListener('keydown', this.tanganiPintasan);
    window.addEventListener('hashchange', this.sinkronDariURL);
    this.muat();
  }
});
