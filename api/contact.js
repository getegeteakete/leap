// お問い合わせフォーム受信 → エックスサーバー SMTP でメール送信
//
// 必要な環境変数（Vercel のダッシュボードで設定）:
//   SMTP_PASS           … support@leap-transport.com のメールパスワード（必須）
//   CONTACT_TO_EMAIL    … 受信先（任意。未設定なら support@leap-transport.com）
//   SMTP_HOST / SMTP_PORT / SMTP_USER … api/_mailer.js の既定値を上書きする場合のみ

import { sendMail, smtpConfigured, SMTP_USER } from './_mailer.js';

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

  const TO = process.env.CONTACT_TO_EMAIL || SMTP_USER;

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

  // 件名だけで「問合せ / どの窓口 / 何について / どこから」が分かるようにする
  const officeShort = String(d.office || '').replace('・春日部営業所', '').replace('営業所', '').replace('わからない・お任せ', 'お任せ');
  const subject = `【HP問合せ｜${officeShort || '未指定'}｜${d.category || 'その他'}】${d.company} 様`;

  try {
    await sendMail({
      fromName: '株式会社リープ お問い合わせフォーム',
      to: TO,
      replyTo: d.email,
      subject,
      text,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact handler error:', err);
    return res.status(500).json({ error: '送信に失敗しました。お手数ですがお電話（048-796-3296）でご連絡ください。' });
  }
}
