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

export const SMTP_USER = process.env.SMTP_USER || 'support@leap-transport.com';

export function smtpConfigured() {
  return Boolean(process.env.SMTP_PASS);
}

export async function sendMail({ fromName, to, replyTo, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'sv96.xserver.jp',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true, // 465 は SSL/TLS
    auth: {
      user: SMTP_USER,
      // 管理画面へ貼り付ける際に紛れ込む前後の空白・改行を落とす
      pass: String(process.env.SMTP_PASS || '').trim(),
    },
    // 応答がない場合に関数のタイムアウトまで待たず、原因の分かるエラーで落とす
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter.sendMail({
    from: fromName ? `${fromName} <${SMTP_USER}>` : SMTP_USER,
    to,
    replyTo,
    subject,
    text,
    html,
  });
}
