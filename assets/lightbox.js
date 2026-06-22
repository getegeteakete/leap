// 共有ライトボックス：素の<figure>ギャラリーをクリック委譲で開閉する。
// クリックした写真をその位置（アップ）から表示し、関連写真を左右送りできる。
// ※ボタン要素（office/company の data-images 付き）は各ページのonclickが処理するため除外。
(function () {
  var imgs = [], idx = 0;

  function ensure() {
    if (document.getElementById('vehLightbox')) return;
    var d = document.createElement('div');
    d.className = 'veh-lightbox';
    d.id = 'vehLightbox';
    d.innerHTML =
      '<div class="veh-lb-stage">' +
      '<span class="veh-lb-title" id="vehLbTitle"></span>' +
      '<button type="button" class="veh-lb-close" aria-label="閉じる">×</button>' +
      '<button type="button" class="veh-lb-nav veh-lb-prev" aria-label="前へ">‹</button>' +
      '<img class="veh-lb-img" id="vehLbImg" alt="写真">' +
      '<button type="button" class="veh-lb-nav veh-lb-next" aria-label="次へ">›</button>' +
      '<span class="veh-lb-counter" id="vehLbCounter"></span>' +
      '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) close(); });
    d.querySelector('.veh-lb-close').addEventListener('click', close);
    d.querySelector('.veh-lb-prev').addEventListener('click', function () { nav(-1); });
    d.querySelector('.veh-lb-next').addEventListener('click', function () { nav(1); });
  }

  function show() {
    document.getElementById('vehLbImg').src = imgs[idx];
    document.getElementById('vehLbCounter').textContent = (idx + 1) + ' / ' + imgs.length;
  }
  function nav(dir) { idx = (idx + dir + imgs.length) % imgs.length; show(); }
  function close() {
    var lb = document.getElementById('vehLightbox');
    if (lb) lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openFrom(gallery, item) {
    var nodes = gallery.querySelectorAll('figure, .gallery-item');
    imgs = []; idx = 0;
    nodes.forEach(function (n) {
      var im = n.querySelector('img');
      if (!im) return;
      if (n === item) idx = imgs.length;
      imgs.push(im.getAttribute('src'));
    });
    if (!imgs.length) return;
    var cap = item.querySelector('figcaption');
    ensure();
    document.getElementById('vehLbTitle').textContent = cap ? cap.textContent.trim() : '';
    show();
    document.getElementById('vehLightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  document.addEventListener('click', function (e) {
    var gallery = e.target.closest('.appliance-gallery, .rec-gallery, .facility-grid');
    if (!gallery) return;
    var item = e.target.closest('figure, .gallery-item');
    if (!item || item.tagName === 'BUTTON') return; // ボタンは各ページのonclickに任せる
    if (!item.querySelector('img')) return;
    e.preventDefault();
    openFrom(gallery, item);
  });

  document.addEventListener('keydown', function (e) {
    var lb = document.getElementById('vehLightbox');
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') nav(-1);
    else if (e.key === 'ArrowRight') nav(1);
  });
})();
