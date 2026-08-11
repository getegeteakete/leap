// お問い合わせフォーム受信 → エックスサーバー SMTP でメール送信
// 社内への通知メールに加え、送信者へ受付控え（自動返信）を送る。
//
// 必要な環境変数（Vercel のダッシュボードで設定）:
//   SMTP_PASS           … support@leap-transport.com のメールパスワード（必須）
//   CONTACT_TO_EMAIL    … 受信先（任意。未設定なら leap@live.jp）
//   CONTACT_CC_EMAIL    … CC 先（任意。未設定なら sup@ei-life.co.jp／空文字を設定すると CC なし）
//   SMTP_HOST / SMTP_PORT / SMTP_USER … api/_mailer.js の既定値を上書きする場合のみ

import { sendMail, smtpConfigured, resolveCc, mailErrorCode } from './_mailer.js';
import { officeSignature } from './_offices.js';

// 受付アドレス。support@leap-transport.com は送信専用のため、
// 受信は運用で使う leap@live.jp に集約する。
const CONTACT_TO_DEFAULT = 'leap@live.jp';

// 保守側でも受信内容を確認できるように CC する。
const CONTACT_CC_DEFAULT = 'sup@ei-life.co.jp';

// ベストエフォートのレート制限（ウォームインスタンス内のみ有効・スパム抑止）
function rateLimited(req) {
  const store = globalThis.__rl_contact || (globalThis.__rl_contact = new Map());
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), WINDOW = 60000, MAX = 5;
  const arr = (store.get(ip) || []).filter((t) => now - t < WINDOW);
  if (arr.length >= MAX) return true;
  arr.push(now); store.set(ip, arr);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (rateLimited(req)) {
    return res.status(429).json({ error: 'アクセスが集中しています。少し時間をおいて再度お試しください。' });
  }

  const TO = process.env.CONTACT_TO_EMAIL || CONTACT_TO_DEFAULT;
  const CC = resolveCc(process.env.CONTACT_CC_EMAIL, CONTACT_CC_DEFAULT);

  if (!smtpConfigured()) {
    return res.status(503).json({ error: 'メール送信が未設定です。お手数ですがお電話（048-796-3296）でご連絡ください。' });
  }

  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  d = d || {};

  // 必須チェック（窓口はフォーム側で必須指定。未指定でも受信は妨げない）
  if (!d.company || !d.contactName || !d.email) {
    return res.status(400).json({ error: '必須項目（貴社名・ご担当者名・メールアドレス）を入力してください。' });
  }
  // 簡易メール形式チェック
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    return res.status(400).json({ error: 'メールアドレスの形式をご確認ください。' });
  }

  const labels = {
    category: 'お問い合わせ内容',
    office: 'ご希望の窓口',
    company: '貴社名（お客様名）',
    companyKana: 'フリガナ',
    contactName: 'ご担当者名',
    contactKana: 'ご担当者名フリガナ',
    email: 'メールアドレス',
    tel: '電話番号',
    fax: 'FAX',
    fromPref: '積込地 都道府県',
    toPref: '納入先 都道府県',
    address: '積込地・納入先 ご住所',
    deliveryTime: '納入指定時間',
    truckTon: 'トラック トン数',
    bodyType: 'ボディ種類',
    cargo: '荷姿',
    pallet: 'パレット積の可・不可',
    message: 'その他お問い合わせ内容',
  };

  const lines = [];
  for (const key of Object.keys(labels)) {
    const v = (d[key] || '').toString().trim().slice(0, key === 'message' ? 4000 : 500);
    if (v) lines.push(`${labels[key]}：${v}`);
  }

  const text =
    '株式会社リープ お問い合わせフォームより送信されました。\n' +
    '----------------------------------------\n' +
    lines.join('\n') +
    '\n----------------------------------------\n';

  // 送信者へお返しする受付控え（自動返信）
  const autoReplyText =
    `${d.contactName} 様\n\n` +
    'このたびは株式会社リープへお問い合わせいただき、誠にありがとうございます。\n' +
    '以下の内容でお問い合わせを受け付けいたしました。担当者より折り返しご連絡いたします。\n\n' +
    '【お問い合わせ内容】\n' +
    '----------------------------------------\n' +
    lines.join('\n') +
    '\n----------------------------------------\n\n' +
    '※本メールは送信専用アドレスからの自動返信です。\n' +
    '※本メールに心当たりがない場合は、お手数ですが下記までご連絡ください。\n' +
    '※お急ぎの場合はお電話にてお問い合わせください。\n\n' +
    officeSignature(d.office);

  // 件名だけで「問合せ / どの窓口 / 何について / どこから」が分かるようにする
  const officeShort = String(d.office || '').replace('・春日部営業所', '').replace('営業所', '').replace('わからない・お任せ', 'お任せ');
  const subject = `【HP問合せ｜${officeShort || '未指定'}｜${d.category || 'その他'}】${d.company} 様`;

  try {
    await sendMail({
      fromName: '株式会社リープ お問い合わせフォーム',
      to: TO,
      cc: CC,
      replyTo: d.email,
      subject,
      text,
    });
  } catch (err) {
    console.error('contact handler error:', err);
    const code = mailErrorCode(err);
    return res.status(500).json({
      error: `送信に失敗しました（${code}）。お手数ですがお電話（048-796-3296）でご連絡ください。`,
      code,
    });
  }

  // 自動返信は失敗しても社内通知は届いているため、送信結果を成功のまま返す
  try {
    await sendMail({
      fromName: '株式会社リープ',
      to: d.email,
      replyTo: TO,
      subject: '【株式会社リープ】お問い合わせを受け付けました',
      text: autoReplyText,
    });
  } catch (err) {
    console.error('contact auto-reply error:', err);
  }

  return res.status(200).json({ ok: true });
}
