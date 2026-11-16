/* =========================================================
   app-modal.js  ->  <app-modal>
   Template: templates/app-modal.html (#tpl-modal)

   Kotak dialog umum. Isinya dikirim lewat slot:
   - slot default : isi dialog (form, pesan konfirmasi, ...)
   - slot footer  : tombol-tombol aksi
   Dipakai untuk form tambah/edit stok dan pop-up konfirmasi
   hapus. Bisa ditutup dengan tombol x, klik di luar kotak,
   atau tombol Esc.

   Props : show, title, ukuran ('sm' | 'md')
   Event : close
   ========================================================= */
Vue.component('app-modal', {
  template: '#tpl-modal',

  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '' },
    ukuran: { type: String, default: 'md' }
  },

  methods: {
    tutup() {
      this.$emit('close');
    },

    // listener keyboard di document, aktif hanya selama modal terbuka
    tekanTombol(e) {
      if (e.key === 'Escape') this.tutup();
    },

    fokuskanIsi() {
      var kotak = this.$refs.kotak;
      if (!kotak) return;
      var target = kotak.querySelector('[autofocus], input:not([readonly]), select, textarea, .btn-utama');
      (target || kotak).focus();
    }
  },

  watch: {
    // Begitu modal dibuka: pasang listener Esc, kunci scroll halaman,
    // dan pindahkan fokus ke isian pertama. Dibalik saat ditutup.
    show: {
      immediate: true,
      handler(buka) {
        document.body.classList.toggle('modal-open', buka);
        if (buka) {
          document.addEventListener('keydown', this.tekanTombol);
          this.$nextTick(this.fokuskanIsi);
        } else {
          document.removeEventListener('keydown', this.tekanTombol);
        }
      }
    }
  },

  beforeDestroy() {
    document.removeEventListener('keydown', this.tekanTombol);
    document.body.classList.remove('modal-open');
  }
});
