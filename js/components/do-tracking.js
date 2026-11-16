/* =========================================================
   do-tracking.js  ->  <do-tracking>
   Template: templates/do-tracking.html (#tpl-tracking)

   Halaman Tracking Delivery Order: pencarian berdasarkan
   nomor DO atau NIM, detail pengiriman, riwayat perjalanan,
   dan form kecil untuk menambah progres perjalanan.

   Props : data (array tracking), paket, stok, fokus (nomor DO
           yang perlu langsung ditampilkan, dikirim root setelah
           DO baru dibuat)
   Event : tambah-progres { nomor, entri, status }, notif
   Keyboard: Enter = cari, Esc = kosongkan pencarian,
             Enter di kolom keterangan = tambah progres

   Isi file:
   1. data      : state pencarian, DO terpilih, form progres
   2. computed  : daftar DO, DO terpilih, tahap status, detail
   3. methods   : cari, reset, pilih, tambah progres
   4. watch     : mode cari, isi kata kunci, fokus dari root
   5. lifecycle : jam berjalan untuk kolom "waktu"
   ========================================================= */
Vue.component('do-tracking', {
  template: '#tpl-tracking',

  props: {
    data: { type: Array, required: true },
    paket: { type: Array, required: true },
    stok: { type: Array, required: true },
    fokus: { type: String, default: '' }
  },

  /* ---------- 1. Data ---------- */
  data: function () {
    return {
      mode: 'nomor',          // 'nomor' | 'nim'
      kataKunci: '',
      galat: '',
      sudahCari: false,
      hasil: [],              // nomor DO yang cocok
      terpilih: '',           // nomor DO yang sedang dibuka
      tahapStatus: ['Diproses', 'Dalam Perjalanan', 'Terkirim'],
      progres: { keterangan: '', status: '', galat: '' },
      sekarang: new Date()
    };
  },

  /* ---------- 2. Computed ---------- */
  computed: {
    // DO terbaru di atas
    daftarDO() {
      return this.data.slice().sort(function (a, b) {
        return b.nomor.localeCompare(a.nomor);
      });
    },

    hasilDO() {
      var data = this.data;
      return this.hasil
        .map(function (no) { return data.find(function (d) { return d.nomor === no; }); })
        .filter(Boolean);
    },

    doTerpilih() {
      var no = this.terpilih;
      return this.data.find(function (d) { return d.nomor === no; }) || null;
    },

    paketTerpilih() {
      if (!this.doTerpilih) return null;
      var kode = this.doTerpilih.paket;
      return this.paket.find(function (p) { return p.kode === kode; }) || null;
    },

    // Objek label -> nilai. Di template di-loop dengan
    // v-for="(nilai, label) in detailDO" (name-based index)
    detailDO() {
      var d = this.doTerpilih;
      if (!d) return {};
      return {
        'Ekspedisi': d.ekspedisi,
        'Tanggal kirim': Vue.filter('tanggalIndo')(d.tanggalKirim),
        'Kode paket': d.paket,
        'Total harga': Vue.filter('rupiah')(d.total)
      };
    },

    indeksStatus() {
      if (!this.doTerpilih) return -1;
      return this.tahapStatus.indexOf(this.doTerpilih.status);
    },

    persenProgres() {
      if (this.indeksStatus < 0) return 0;
      return Math.round(this.indeksStatus / (this.tahapStatus.length - 1) * 100);
    },

    // Pilihan status hanya tahap sesudah status sekarang (tidak bisa mundur)
    statusLanjutan() {
      return this.tahapStatus.slice(this.indeksStatus + 1);
    },

    waktuSekarang() {
      return Format.waktuLokal(this.sekarang);
    },

    placeholderCari() {
      return this.mode === 'nomor' ? 'contoh: DO2025-0001' : 'contoh: 123456789';
    }
  },

  /* ---------- 3. Methods ---------- */
  methods: {
    // @keyup.enter pada kolom cari, atau klik tombol Cari
    cari() {
      var kata = this.kataKunci.trim();
      var cocok;
      this.galat = '';

      if (!kata) {
        this.galat = this.mode === 'nomor' ? 'Masukkan nomor DO terlebih dahulu.' : 'Masukkan NIM terlebih dahulu.';
        return;
      }

      if (this.mode === 'nim') {
        if (!/^\d{9}$/.test(kata)) {
          this.galat = 'NIM terdiri dari 9 angka (saat ini ' + kata.length + ').';
          return;
        }
        cocok = this.data.filter(function (d) { return d.nim === kata; });
      } else {
        // nomor persis dulu; kalau tidak ada, cari yang mengandung kata kunci
        cocok = this.data.filter(function (d) { return d.nomor === kata; });
        if (cocok.length === 0) {
          cocok = this.data.filter(function (d) { return d.nomor.indexOf(kata) !== -1; });
        }
      }

      this.sudahCari = true;
      this.hasil = cocok.map(function (d) { return d.nomor; });
      this.terpilih = cocok.length === 1 ? cocok[0].nomor : '';

      if (cocok.length === 0) {
        this.galat = (this.mode === 'nomor' ? 'Nomor DO "' + kata + '"' : 'NIM ' + kata) + ' tidak ditemukan.';
      }
    },

    // @keyup.esc pada kolom cari, atau klik tombol Reset
    reset() {
      this.kataKunci = '';
      this.galat = '';
      this.sudahCari = false;
      this.hasil = [];
      this.terpilih = '';
      if (this.$refs.inputCari) this.$refs.inputCari.focus();
    },

    pilih(nomor) {
      this.terpilih = nomor;
      this.progres = { keterangan: '', status: '', galat: '' };
      var self = this;
      this.$nextTick(function () {
        if (self.$refs.detail) self.$refs.detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    tutupDetail() {
      this.terpilih = '';
    },

    judulMK(kode) {
      var item = this.stok.find(function (s) { return s.kode === kode; });
      return item ? item.judul : '(judul belum terdaftar)';
    },

    // Waktu diambil dari jam lokal komputer saat tombol ditekan
    tambahProgres() {
      var p = this.progres;
      var ket = p.keterangan.trim();
      if (ket.length < 5) {
        p.galat = 'Keterangan minimal 5 karakter, misalnya "Tiba di Hub: SURABAYA".';
        return;
      }
      this.$emit('tambah-progres', {
        nomor: this.terpilih,
        entri: { waktu: Format.waktuLokal(new Date()), keterangan: ket },
        status: p.status || null
      });
      this.progres = { keterangan: '', status: '', galat: '' };
    }
  },

  /* ---------- 4. Watchers ---------- */
  watch: {
    // Ganti mode cari (Nomor DO <-> NIM): kosongkan isian dan hasil lama
    mode() {
      this.kataKunci = '';
      this.galat = '';
      this.sudahCari = false;
      this.hasil = [];
    },

    // Rapikan isian sambil diketik: nomor DO jadi kapital,
    // NIM hanya angka maksimal 9 digit. Pesan error lama dihapus.
    kataKunci(baru) {
      var bersih = this.mode === 'nomor'
        ? (baru || '').toUpperCase().replace(/\s+/g, '')
        : (baru || '').replace(/\D/g, '').slice(0, 9);
      if (bersih !== baru) this.kataKunci = bersih;
      this.galat = '';
    },

    // Root mengirim nomor DO yang baru dibuat -> langsung tampilkan
    fokus(nomor) {
      if (!nomor) return;
      var self = this;
      this.mode = 'nomor';
      this.$nextTick(function () {   // tunggu watcher mode selesai mengosongkan isian
        self.kataKunci = nomor;
        self.cari();
      });
    }
  },

  /* ---------- 5. Lifecycle ---------- */
  mounted() {
    var self = this;
    this.timerJam = setInterval(function () { self.sekarang = new Date(); }, 1000);
  },

  beforeDestroy() {
    clearInterval(this.timerJam);
  }
});
