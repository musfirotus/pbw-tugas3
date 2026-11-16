/* =========================================================
   status-badge.js  ->  <status-badge>
   Template: templates/status-badge.html (#tpl-badge)

   Label status stok (Aman / Menipis / Kosong). Saat kursor
   diarahkan ke label, catatanHTML tampil sebagai tooltip.
   Tooltip memakai position: fixed karena tabel stok berada di
   dalam kotak overflow; tooltip absolute akan terpotong.

   Props : qty, safety, catatan
   ========================================================= */
Vue.component('status-badge', {
  template: '#tpl-badge',

  props: {
    qty: { type: Number, required: true },
    safety: { type: Number, required: true },
    catatan: { type: String, default: '' }
  },

  data: function () {
    return {
      tampil: false,
      posisi: { top: 0, left: 0 }
    };
  },

  computed: {
    // Kosong dicek lebih dulu: stok 0 juga memenuhi qty < safety
    status() {
      if (this.qty === 0) return 'kosong';
      if (this.qty < this.safety) return 'menipis';
      return 'aman';
    }
  },

  methods: {
    // @mouseenter: hitung posisi tooltip dari letak label di layar
    tunjukkan(e) {
      if (!this.catatan) return;
      var kotak = e.currentTarget.getBoundingClientRect();
      var lebarTooltip = 260;
      this.posisi = {
        top: kotak.bottom + 8,
        left: Math.max(8, Math.min(kotak.left, window.innerWidth - lebarTooltip - 8))
      };
      this.tampil = true;
    },

    sembunyikan() {
      this.tampil = false;
    }
  }
});
