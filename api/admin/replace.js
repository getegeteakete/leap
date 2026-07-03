// POST /api/admin/replace
//   Authorization: Bearer <token>
//   body: { path, filename, contentBase64, comment? }
// 指定アセット（assets/ 配下・既存ファイルのみ）を GitHub Contents API で上書きコミットする。
// Vercel が対象ブランチへの push を検知して自動再デプロイ → 数十秒〜数分で全ページに反映。
//
// 必要な環境変数:
//   ADMIN_PASSWORD  … 管理ログイン用（必須）
//   ADMIN_SECRET    … トークン署名鍵（任意。未設定なら ADMIN_PASSWORD を流用）
//   GITHUB_TOKEN    … contents:write 権限の PAT（必須）
//   GITHUB_REPO     … "owner/repo"（例: getegeteakete/leap）（必須）
//   GITHUB_BRANCH   … 反映先ブランチ（任意・既定 main）
import { requireAuth, parseBody } from './_auth.js';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB（Vercel のリクエストボディ上限に合わせる）
const PATH_RE = /^assets\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif|gif|mp4)$/i;

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  avif: 'image/avif', gif: 'image/gif', mp4: 'video/mp4',
};

// マジックバイトで実体を軽く検証（拡張子詐称の抑止）
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  const ft = buf.toString('ascii', 4, 8);
  if (ft === 'ftyp') return buf.toString('ascii', 8, 11) === 'avi' ? 'avif' : 'mp4';
  return null;
}

async function gh(pathname, opts, token) {
  return fetch(`https://api.github.com${pathname}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'leap-admin-photo-manager',
      ...(opts && opts.headers),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req)) return res.status(401).json({ error: '認証が必要です。再度ログインしてください。' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_REPO;
  const BRANCH = process.env.GITHUB_BRANCH || 'main';
  if (!GITHUB_TOKEN || !REPO || !/^[^/]+\/[^/]+$/.test(REPO)) {
    return res.status(503).json({ error: '保存先が未設定です（環境変数 GITHUB_TOKEN / GITHUB_REPO を設定してください）。' });
  }

  const { path, filename, contentBase64, comment } = parseBody(req);

  if (!path || !PATH_RE.test(path)) {
    return res.status(400).json({ error: '対象パスが不正です（assets/ 配下の画像ファイルのみ）。' });
  }
  if (typeof contentBase64 !== 'string' || contentBase64.length < 8) {
    return res.status(400).json({ error: '画像データがありません。' });
  }

  let buf;
  try {
    buf = Buffer.from(contentBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  } catch {
    return res.status(400).json({ error: '画像データを読み取れませんでした。' });
  }
  if (buf.length === 0) return res.status(400).json({ error: '画像データが空です。' });
  if (buf.length > MAX_BYTES) {
    return res.status(413).json({ error: `ファイルが大きすぎます（上限 ${Math.floor(MAX_BYTES / 1024 / 1024)}MB）。画像を縮小してください。` });
  }

  const ext = path.split('.').pop().toLowerCase();
  const kind = sniff(buf);
  const norm = (k) => (k === 'jpeg' ? 'jpg' : k);
  if (kind && norm(kind) !== norm(ext)) {
    return res.status(400).json({ error: `画像形式が拡張子（.${ext}）と一致しません。` });
  }

  try {
    // 既存ファイルの SHA を取得（存在しないパスへの新規作成は不可＝上書き専用）
    const cur = await gh(`/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(BRANCH)}`, {}, GITHUB_TOKEN);
    if (cur.status === 404) {
      return res.status(400).json({ error: '対象の画像が見つかりません（既存アセットの差し替えのみ可能です）。' });
    }
    if (!cur.ok) {
      const t = await cur.text().catch(() => '');
      return res.status(502).json({ error: 'GitHub との通信に失敗しました。', detail: t.slice(0, 200) });
    }
    const { sha } = await cur.json();

    const safeName = (filename || '(不明)').replace(/[\r\n]/g, ' ').slice(0, 80);
    const message = `管理画面: ${path} を差し替え` + (comment ? `（${String(comment).replace(/[\r\n]/g, ' ').slice(0, 80)}）` : '') + `\n\nアップロード: ${safeName} / ${(buf.length / 1024).toFixed(0)}KB`;

    const put = await gh(`/repos/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: buf.toString('base64'),
        sha,
        branch: BRANCH,
      }),
    }, GITHUB_TOKEN);

    if (!put.ok) {
      const t = await put.text().catch(() => '');
      return res.status(502).json({ error: 'コミットに失敗しました。', detail: t.slice(0, 200) });
    }
    const data = await put.json();
    return res.status(200).json({
      ok: true,
      path,
      mime: MIME[ext] || 'application/octet-stream',
      bytes: buf.length,
      commit: { sha: data.commit && data.commit.sha, url: data.commit && data.commit.html_url },
      branch: BRANCH,
    });
  } catch (err) {
    return res.status(500).json({ error: 'サーバーエラー', detail: String(err).slice(0, 200) });
  }
}
