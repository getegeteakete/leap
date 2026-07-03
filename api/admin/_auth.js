// 管理画面 共通認証ユーティリティ（ステートレス・署名トークン）
// トークン = "<expMs>.<hmacHex>" 。HMAC-SHA256(expMs, ADMIN_SECRET)。
// ADMIN_SECRET 未設定時は ADMIN_PASSWORD を署名鍵に流用。両方未設定なら認証は無効（503）。
import crypto from 'node:crypto';

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8時間

export function adminSecret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
}

export function isConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sign(expMs, secret) {
  return crypto.createHmac('sha256', secret).update(String(expMs)).digest('hex');
}

export function issueToken() {
  const secret = adminSecret();
  const exp = Date.now() + TOKEN_TTL_MS;
  return { token: `${exp}.${sign(exp, secret)}`, expiresAt: exp };
}

export function verifyToken(token) {
  const secret = adminSecret();
  if (!secret || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(exp, secret);
  if (sig.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// パスワード照合（タイミング安全）
export function passwordMatches(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || typeof input !== 'string') return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// リクエストの Authorization: Bearer <token> を検証
export function requireAuth(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  return verifyToken(token);
}

// 簡易 body パーサ（Vercel は JSON を自動パースするが文字列で来る場合に備える）
export function parseBody(req) {
  let d = req.body;
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch { d = {}; }
  }
  return d || {};
}
