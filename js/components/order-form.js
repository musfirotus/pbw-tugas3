/* =========================================================
   order-form.js  ->  <order-form>
   Template: templates/order-form.html (#tpl-order)

   Form Delivery Order baru. Nomor DO dihitung root dan
   dikirim lewat props nomor-do; total harga diambil dari
   paket yang dipilih. Setelah valid, DO baru dikirim ke root
   lewat event "created".

   Props : paket, ekspedisi (pengirimanList), stok, nomor-do
   Event : created (objek DO baru), notif
   Keyboard: Enter di isian mana pun = simpan
   ========================================================= */
function formDOKosong() {
  return {
    nim: '', nama: '', ekspedisi: '', paket: '',
    tanggalKirim: Format.tanggalLokal(new Date())
  };
}

Vue.component('order-form', {
  template: '#tpl-order',

  props: {
    paket: { type: Array, required: true },
    ekspedisi: { type: Array, required: true },
    stok: { type: Array, required: true },
    nomorDo: { type: String, required: true }
  },

  data: function () {
    return {
      form: formDOKosong(),
      tersentuh: {},
      sudahDicoba: false,
      tahun: new Date().getFullYear()
    };
  },

  computed: {
    // Detail paket muncul di bawah <select> begitu paket dipilih
    paketTerpilih() {
      var kode = this.form.paket;
      return this.paket.find(function (p) { return p.kode === kode; }) || null;
    },

    ekspedisiTerpilih() {
      var kode = this.form.ekspedisi;
      return this.ekspedisi.find(function (e) { return e.kode === kode; }) || null;
    },

    // Total harga = harga paket (array of objects paket -> harga)
    total() {
      return this.paketTerpilih ? this.paketTerpilih.harga : 0;
    },

    batasTanggal() {
      var maks = new Date();
      maks.setDate(maks.getDate() + 30);
      return { min: this.tahun + '-01-01', maks: Format.tanggalLokal(maks) };
    },

    galat() {
      var f = this.form;
      var g = {};

      if (!f.nim) g.nim = 'NIM wajib diisi.';
      else if (!/^\d{9}$/.test(f.nim)) g.nim = 'NIM terdiri dari 9 angka (saat ini ' + f.nim.length + ').';

      var nama = f.nama.trim();
      if (!nama) g.nama = 'Nama wajib diisi.';
      else if (nama.length < 3) g.nama = 'Nama minimal 3 huruf.';
      else if (!/^[A-Za-z\s.,'’-]+$/.test(nama)) g.nama = 'Nama hanya boleh berisi huruf, spasi, titik, koma, apostrof, atau tanda hubung.';

      if (!f.ekspedisi) g.ekspedisi = 'Pilih jenis ekspedisi.';
      if (!f.paket) g.paket = 'Pilih paket bahan ajar.';

      if (!f.tanggalKirim) g.tanggalKirim = 'Tanggal kirim wajib diisi.';
      else if (f.tanggalKirim < this.batasTanggal.min) g.tanggalKirim = 'Tanggal kirim tidak boleh sebelum 1 Januari ' + this.tahun + '.';
      else if (f.tanggalKirim > this.batasTanggal.maks) g.tanggalKirim = 'Tanggal kirim paling lambat 30 hari dari hari ini.';
      return g;
    },

    jumlahGalat() {
      return Object.keys(this.galat).length;
    }
  },

  methods: {
    // "Reguler (3-5 hari)" -> "JNE Reguler"
    labelEkspedisi(e) {
      return 'JNE ' + e.nama.split(' (')[0];
    },

    judulMK(kode) {
      var item = this.stok.find(function (s) { return s.kode === kode; });
      return item ? item.judul : '(judul belum terdaftar)';
    },

    // Tanggal kirim dari jam lokal komputer (Date)
    isiHariIni() {
      this.form.tanggalKirim = Format.tanggalLokal(new Date());
    },

    tandai(kolom) {
      this.$set(this.tersentuh, kolom, true);
    },

    pesanGalat(kolom) {
      if (this.tersentuh[kolom] || this.sudahDicoba) return this.galat[kolom] || '';
      return '';
    },

    tekanEnter(e) {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      this.kirim();
    },

    kirim() {
      this.sudahDicoba = true;
      if (this.jumlahGalat > 0) {
        var pertama = Object.keys(this.galat)[0];
        var el = this.$el.querySelector('#of-' + pertama);
        if (el) el.focus();
        this.$emit('notif', 'Masih ada ' + this.jumlahGalat + ' isian yang perlu diperbaiki.', 'error');
        return;
      }

      var f = this.form;
      this.$emit('created', {
        nomor: this.nomorDo,
        nim: f.nim,
        nama: f.nama.trim().replace(/\s+/g, ' '),
        status: 'Diproses',
        ekspedisi: this.labelEkspedisi(this.ekspedisiTerpilih),
        tanggalKirim: f.tanggalKirim,
        paket: f.paket,
        total: this.total,
        perjalanan: [
          { waktu: Format.waktuLokal(new Date()), keterangan: 'Pesanan dibuat, menunggu penyerahan ke ekspedisi' }
        ]
      });
      this.kosongkan();
    },

    kosongkan() {
      this.form = formDOKosong();
      this.tersentuh = {};
      this.sudahDicoba = false;
    }
  },

  watch: {
    // NIM hanya angka, maksimal 9 digit. Huruf/spasi langsung dibuang
    'form.nim'(baru) {
      var bersih = (baru || '').replace(/\D/g, '').slice(0, 9);
      if (bersih !== baru) this.form.nim = bersih;
    },

    // Setelah paket dipilih, kolom paket dianggap sudah diisi sehingga
    // pesan error lama hilang dan detail isi paket langsung tampil
    'form.paket'(baru) {
      if (baru) this.tandai('paket');
    }
  }
});
