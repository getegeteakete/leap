// 共有ライトボックス：素の<figure>ギャラリーをクリック委譲で開閉する。
// 表示ルール：各ギャラリーの「左端（先頭）の1枚」だけがその組の写真を全部見られる写真集。
// 2枚目以降はクリックでその1枚だけを拡大（送りなし）。
// ※ボタン要素（office/company の data-images 付き）は各ページのonclickが処理するため除外。
(function () {
  var imgs = [], idx = 0, single = false;
  var GAL_SEL = '.appliance-gallery, .rec-gallery, .facility-grid';

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
    // 1枚だけ（2枚目以降＝拡大のみ）のときは送り矢印・カウンターを隠す
    var lb = document.getElementById('vehLightbox');
    lb.querySelector('.veh-lb-prev').style.display = single ? 'none' : '';
    lb.querySelector('.veh-lb-next').style.display = single ? 'none' : '';
    document.getElementById('vehLbCounter').style.display = single ? 'none' : '';
  }
  function nav(dir) { idx = (idx + dir + imgs.length) % imgs.length; show(); }
  function close() {
    var lb = document.getElementById('vehLightbox');
    if (lb) lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function open(title) {
    ensure();
    document.getElementById('vehLbTitle').textContent = title || '';
    show();
    document.getElementById('vehLightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // 先頭の1枚：その組の写真を全部（前へ／次へで送れる）
  function openFrom(gallery, item) {
    var nodes = itemsOf(gallery);
    imgs = []; idx = 0; single = false;
    nodes.forEach(function (n) {
      var im = n.querySelector('img');
      if (!im) return;
      if (n === item) idx = imgs.length;
      imgs.push(im.getAttribute('src'));
    });
    if (!imgs.length) return;
    var cap = item.querySelector('figcaption');
    open(cap ? cap.textContent.trim() : '');
  }

  // 2枚目以降：その1枚だけを拡大
  function openSingle(item) {
    var im = item.querySelector('img');
    if (!im) return;
    imgs = [im.getAttribute('src')]; idx = 0; single = true;
    var cap = item.querySelector('figcaption');
    open(cap ? cap.textContent.trim() : '');
  }

  function itemsOf(gallery) {
    var out = [];
    gallery.querySelectorAll('figure, .gallery-item').forEach(function (n) {
      if (n.tagName !== 'BUTTON' && n.querySelector('img')) out.push(n);
    });
    return out;
  }

  // 各ギャラリーにバッジを付与：先頭＝「写真をみる ○枚」、2枚目以降＝「拡大」
  function decorate() {
    document.querySelectorAll(GAL_SEL).forEach(function (gallery) {
      var nodes = itemsOf(gallery);
      if (nodes.length < 1) return;
      nodes.forEach(function (n, i) {
        if (n.querySelector('.gal-more, .gal-zoom')) return; // 既にバッジ有りは触らない
        if (getComputedStyle(n).position === 'static') n.style.position = 'relative';
        var b = document.createElement('span');
        if (i === 0) { b.className = 'gal-more'; b.textContent = '写真をみる ' + nodes.length + '枚'; }
        else { b.className = 'gal-zoom'; b.textContent = '拡大'; }
        n.appendChild(b);
        n.style.cursor = 'pointer';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorate);
  } else {
    decorate();
  }

  document.addEventListener('click', function (e) {
    var gallery = e.target.closest(GAL_SEL);
    if (!gallery) return;
    var item = e.target.closest('figure, .gallery-item');
    if (!item || item.tagName === 'BUTTON') return; // ボタンは各ページのonclickに任せる
    if (!item.querySelector('img')) return;
    e.preventDefault();
    var nodes = itemsOf(gallery);
    if (nodes.length && item === nodes[0]) openFrom(gallery, item); // 先頭＝全部
    else openSingle(item);                                          // 2枚目以降＝1枚拡大
  });

  document.addEventListener('keydown', function (e) {
    var lb = document.getElementById('vehLightbox');
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (!single && e.key === 'ArrowLeft') nav(-1);
    else if (!single && e.key === 'ArrowRight') nav(1);
  });
})();
