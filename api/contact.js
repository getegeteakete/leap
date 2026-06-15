// お問い合わせフォーム受信 → Resend でメール送信
//
// 必要な環境変数（Vercel のダッシュボードで設定）:
//   RESEND_API_KEY      … Resend の API キー（必須）
//   CONTACT_TO_EMAIL    … 受信先（任意。未設定なら leap@live.jp）
//   CONTACT_FROM_EMAIL  … 送信元（任意。Resend で認証済みドメインのアドレス）
//
// ※ Resend では送信元ドメインの認証が必要です。認証前は onboarding@resend.dev で送信できます。

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO = process.env.CONTACT_TO_EMAIL || 'leap@live.jp';
  const FROM = process.env.CONTACT_FROM_EMAIL || 'お問い合わせ <onboarding@resend.dev>';

  if (!RESEND_API_KEY) {
    return res.status(503).json({ error: 'メール送信が未設定です。お手数ですがお電話（048-796-3296）でご連絡ください。' });
  }

  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  d = d || {};

  // 必須チェック
  if (!d.company || !d.contactName || !d.email) {
    return res.status(400).json({ error: '必須項目（貴社名・ご担当者名・メールアドレス）を入力してください。' });
  }
  // 簡易メール形式チェック
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
    return res.status(400).json({ error: 'メールアドレスの形式をご確認ください。' });
  }

  const labels = {
    category: 'お問い合わせ内容',
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
    const v = (d[key] || '').toString().trim();
    if (v) lines.push(`${labels[key]}：${v}`);
  }

  const text =
    '株式会社リープ お問い合わせフォームより送信されました。\n' +
    '----------------------------------------\n' +
    lines.join('\n') +
    '\n----------------------------------------\n';

  const subject = `【お問い合わせ】${d.category || ''} ${d.company} 様`.trim();

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: d.email,
        subject,
        text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Resend error:', r.status, detail);
      return res.status(502).json({ error: '送信に失敗しました。お手数ですがお電話（048-796-3296）でご連絡ください。' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact handler error:', err);
    return res.status(500).json({ error: '送信に失敗しました。お手数ですがお電話（048-796-3296）でご連絡ください。' });
  }
}
