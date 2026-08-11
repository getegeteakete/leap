// フォーム経由の迷惑メール・不正利用対策（先頭が _ のファイルは Vercel の API エンドポイントにならない）
//
// このサイトのフォームには添付ファイルの受付がないため、ウイルスの混入経路はない。
// 実際に備えるべきは次の2点。
//   1. ボットによる大量投稿（受信箱が埋まる）
//   2. 自動返信の踏み台化。自動返信は送信者が入力したアドレス宛に、入力内容を
//      そのまま載せて送るため、無対策だと第三者への迷惑メール送信に悪用されうる
//
// CAPTCHA は入力の手間が増え、実際の問い合わせを取りこぼすため使わない。
// 代わりに、人間なら必ず通り、機械的な投稿だけが引っかかる条件で判定する。

// 入力欄には見えないダミー項目の name。人間には表示されないので常に空。
// ボットは項目名から住所欄と誤認して埋めるため、値が入っていれば機械的な投稿と判る。
export const HONEYPOT_FIELD = 'company_address2';

// フォームを開いた時刻を入れる項目の name。
export const TIMESTAMP_FIELD = 'form_opened_at';

// 人間が必須項目を埋めるのに最低限かかる時間。これより速い投稿は機械的とみなす。
const MIN_ELAPSED_MS = 3000;

// 本文に含めてよい URL の数。宣伝目的の投稿はリンクが並ぶ。
const MAX_URLS = 2;

// 掲示板用のリンク記法や HTML のタグ。通常の問い合わせ文には現れない。
const LINK_MARKUP = /\[url[=\]]|\[\/url\]|\[link[=\]]|<a\s|<script/i;

// メールヘッダ（件名など）に入る値から改行と制御文字を取り除く。
// nodemailer 側でも無害化されるが、本文の見た目が崩れるのを防ぐ意味もある。
export function headerSafe(s, max = 200) {
  const collapsed = String(s == null ? '' : s).replace(/\s+/g, ' ');
  let out = '';
  for (const ch of collapsed) {
    const code = ch.charCodeAt(0);
    if (code > 31 && code !== 127) out += ch;
  }
  return out.trim().slice(0, max);
}

// 判定結果は { spam, reason, silent } を返す。
//   silent: true  … ボットが確実なので、成功したように見せて送信だけしない。
//                   弾いたことを教えると条件を変えて再投稿されるため。
//   silent: false … 人間の可能性があるので、理由を伝えて直してもらう。
export function spamCheck({ body, text, now }) {
  const d = body || {};

  if (String(d[HONEYPOT_FIELD] || '').trim()) {
    return { spam: true, reason: 'honeypot', silent: true };
  }

  const opened = Number(d[TIMESTAMP_FIELD]);
  if (Number.isFinite(opened) && opened > 0 && now - opened < MIN_ELAPSED_MS) {
    return { spam: true, reason: 'too-fast', silent: true };
  }

  const s = String(text || '');
  const urls = s.match(/https?:\/\//gi) || [];
  if (urls.length > MAX_URLS) {
    return { spam: true, reason: 'too-many-urls', silent: false };
  }
  if (LINK_MARKUP.test(s)) {
    return { spam: true, reason: 'link-markup', silent: false };
  }

  return { spam: false };
}

// 人間の可能性がある場合に返す文言。迷惑メール判定であることは明かさない。
export const SPAM_NOTICE =
  'URLやリンクを多く含む内容は送信できません。お手数ですが本文を見直すか、お電話（048-796-3296）でご連絡ください。';
