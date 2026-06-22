// カウントアップアニメーション
function animateCount(el, target, duration) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}
const trustNums = document.querySelectorAll('.trust-num[data-count]');
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      entry.target.dataset.animated = 'true';
      const target = parseInt(entry.target.dataset.count);
      const numEl = entry.target.querySelector('.count-num');
      const duration = target >= 100 ? 2000 : target >= 50 ? 1800 : 1500;
      animateCount(numEl, target, duration);
    }
  });
}, { threshold: 0.5 });
trustNums.forEach(el => countObserver.observe(el));

// モバイルメニュー
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('menuOverlay').classList.toggle('open');
  document.body.classList.toggle('menu-open');
}
// モバイルメニューのロゴをヘッダーから複製
document.addEventListener('DOMContentLoaded', () => {
  const headerLogo = document.querySelector('.logo-img');
  const mobileMenuLogo = document.getElementById('mobileMenuLogo');
  if (headerLogo && mobileMenuLogo) {
    mobileMenuLogo.src = headerLogo.src;
  }
  // スマホメニュー：カテゴリをアコーディオン化（初期は閉じてカテゴリのみ表示）
  document.querySelectorAll('.mm-group > span').forEach(function (s) {
    s.setAttribute('role', 'button');
    s.setAttribute('tabindex', '0');
    const toggle = function () { s.parentElement.classList.toggle('open'); };
    s.addEventListener('click', toggle);
    s.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
});

// 営業ステータス
function updateBusinessStatus() {
  const now = new Date();
  const day = now.getDay();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const start = 8 * 60 + 30, end = 18 * 60;
  const wd = ['日','月','火','水','木','金','土'];
  const todayStr = `${now.getMonth()+1}月${now.getDate()}日（${wd[day]}）`;
  const dotEl = document.getElementById('statusDot');
  const labelEl = document.getElementById('statusLabel');
  const detailEl = document.getElementById('statusDetail');
  if (day >= 1 && day <= 5 && totalMin >= start && totalMin < end) {
    const r = end - totalMin, h = Math.floor(r/60), m = r%60;
    dotEl.className = 'status-dot open';
    labelEl.textContent = 'ただいま営業中';
    detailEl.textContent = `／ ${todayStr} 8:30〜18:00`;
  } else if (day === 0 || day === 6) {
    dotEl.className = 'status-dot closed';
    labelEl.textContent = '本日休業';
    detailEl.textContent = `／ ${todayStr}（土日休業）`;
  } else if (totalMin < start) {
    const w = start - totalMin, h = Math.floor(w/60), m = w%60;
    dotEl.className = 'status-dot closed';
    labelEl.textContent = '営業時間外';
    detailEl.textContent = `／ ${todayStr} 本日 8:30開店`;
  } else {
    dotEl.className = 'status-dot closed';
    labelEl.textContent = '本日営業終了';
    detailEl.textContent = `／ ${todayStr}（翌営業日 8:30開店）`;
  }
}
updateBusinessStatus();
setInterval(updateBusinessStatus, 60000);

// スライダー: 動画背景に変更のためJS不要

// トップへ
function scrollToTop() { window.scrollTo({top:0, behavior:'smooth'}); }
window.addEventListener('scroll', () => {
  const b = document.getElementById('fabTop');
  if (window.scrollY > 400) b.classList.add('visible'); else b.classList.remove('visible');
});

// Chat
const CHAT_MODE = /recruit/i.test(location.pathname) ? 'recruit' : 'company';
const chatMessages = []; // Messages API 用の履歴（user 始まり）。挨拶はHTMLの静的バブルなので含めない。
function toggleChat() { document.getElementById('chatPanel').classList.toggle('open'); }

// 求人ページ（recruit / recruit2）ではチャットの挨拶・ヘッダーを採用向けに差し替え
(function initChatPersona(){
  if (CHAT_MODE !== 'recruit') return;
  document.addEventListener('DOMContentLoaded', function(){
    var head = document.querySelector('.chat-header-info');
    if (head) head.innerHTML = '<h4>リープ 採用アシスタント</h4><p>お仕事・募集について何でもどうぞ</p>';
    var first = document.querySelector('#chatMessages .chat-msg.bot .chat-msg-bubble');
    if (first) first.innerHTML = 'こんにちは。株式会社リープの採用アシスタントです。<br><br>募集職種・お給与や働き方・応募の流れ・会社のことなど、お気軽にお尋ねください。';
    var input = document.getElementById('chatInput');
    if (input) input.setAttribute('placeholder', '例）未経験でも大丈夫ですか？');
  });
})();

async function callClaude(messages, mode) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages, mode: mode })
  });
  let d = {};
  try { d = await r.json(); } catch (e) {}
  if (!r.ok || d.error) throw new Error(d.error || ('HTTP ' + r.status));
  return d.reply;
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  chatMessages.push({ role: 'user', content: text });
  const btn = document.getElementById('chatSend');
  btn.disabled = true;
  addTyping();
  try {
    const reply = await callClaude(chatMessages, CHAT_MODE);
    removeTyping();
    addMessage('bot', reply);
    chatMessages.push({ role: 'assistant', content: reply });
  } catch (e) {
    removeTyping();
    var em = (e && e.message && e.message.indexOf('HTTP') !== 0)
      ? e.message
      : '申し訳ございません。通信エラーが発生しました。お電話（048-796-3296）でお問い合わせください。';
    addMessage('bot', em);
  } finally { btn.disabled = false; }
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function addMessage(role, text) {
  const w = document.createElement('div');
  w.className = 'chat-msg ' + role;
  w.innerHTML = '<div class="chat-msg-bubble">' + escHtml(text).replace(/\n/g, '<br>') + '</div>';
  document.getElementById('chatMessages').appendChild(w);
  document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}
