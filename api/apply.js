// 株式会社リープ 採用応募フォーム — サーバーレス送信（エックスサーバー SMTP）
// パスワード・送信先はサーバー側の環境変数にのみ保持し、ブラウザには出しません。
// Vercel の Node ランタイム。/api/apply に POST。
// 社内への通知メールに加え、応募者へ受付控え（自動返信）を送る。
//
// 必要な環境変数（Vercel ダッシュボードで設定）:
//   SMTP_PASS           … support@leap-transport.com のメールパスワード（必須）
//   APPLY_TO_EMAIL      … 共通の応募受信先（任意。未設定なら leap@live.jp）
//   APPLY_TO_HONSHA     … 本社の受信先（任意。未設定なら APPLY_TO_EMAIL）
//   APPLY_TO_KANAGAWA   … 神奈川営業所の受信先（任意）
//   APPLY_TO_IBARAKI    … 茨城営業所の受信先（任意）
//   APPLY_CC_EMAIL      … CC 先（任意。未設定なら sup@ei-life.co.jp／空文字を設定すると CC なし）
//   SMTP_HOST / SMTP_PORT / SMTP_USER … api/_mailer.js の既定値を上書きする場合のみ

import { sendMail, smtpConfigured, resolveCc, mailErrorCode } from './_mailer.js';

// 受付アドレス。support@leap-transport.com は送信専用のため、
// 受信は運用で使う leap@live.jp に集約する。
const APPLY_TO_DEFAULT = 'leap@live.jp';

// 保守側でも受信内容を確認できるように CC する。
const APPLY_CC_DEFAULT = 'sup@ei-life.co.jp';

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
  ));
}

