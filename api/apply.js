// 株式会社リープ 採用応募フォーム — サーバーレス送信（Resend Email API）
// APIキー・送信先はサーバー側の環境変数にのみ保持し、ブラウザには出しません。
// Vercel の Node ランタイム。/api/apply に POST。
//
// 必要な環境変数（Vercel ダッシュボードで設定）:
//   RESEND_API_KEY      … Resend の API キー（必須）
//   APPLY_FROM_EMAIL    … 送信元アドレス（Resendで検証済みドメインのもの。例: recruit@leap-transport.com）
//   APPLY_TO_EMAIL      … 共通の応募受信先（営業所別が未設定の場合に使用）
//   APPLY_TO_HONSHA     … 本社の受信先（任意。未設定なら APPLY_TO_EMAIL）
//   APPLY_TO_KANAGAWA   … 神奈川営業所の受信先（任意）
//   APPLY_TO_IBARAKI    … 茨城営業所の受信先（任意）

function esc(s) {
  return String(s == null ? '' : s).replace(/[<>&"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]
  ));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.APPLY_FROM_EMAIL || 'recruit@leap-transport.com';
  const TO_COMMON = process.env.APPLY_TO_EMAIL || 'leap@live.jp';
  const TO_HONSHA = process.env.APPLY_TO_HONSHA || TO_COMMON;
  const TO_KANAGAWA = process.env.APPLY_TO_KANAGAWA || TO_COMMON;
  const TO_IBARAKI = process.env.APPLY_TO_IBARAKI || TO_COMMON;

  if (!RESEND_API_KEY) {
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

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `リープ採用フォーム <${FROM}>`,
        to: [to],
        reply_to: email,
        subject: `【採用応募】${position}（${name} 様）`,
        html,
        text,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'メール送信に失敗しました', detail: detail.slice(0, 300) });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'サーバーエラー', detail: String(err).slice(0, 300) });
  }
}