function addTyping() {
  const w = document.createElement('div');
  w.className = 'chat-msg bot typing-msg';
  w.innerHTML = '<div class="chat-msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  document.getElementById('chatMessages').appendChild(w);
}
function removeTyping() { const t = document.querySelector('.typing-msg'); if (t) t.remove(); }

// FAQ アコーディオン
document.querySelectorAll('.faq-q').forEach(function(q){
  q.addEventListener('click', function(){ this.parentElement.classList.toggle('open'); });
});

// サブナビ スクロールスパイ（アンカー型ページ用）
(function(){
  var subLinks = Array.prototype.slice.call(document.querySelectorAll('.subnav a[href^="#"]'));
  if(!subLinks.length) return;
  var sections = subLinks.map(function(a){ return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  window.addEventListener('scroll', function(){
    var pos = window.scrollY + 120; var cur = null;
    sections.forEach(function(s){ if(s.offsetTop <= pos) cur = s.id; });
    subLinks.forEach(function(a){ a.classList.toggle('active', a.getAttribute('href') === '#'+cur); });
  });
})();

/* === v4: 見出しリビール（ふわっと表示） === */
(function(){
  var sel = '.hero-title, .hero-subtitle, .page-hero h1, .page-hero p.sub, .section-title, .section-eyebrow, .cta-title, .block-head, .rec-head .eyebrow, .rec-head h2, .rec-entry h2, .rec-stat';
  var els = Array.prototype.slice.call(document.querySelectorAll(sel));
  if(!els.length || !('IntersectionObserver' in window)) return;
  els.forEach(function(el){ el.classList.add('reveal'); });
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
  els.forEach(function(el){ io.observe(el); });
})();

/* === v4: セクション間 波形ディバイダ（装飾波線・全ページ） === */
(function(){
  if(document.body.dataset.waved) return; document.body.dataset.waved = '1';
  function makeWave(){
    var d=document.createElement('div'); d.className='wave-divider';
    d.innerHTML='<svg viewBox="0 0 860 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'+
      '<path class="w2" d="M0,23 C143,5 287,41 430,23 C573,5 717,41 860,23"></path>'+
      '<path class="w1" d="M0,19 C143,1 287,37 430,19 C573,1 717,37 860,19"></path></svg>';
    return d;
  }
  function divideBetween(items){
    items.forEach(function(el,i){ if(i===0) return; el.parentNode.insertBefore(makeWave(), el); });
  }
  // トップ等：body直下の<section>間
  divideBetween(Array.prototype.filter.call(document.body.children,function(e){return e.tagName==='SECTION';}));
  // サブページ：.content内の.block間
  document.querySelectorAll('.content').forEach(function(c){
    divideBetween(Array.prototype.filter.call(c.children,function(e){return e.classList.contains('block');}));
  });
})();

/* === 写真クリックで拡大（ライトボックス・全ページ） === */
(function(){
  var sel = '.gallery-item img, .section-photo img, .photo-duo img, .rec-gallery figure img, .rec-point img';
  var imgs = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function(im){
    return !im.closest('a');
  });
  if(!imgs.length) return;

  var ov = document.createElement('div');
  ov.className = 'lightbox';
  ov.setAttribute('role','dialog');
  ov.setAttribute('aria-modal','true');
  ov.innerHTML =
    '<button class="lightbox-btn lightbox-close" aria-label="閉じる">×</button>' +
    '<button class="lightbox-btn lightbox-prev" aria-label="前の写真">‹</button>' +
    '<img class="lightbox-img" alt="">' +
    '<button class="lightbox-btn lightbox-next" aria-label="次の写真">›</button>' +
    '<div class="lightbox-cap"></div>';
  document.body.appendChild(ov);

  var lbImg = ov.querySelector('.lightbox-img');
  var lbCap = ov.querySelector('.lightbox-cap');
  var idx = 0;

  function capFor(im){
    var f = im.closest('figure');
    var c = f && f.querySelector('figcaption');
    if(c && c.textContent.trim()) return c.textContent.trim();
    var sp = im.closest('.section-photo');
    var pc = sp && sp.querySelector('.photo-cap');
    if(pc && pc.textContent.trim()) return pc.textContent.trim();
    return im.getAttribute('alt') || '';
  }
  function show(i){
    idx = (i + imgs.length) % imgs.length;
    var im = imgs[idx];
    lbImg.src = im.currentSrc || im.src;
    lbImg.alt = im.alt || '';
    lbCap.textContent = capFor(im);
  }
  function open(i){ show(i); ov.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function close(){ ov.classList.remove('open'); document.body.style.overflow = ''; lbImg.src = ''; }

  imgs.forEach(function(im, i){
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', function(){ open(i); });
  });
  ov.querySelector('.lightbox-close').addEventListener('click', close);
  ov.querySelector('.lightbox-prev').addEventListener('click', function(e){ e.stopPropagation(); show(idx - 1); });
  ov.querySelector('.lightbox-next').addEventListener('click', function(e){ e.stopPropagation(); show(idx + 1); });
  ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
  document.addEventListener('keydown', function(e){
    if(!ov.classList.contains('open')) return;
    if(e.key === 'Escape') close();
    else if(e.key === 'ArrowLeft') show(idx - 1);
    else if(e.key === 'ArrowRight') show(idx + 1);
  });
})();
