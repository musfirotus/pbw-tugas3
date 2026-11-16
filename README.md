# SITTA Vue - Tugas Praktik 3 STSI4209

Aplikasi pemesanan dan distribusi bahan ajar Universitas Terbuka, dibangun dengan
Vue.js 2.7 memakai Vue Component dan Template. Data dummy dibaca dari
`data/dataBahanAjar.json`.

## Cara menjalankan

Data JSON dan template komponen dimuat dengan `fetch`, sehingga aplikasi harus
dibuka lewat server lokal (browser memblokir `fetch` dari `file://`).

- **npm** (Node.js): di folder ini jalankan `npm run dev`, lalu buka
  <http://localhost:5173>. Port lain: `$env:PORT=3000; npm run dev` (PowerShell)
  atau `PORT=3000 npm run dev` (Git Bash/macOS/Linux).
- **VS Code**: klik kanan `index.html` lalu pilih **Open with Live Server**.
- **Python**: `python -m http.server 8000`, lalu buka <http://localhost:8000>.

Tidak perlu `npm install`. `npm run dev` menjalankan `server.js`, server statis
kecil yang hanya memakai modul bawaan Node. Vue 2.7.16 sudah tersimpan di
`js/vendor/vue.min.js`, jadi proyek ini tidak memakai Vite atau Vue CLI: soal
meminta komponen didaftarkan dengan `Vue.component()` dan template `#tpl-*`
yang langsung dibaca browser tanpa proses build.

## Struktur

```
tugas3-vue-ut/
├── index.html                 root: mount #app, tab state stok | tracking | order
├── package.json               script npm run dev
├── server.js                  server statis lokal (modul bawaan Node)
├── assets/
│   ├── css/style.css          gaya global
│   └── img/logo-sitta.svg
├── data/
│   └── dataBahanAjar.json     sumber data (JSON)
├── js/
│   ├── app.js                 inisialisasi Vue root
│   ├── filters.js             filter global: rupiah, satuan, tanggalIndo, ...
│   ├── vendor/vue.min.js
│   ├── components/
│   │   ├── stock-table.js     <ba-stock-table>
│   │   ├── stock-form.js      <ba-stock-form>
│   │   ├── do-tracking.js     <do-tracking>
│   │   ├── order-form.js      <order-form>
│   │   ├── status-badge.js    <status-badge>
│   │   └── app-modal.js       <app-modal>
│   └── services/
│       ├── api.js             fetch JSON + simpan ke localStorage
│       └── template-loader.js memuat file di /templates
└── templates/
    ├── stock-table.html       #tpl-stock
    ├── stock-form.html        #tpl-stock-form
    ├── do-tracking.html       #tpl-tracking
    ├── order-form.html        #tpl-order
    ├── status-badge.html      #tpl-badge
    └── app-modal.html         #tpl-modal
```

## Pintasan keyboard

| Tombol | Fungsi |
| --- | --- |
| Alt+1 / Alt+2 / Alt+3 | Pindah ke tab Stok / Tracking / Pemesanan |
| Enter (di form stok / DO) | Simpan |
| Enter / Esc (kolom cari DO) | Cari / kosongkan pencarian |
| Esc (modal terbuka) | Tutup modal atau batalkan konfirmasi |

Perubahan data tersimpan di `localStorage`. Tautan "Kembalikan data awal" di
bagian bawah halaman mengembalikan isi ke `dataBahanAjar.json`.
