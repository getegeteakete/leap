// POST /api/admin/auth  { password } → { token, expiresAt }
// 管理画面ログイン。ADMIN_PASSWORD と照合し、成功時に署名トークンを返す。
import { isConfigured, passwordMatches, issueToken, parseBody } from './_auth.js';

// ウォームインスタンス内の簡易ブルートフォース抑止
function rateLimited(req) {
  const store = globalThis.__rl_admin_auth || (globalThis.__rl_admin_auth = new Map());
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), WINDOW = 60000, MAX = 10;
  const arr = (store.get(ip) || []).filter((t) => now - t < WINDOW);
  if (arr.length >= MAX) return true;
  arr.push(now); store.set(ip, arr);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ error: '管理機能が未設定です（環境変数 ADMIN_PASSWORD を設定してください）。' });
  }
  if (rateLimited(req)) {
    return res.status(429).json({ error: '試行回数が多すぎます。しばらく待って再度お試しください。' });
  }
  const { password } = parseBody(req);
  if (!passwordMatches(password)) {
    return res.status(401).json({ error: 'パスワードが違います。' });
  }
  const { token, expiresAt } = issueToken();
  return res.status(200).json({ ok: true, token, expiresAt });
}