// ベストエフォートのレート制限（ウォームインスタンス内のみ有効・スパム抑止）
function rateLimited(req) {
  const store = globalThis.__rl_apply || (globalThis.__rl_apply = new Map());
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), WINDOW = 60000, MAX = 5;
  const arr = (store.get(ip) || []).filter((t) => now - t < WINDOW);
  if (arr.length >= MAX) return true;
  arr.push(now); store.set(ip, arr);
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }
  if (rateLimited(req)) { res.status(429).json({ error: 'アクセスが集中しています。少し時間をおいて再度お試しください。' }); return; }

  const TO_COMMON = process.env.APPLY_TO_EMAIL || APPLY_TO_DEFAULT;
  const TO_HONSHA = process.env.APPLY_TO_HONSHA || TO_COMMON;
  const TO_KANAGAWA = process.env.APPLY_TO_KANAGAWA || TO_COMMON;
  const TO_IBARAKI = process.env.APPLY_TO_IBARAKI || TO_COMMON;
  const CC = resolveCc(process.env.APPLY_CC_EMAIL, APPLY_CC_DEFAULT);

  if (!smtpConfigured()) {
    res.status(503).json({ error: 'メール送信が未設定です（管理者設定待ち）' });
    return;
  }

  // ボディ取得（Vercelは通常パース済みだが文字列の場合に備える）
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const position = String(body.position || '').slice(0, 200);
  const office = String(body.office || '').slice(0, 100);
  const name = String(body.name || '').slice(0, 100);
  const kana = String(body.kana || '').slice(0, 100);
  const tel = String(body.tel || '').slice(0, 40);
  const email = String(body.email || '').slice(0, 200);
  const age = String(body.age || '').slice(0, 40);
  const pref = String(body.pref || '').slice(0, 100);
  const message = String(body.message || '').slice(0, 4000);

  // 必須チェック
  if (!name || !tel || !email || !position) {
    res.status(400).json({ error: '必須項目（応募職種・お名前・電話・メール）が不足しています' });
    return;
  }
  // 簡易メール形式チェック
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'メールアドレスの形式が正しくありません' });
    return;
  }

  // 送信先の営業所振り分け
  let to = TO_HONSHA;
  if (office.includes('神奈川')) to = TO_KANAGAWA;
  else if (office.includes('茨城')) to = TO_IBARAKI;
  if (!to) {
    res.status(503).json({ error: '送信先メールアドレスが未設定です（管理者設定待ち）' });
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#c0531f">採用応募がありました</h2>
      <table cellpadding="8" style="border-collapse:collapse;width:100%">
        <tr><td style="background:#f5f5f5;font-weight:bold;width:140px">応募職種</td><td>${esc(position)}</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold">応募先営業所</td><td>${esc(office)}</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold">お名前</td><td>${esc(name)}（${esc(kana)}）</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold">電話番号</td><td>${esc(tel)}</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold">メール</td><td>${esc(email)}</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold">年齢</td><td>${esc(age) || '—'}</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold">希望勤務地</td><td>${esc(pref) || '—'}</td></tr>
        <tr><td style="background:#f5f5f5;font-weight:bold;vertical-align:top">志望動機・ご質問</td><td>${esc(message).replace(/\n/g, '<br>') || '—'}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:16px">※このメールは採用応募フォームから自動送信されています。返信は応募者のメールアドレス宛に届きます。</p>
    </div>`;

  const text = `採用応募がありました\n\n` +
    `応募職種: ${position}\n応募先営業所: ${office}\n` +
    `お名前: ${name}（${kana}）\n電話番号: ${tel}\nメール: ${email}\n` +
    `年齢: ${age || '—'}\n希望勤務地: ${pref || '—'}\n志望動機: ${message || '—'}\n`;

  // 件名だけで「求人 / どの営業所 / 職種 / 誰から」が分かるようにする
  // position は「職種名｜勤務地」形式のため、勤務地部分は営業所表示と重複するので落とす
  const officeShort = (office || '本社').replace('営業所', '');
  const positionShort = position.split('｜')[0].replace(/募集$/, '').trim();
  const subject = `【HP求人｜${officeShort}】${positionShort}／${name} 様`;

  // 応募者へお返しする受付控え（自動返信）
  const autoReplyText =
    `${name} 様\n\n` +
    'このたびは株式会社リープの求人へご応募いただき、誠にありがとうございます。\n' +
    '以下の内容でご応募を受け付けいたしました。採用担当より折り返しご連絡いたします。\n\n' +
    '【ご応募内容】\n' +
    '----------------------------------------\n' +
    `応募職種：${position}\n` +
    `応募先営業所：${office || '—'}\n` +
    `お名前：${name}（${kana || '—'}）\n` +
    `電話番号：${tel}\n` +
    `メール：${email}\n` +
    `年齢：${age || '—'}\n` +
    `希望勤務地：${pref || '—'}\n` +
    `志望動機・ご質問：${message || '—'}\n` +
    '----------------------------------------\n\n' +
    '※本メールは送信専用アドレスからの自動返信です。\n' +
    '※本メールに心当たりがない場合は、お手数ですが下記までご連絡ください。\n' +
    '※お急ぎの場合はお電話にてお問い合わせください。\n\n' +
    '────────────────────────\n' +
    '株式会社リープ\n' +
    '〒344-0121 埼玉県春日部市上柳77\n' +
    'TEL：048-796-3296／FAX：048-796-3298\n' +
    '営業時間：平日 8:30〜18:00\n' +
    'https://leap-red.vercel.app/\n' +
    '────────────────────────\n';

  try {
    await sendMail({
      fromName: 'リープ採用フォーム',
      to,
      cc: CC,
      replyTo: email,
      subject,
      html,
      text,
    });
  } catch (err) {
    // SMTPのエラー文面には認証情報やサーバー構成が含まれうるため、ブラウザにはコードだけ返す
    console.error('apply handler error:', err);
    const code = mailErrorCode(err);
    res.status(500).json({
      error: `メール送信に失敗しました（${code}）。お手数ですがお電話（048-796-3296）でご連絡ください。`,
      code,
    });
    return;
  }

  // 自動返信は失敗しても社内通知は届いているため、送信結果を成功のまま返す
  try {
    await sendMail({
      fromName: '株式会社リープ 採用担当',
      to: email,
      replyTo: to,
      subject: '【株式会社リープ】ご応募を受け付けました',
      text: autoReplyText,
    });
  } catch (err) {
    console.error('apply auto-reply error:', err);
  }

  res.status(200).json({ ok: true });
}
