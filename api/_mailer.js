// エックスサーバー SMTP 送信の共通モジュール（先頭が _ のファイルは Vercel の API エンドポイントにならない）
//
// 必要な環境変数（Vercel のダッシュボードで設定）:
//   SMTP_PASS  … support@leap-transport.com のメールパスワード（必須・これだけは必ず設定）
//   SMTP_HOST  … 送信サーバー（任意。既定 sv96.xserver.jp）
//   SMTP_PORT  … ポート（任意。既定 465 / SSL）
//   SMTP_USER  … SMTP認証ユーザー（任意。既定 support@leap-transport.com）
//
// ※ エックスサーバーは SMTP 認証アカウントと From が別ドメインだと拒否されるため、
//    From は必ず SMTP_USER（support@leap-transport.com）を使う。

import nodemailer from 'nodemailer';

// 環境変数はダッシュボードへの貼り付け時に前後の空白や改行が混入しやすく、
// そのまま渡すと認証が通らない（EAUTH）ため、必ず trim してから使う。
export const SMTP_USER = (process.env.SMTP_USER || 'support@leap-transport.com').trim();
const SMTP_HOST = (process.env.SMTP_HOST || 'sv96.xserver.jp').trim();
const SMTP_PORT = Number(String(process.env.SMTP_PORT || '465').trim());

function smtpPass() {
  return (process.env.SMTP_PASS || '').trim();
}

export function smtpConfigured() {
  return Boolean(smtpPass());
}

// CC の解決。環境変数が未設定なら既定値を使い、空文字を設定すると CC なしにできる。
export function resolveCc(envValue, fallback) {
  const v = envValue === undefined ? fallback : String(envValue).trim();
  return v || undefined;
}

// 送信失敗の原因（接続不可 ECONNECTION／認証失敗 EAUTH／タイムアウト ETIMEDOUT など）を
// 画面から切り分けられるようにする。SMTP の応答文には認証情報やサーバー構成が
// 含まれうるため、外に出すのは短いコードだけに留める。
export function mailErrorCode(err) {
  const code = err && (err.code || err.responseCode);
  return code ? String(code).slice(0, 20) : 'UNKNOWN';
}

export async function sendMail({ fromName, to, cc, replyTo, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true, // 465 は SSL/TLS
    auth: {
      user: SMTP_USER,
      pass: smtpPass(),
    },
    // サーバーレス関数の実行時間上限より先に諦めさせる。
    // 上限に当たるとプラットフォームが HTML のエラーを返してしまい、
    // 原因（接続不可なのか認証失敗なのか）が画面にもログにも残らないため。
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });

  try {
    const info = await transporter.sendMail({
      from: fromName ? `${fromName} <${SMTP_USER}>` : SMTP_USER,
      to,
      cc,
      replyTo,
      subject,
      text,
      html,
    });
    // 「送信できた」と「相手に届いた」は別。ここで分かるのは SMTP サーバーが
    // 引き受けたところまでなので、どの宛先を受理／拒否したかを記録しておく。
    console.log('sendMail accepted:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    return info;
  } catch (err) {
    // どの接続先・どの認証ユーザーで失敗したかがログから分かるようにする。
    // パスワードは出さず、設定されているかと文字数だけを記録する。
    console.error('sendMail failed:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      passLength: smtpPass().length,
      code: err && err.code,
      response: err && err.response,
    });
    throw err;
  }
}
