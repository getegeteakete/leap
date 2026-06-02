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
const chatMessages = [{ role: 'assistant', content: 'こんにちは。株式会社リープのAIアシスタントです。配送のご相談、お見積もり、営業所のご案内など、お気軽にお尋ねください。' }];
function toggleChat() { document.getElementById('chatPanel').classList.toggle('open'); }

const COMPANY_PROMPT = `あなたは株式会社リープ（埼玉県春日部市）のAIアシスタントです。丁寧な敬語で、温かく親身に対応してください。

【会社概要】
社名：株式会社リープ
モットー：運ぶ信頼 届ける真心
設立：平成19年7月3日（創業17年）
代表取締役：森本 正宏
資本金：1,000万円 / 年商：11億円 / 従業員：70名

【営業所】
- 本社：埼玉県春日部市上柳77（TEL 048-796-3296、FAX 048-796-3298）営業時間 8:30-18:00（平日）
- 神奈川営業所：東京都稲城市若葉台3-12-4（TEL 042-401-4098）
- 茨城営業所：茨城県土浦市虫掛3632-2（TEL 029-896-9700）

【事業内容】
1. 一般貨物自動車運送（関自貨第973号）- 関東を中心に日本全国対応
2. 家電配送・設置サービス（小型〜大型、ツーマン体制、基本操作説明含む）
3. エアコン・電気工事（埼玉県知事第20210164号）
4. ユニットバス施工（大手メーカーより一貫受注）
5. 一時保管・共配・3PL（本社倉庫300坪、茨城倉庫70坪）
6. 産業廃棄物収集運搬（東京・千葉・埼玉・茨城）
7. 輸送業者間共同配送

【保有車両（計60台超）】
1tバン2台 / 2tショート2台 / 2t標準ロング27台 / 2tロングゲート6台 / 4tセミワイドウィングゲート1台 / 4tフルワイドウィングゲート18台
協力会社専属車両10台

【認証】Gマーク、働きやすい職場認証、埼玉県シニア活躍推進宣言企業

【主要取引先】佐川急便、日通トランスポート、アートバンライン、大和物流、新潟運輸グループ 他150社超

【倉庫料金】本社倉庫：坪4,000円、茨城倉庫：坪2,500円（共に相談可、3期制あり）

質問に正確かつ温かく応答し、見積もりは条件を整理して概算を示し、最終的には電話（048-796-3296）でのお問い合わせをご案内してください。`;

async function callClaude(messages, system) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: system, messages: messages })
  });
  const d = await r.json();
  return d.content[0].text;
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
    const reply = await callClaude(chatMessages, COMPANY_PROMPT);
    removeTyping();
    addMessage('bot', reply);
    chatMessages.push({ role: 'assistant', content: reply });
  } catch (e) {
    removeTyping();
    addMessage('bot', '申し訳ございません。エラーが発生しました。お電話（048-796-3296）でお問い合わせください。');
  } finally { btn.disabled = false; }
}

function addMessage(role, text) {
  const w = document.createElement('div');
  w.className = 'chat-msg ' + role;
  w.innerHTML = '<div class="chat-msg-bubble">' + text.replace(/\n/g, '<br>') + '</div>';
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

async function calculateEstimate() {
  const src = document.getElementById('source').value;
  const dst = document.getElementById('destination').value;
  const w = document.getElementById('weight').value;
  const d = document.getElementById('distance').value;
  const t = document.getElementById('type').value;
  const btn = document.getElementById('estimateBtn');
  btn.disabled = true;
  btn.innerHTML = 'AIが計算中です...';
  document.getElementById('resultArea').innerHTML = '<div class="result-placeholder"><div class="typing"><span></span><span></span><span></span></div><p style="margin-top:16px;font-size:13px;">AIが見積もりを計算しています...</p></div>';
  const p = `以下の配送条件で概算見積もりをお願いします。

出発地: ${src}
到着地: ${dst}
配送種別: ${t}
重量: ${w}kg
距離: ${d}km

リープの料金体系を踏まえて、わかりやすく見積もりを提示してください。
最後に「正式なお見積もりは本社（048-796-3296）にお問い合わせください」とご案内ください。`;
  try {
    const reply = await callClaude([{ role: 'user', content: p }], COMPANY_PROMPT);
    document.getElementById('resultArea').innerHTML = '<div class="result-content">' + reply.replace(/\n/g, '<br>') + '</div>';
  } catch (e) {
    document.getElementById('resultArea').innerHTML = '<div class="result-placeholder"><p>エラーが発生しました。<br>お電話（048-796-3296）でお問い合わせください。</p></div>';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon icon-16"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg></span>AIに見積もりを依頼する';
  }
}

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
