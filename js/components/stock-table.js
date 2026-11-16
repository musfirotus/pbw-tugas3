/* =========================================================
   stock-table.js  ->  <ba-stock-table>
   Template: templates/stock-table.html (#tpl-stock)

   Halaman Stok Bahan Ajar: ringkasan, filter + sort, tabel,
   serta modal tambah/edit yang berisi <ba-stock-form>.
   Data stok milik root; komponen ini hanya membaca lewat
   props dan meminta perubahan lewat event.

   Props : items, upbjj-list, kategori-list
   Event : simpan { mode, indeks, data }, hapus (item),
           ubah-qty { indeks, qty }, notif (teks, jenis)

   Isi file:
   1. data      : state filter, sort, modal
   2. computed  : rantai filter -> sort (di-cache), ringkasan
   3. methods   : aksi dari klik / dblclick
   4. watch     : dependent filter UT-Daerah -> kategori
   ========================================================= */

// Ubah ke false untuk mematikan log computed di console
var DEBUG_COMPUTED = true;
function catatHitung(nama) {
  if (DEBUG_COMPUTED) console.count('[computed] ' + nama + ' dihitung ulang');
}

function filterStokKosong() {
  return { keyword: '', upbjj: '', kategori: '', reorder: false };
}

Vue.component('ba-stock-table', {
  template: '#tpl-stock',

  props: {
    items: { type: Array, required: true },
    upbjjList: { type: Array, required: true },
    kategoriList: { type: Array, required: true }
  },

  /* ---------- 1. Data ---------- */
  data: function () {
    return {
      filter: filterStokKosong(),
      sortKey: 'judul',
      sortArah: 'asc',
      opsiSort: [
        { nilai: 'judul', label: 'Judul (A-Z)' },
        { nilai: 'qty', label: 'Jumlah stok' },
        { nilai: 'harga', label: 'Harga' }
      ],
      labelStatus: { aman: '✔ Aman', menipis: '⚠ Menipis', kosong: '✖ Kosong' },
      modal: { buka: false, mode: 'tambah', indeks: -1, item: null },
      sorotKunci: ''
    };
  },

  /* ---------- 2. Computed ----------
     Filter dipecah menjadi beberapa tahap. Vue meng-cache setiap
     computed dan hanya menghitung ulang tahap yang dependensinya
     berubah. Mengganti urutan hanya menjalankan stokTampil;
     tahap sebelumnya memakai hasil cache. */
  computed: {
    // Tahap 1: filter UT-Daerah
    stokPerDaerah() {
      catatHitung('stokPerDaerah');
      var daerah = this.filter.upbjj;
      if (!daerah) return this.items;
      return this.items.filter(function (s) { return s.upbjj === daerah; });
    },

    // Dependent options: jumlah judul per kategori di UT-Daerah terpilih
    kategoriTersedia() {
      var daftar = this.stokPerDaerah;
      return this.kategoriList.map(function (k) {
        var jumlah = daftar.filter(function (s) { return s.kategori === k; }).length;
        return { nama: k, jumlah: jumlah };
      });
    },

    // Tahap 2: filter kategori
    stokPerKategori() {
      catatHitung('stokPerKategori');
      var kat = this.filter.kategori;
      if (!kat) return this.stokPerDaerah;
      return this.stokPerDaerah.filter(function (s) { return s.kategori === kat; });
    },

    // Tahap 3: pencarian kode / judul
    stokCari() {
      catatHitung('stokCari');
      var kata = this.filter.keyword.trim().toLowerCase();
      if (!kata) return this.stokPerKategori;
      return this.stokPerKategori.filter(function (s) {
        return s.kode.toLowerCase().indexOf(kata) !== -1 ||
               s.judul.toLowerCase().indexOf(kata) !== -1;
      });
    },

    // Tahap 4: hanya yang perlu re-order (qty < safety atau qty = 0)
    stokReorder() {
      catatHitung('stokReorder');
      if (!this.filter.reorder) return this.stokCari;
      return this.stokCari.filter(function (s) {
        return s.qty < s.safety || s.qty === 0;
      });
    },

    // Tahap 5: pengurutan. slice() supaya array props tidak ikut terurut
    stokTampil() {
      catatHitung('stokTampil');
      var kunci = this.sortKey;
      var arah = this.sortArah === 'asc' ? 1 : -1;
      return this.stokReorder.slice().sort(function (a, b) {
        if (kunci === 'judul') return a.judul.localeCompare(b.judul, 'id') * arah;
        return (a[kunci] - b[kunci]) * arah;
      });
    },

    // Objek { aman, menipis, kosong } -> di template di-loop dengan
    // v-for="(jumlah, status) in ringkasan" (name-based index)
    ringkasan() {
      var hasil = { aman: 0, menipis: 0, kosong: 0 };
      var self = this;
      this.stokPerDaerah.forEach(function (s) {
        hasil[self.statusStok(s)] += 1;
      });
      return hasil;
    },

    totalEksemplar() {
      return this.stokPerDaerah.reduce(function (jml, s) { return jml + s.qty; }, 0);
    },

    labelDaerah() {
      return this.filter.upbjj ? 'UT-Daerah ' + this.filter.upbjj : 'seluruh UT-Daerah';
    },

    filterAktif() {
      var f = this.filter;
      return f.keyword !== '' || f.upbjj !== '' || f.kategori !== '' || f.reorder ||
             this.sortKey !== 'judul' || this.sortArah !== 'asc';
    },

    judulModal() {
      return this.modal.mode === 'tambah' ? 'Tambah Bahan Ajar' : 'Edit ' + this.modal.item.kode;
    }
  },

  /* ---------- 3. Methods ---------- */
  methods: {
    statusStok(item) {
      if (item.qty === 0) return 'kosong';
      if (item.qty < item.safety) return 'menipis';
      return 'aman';
    },

    kunciBaris(item) {
      return item.kode + '@' + item.upbjj;
    },

    // Lebar bar stok: 100% berarti stok sudah 2x safety stock
    lebarBar(item) {
      if (!item.safety) return 100;
      return Math.min(100, Math.round(item.qty / (item.safety * 2) * 100));
    },

    // Klik judul kolom: kolom sama = balik arah, kolom lain = naik
    urutkan(kunci) {
      if (this.sortKey === kunci) {
        this.sortArah = this.sortArah === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = kunci;
        this.sortArah = 'asc';
      }
    },

    panahSort(kunci) {
      if (this.sortKey !== kunci) return '';
      return this.sortArah === 'asc' ? '▲' : '▼';
    },

    resetFilter() {
      this.filter = filterStokKosong();
      this.sortKey = 'judul';
      this.sortArah = 'asc';
      this.$emit('notif', 'Filter dan urutan dikembalikan ke awal.');
    },

    bukaTambah() {
      var awal = null;
      // isi otomatis UT-Daerah jika filter daerah sedang dipakai
      if (this.filter.upbjj) awal = { upbjj: this.filter.upbjj };
      this.modal = { buka: true, mode: 'tambah', indeks: -1, item: awal };
    },

    bukaEdit(item) {
      this.modal = { buka: true, mode: 'edit', indeks: this.items.indexOf(item), item: item };
    },

    tutupModal() {
      this.modal.buka = false;
    },

    // Event simpan dari <ba-stock-form> diteruskan ke root
    simpanForm(data) {
      this.$emit('simpan', { mode: this.modal.mode, indeks: this.modal.indeks, data: data });
      this.modal.buka = false;
      this.sorot(data);
    },

    sorot(item) {
      var self = this;
      this.sorotKunci = this.kunciBaris(item);
      clearTimeout(this.timerSorot);
      this.timerSorot = setTimeout(function () { self.sorotKunci = ''; }, 2500);
    },

    ubahQty(item, selisih) {
      var baru = item.qty + selisih;
      if (baru < 0) return;
      this.$emit('ubah-qty', { indeks: this.items.indexOf(item), qty: baru });
    },

    mintaHapus(item) {
      this.$emit('hapus', item);
    },

    // notifikasi dari <ba-stock-form> diteruskan ke root
    teruskanNotif(teks, jenis) {
      this.$emit('notif', teks, jenis);
    }
  },

  /* ---------- 4. Watcher ----------
     Dependent filter: kategori bergantung pada UT-Daerah. Jika daerah
     dikosongkan, atau kategori terpilih tidak ada di daerah baru,
     filter kategori dikosongkan. */
  watch: {
    'filter.upbjj'(baru) {
      if (!baru) {
        this.filter.kategori = '';
        return;
      }
      var kat = this.filter.kategori;
      var masihAda = this.kategoriTersedia.some(function (k) { return k.nama === kat && k.jumlah > 0; });
      if (kat && !masihAda) {
        this.filter.kategori = '';
        this.$emit('notif', 'Kategori "' + kat + '" tidak ada di ' + baru + ', filter kategori dikosongkan.');
      }
    }
  },

  created() {
    this.timerSorot = null; // tidak perlu reaktif
  }
});
