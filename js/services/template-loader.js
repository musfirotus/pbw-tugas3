/* =========================================================
   template-loader.js - memuat file di folder /templates
   Setiap file berisi satu <template id="tpl-..."> milik satu
   komponen. Semuanya diambil dengan fetch lalu ditempel ke
   <body>, sehingga opsi template: '#tpl-stock' di komponen
   bisa menemukan elemennya. Harus selesai sebelum komponen
   pertama dirender (diatur di app.js).
   ========================================================= */
var TemplateLoader = (function () {
  var DAFTAR = [
    'status-badge',
    'app-modal',
    'stock-form',
    'stock-table',
    'do-tracking',
    'order-form'
  ];

  function muat() {
    return Promise.all(DAFTAR.map(function (nama) {
      var url = 'templates/' + nama + '.html';
      return fetch(url).then(function (res) {
        if (!res.ok) throw new Error('Template ' + url + ' tidak ditemukan (HTTP ' + res.status + ')');
        return res.text();
      });
    })).then(function (isiFile) {
      var wadah = document.createElement('div');
      wadah.id = 'kumpulan-template';
      wadah.hidden = true;
      wadah.innerHTML = isiFile.join('\n');
      document.body.appendChild(wadah);
    });
  }

  return { muat: muat, daftar: DAFTAR };
})();
