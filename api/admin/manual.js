// 管理画面 操作手順書の配信（ログイン必須）
//
// 手順書には環境変数名・PAT発行手順などの運用情報が含まれるため、
// 公開ファイルとしては置かず、認証を通したこのエンドポイントからのみ配信する。
// （サーバーレス関数のソースはブラウザから読めないため、本文をここに保持する）

import { requireAuth, isConfigured } from './_auth.js';

const MANUAL_HTML = `
<h2>1. この画面でできること</h2>
<ul>
  <li>サイト内の<strong>既存の写真を「上書き差し替え」</strong>できます。</li>
  <li>ファイル名は変えずに中身だけを差し替えるため、その写真を使っている<strong>すべてのページに自動で反映</strong>されます。</li>
  <li>差し替えると GitHub へ自動でコミットされ、Vercel が再デプロイします。<strong>反映まで数十秒〜数分</strong>かかります。</li>
</ul>
<div class="note">
  この画面でできるのは<strong>既存写真の上書きのみ</strong>です。新しい写真の追加や、新しい写真枠の作成はできません（安全のための制限です）。
</div>

<h2>2. 使い方</h2>
<ol>
  <li>ログインします（ログイン状態は<strong>8時間</strong>保持されます。切れたら再ログインしてください）。</li>
  <li>上部の一覧から<strong>対象のページ</strong>を選びます。</li>
  <li>そのページ内の<strong>差し替えたい写真</strong>の「差し替え」ボタンを押します。</li>
  <li>新しい画像ファイルを選びます（ドラッグ＆ドロップも可）。</li>
  <li>必要に応じてメモを入力し、「差し替えを反映」を押します。</li>
  <li>数十秒〜数分待ってから、サイトを開いて確認します。</li>
</ol>
<div class="note">
  反映を確認するときは、ブラウザに古い画像が残っていることがあります。
  <strong>スーパーリロード</strong>（Windows: <code>Ctrl</code>+<code>Shift</code>+<code>R</code> ／ Mac: <code>Cmd</code>+<code>Shift</code>+<code>R</code>）で読み直してください。
</div>

<h2>3. 画像を用意するときの注意</h2>
<ul>
  <li><strong>1ファイル約4MBまで</strong>です。大きい画像は自動で縮小（長辺2000px・JPEG化）してから送信しますが、それでも超える場合はエラーになります。</li>
  <li>形式は <strong>JPEG / PNG / WebP</strong> に対応しています。</li>
  <li><strong>動画（.mp4）は差し替えできません</strong>。容量が大きいためです。動画の変更が必要な場合は制作担当までご連絡ください。</li>
  <li>差し替え後は元の写真に戻せません。<strong>元の画像は手元に保管</strong>しておくことをおすすめします。</li>
</ul>

<h2>4. 困ったときは</h2>
<table>
  <thead><tr><th>症状</th><th>確認すること</th></tr></thead>
  <tbody>
    <tr>
      <td>差し替えたのにサイトが変わらない</td>
      <td>① スーパーリロードで読み直す　② 数分待ってから再確認（再デプロイ中の可能性）</td>
    </tr>
    <tr>
      <td>「ログインが必要です」と出る</td>
      <td>8時間の有効期限切れです。再ログインしてください。</td>
    </tr>
    <tr>
      <td>アップロードでエラーになる</td>
      <td>ファイルサイズ超過（4MB制限）か、動画ファイルの可能性があります。</td>
    </tr>
    <tr>
      <td>「設定されていません」と出る</td>
      <td>サーバー側の設定が未完了です。制作担当までご連絡ください。</td>
    </tr>
  </tbody>
</table>

<h2>5. パスワードの取り扱い</h2>
<ul>
  <li>この画面のパスワードは、サイトの写真を変更できる権限そのものです。<strong>社外への共有はお控えください。</strong></li>
  <li>共有の必要がある場合や、変更をご希望の場合は制作担当までご連絡ください。</li>
  <li>共用パソコンでお使いの場合は、作業後に<strong>「ログアウト」</strong>を押してください。</li>
</ul>

<hr>

<h2>技術情報（制作・保守担当者向け）</h2>
<p class="small">以下は運用担当者の方が操作する必要はありません。保守作業時の参照用です。</p>

<h3>環境変数（Vercel → Settings → Environment Variables）</h3>
<table>
  <thead><tr><th>変数名</th><th>必須</th><th>説明</th></tr></thead>
  <tbody>
    <tr><td><code>ADMIN_PASSWORD</code></td><td>必須</td><td>管理画面ログイン用のパスワード</td></tr>
    <tr><td><code>ADMIN_SECRET</code></td><td>任意</td><td>トークン署名鍵。未設定なら <code>ADMIN_PASSWORD</code> を流用。長いランダム文字列を別途設定するのが望ましい</td></tr>
    <tr><td><code>GITHUB_TOKEN</code></td><td>必須</td><td>Contents: Read and write 権限を持つ GitHub Personal Access Token</td></tr>
    <tr><td><code>GITHUB_REPO</code></td><td>必須</td><td>対象リポジトリ（<code>owner/repo</code> 形式）</td></tr>
    <tr><td><code>GITHUB_BRANCH</code></td><td>任意</td><td>反映先ブランチ。既定は <code>main</code></td></tr>
  </tbody>
</table>
<p class="small">設定後は、変数を反映させるため一度<strong>再デプロイ</strong>が必要です。</p>

<h3>GITHUB_TOKEN の作成手順</h3>
<p class="small">権限を絞れる Fine-grained PAT を推奨します。</p>
<ol>
  <li>GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token</li>
  <li>Repository access で「Only select repositories」を選び、対象リポジトリを指定</li>
  <li>Permissions → Repository permissions → <strong>Contents</strong> を <strong>Read and write</strong> に設定</li>
  <li>有効期限を設定して生成し、Vercel の <code>GITHUB_TOKEN</code> に登録</li>
</ol>
<div class="note">
  PAT は GitHub の書き込み権限そのものです。Vercel の環境変数以外に貼り付けないでください。
  漏洩時は GitHub 上で直ちに Revoke し、新しいトークンを発行して差し替えます。
</div>

<h3>写真スロット（マニフェスト）の更新</h3>
<p class="small">対象ページや写真を増やした場合は、マニフェストの再生成が必要です。</p>
<pre><code>node scripts/gen-admin-manifest.mjs</code></pre>
<p class="small">
  実行すると <code>assets/admin-manifest.json</code> が更新されます。更新後はコミットして push してください。
  この画面はこのファイルを参照して一覧を表示しています。
</p>

<h3>エラーコードの意味</h3>
<table>
  <thead><tr><th>コード</th><th>原因</th></tr></thead>
  <tbody>
    <tr><td>401</td><td>トークン期限切れ（8時間）または未ログイン</td></tr>
    <tr><td>503</td><td>サーバー側の環境変数が未設定。設定後に再デプロイが必要</td></tr>
    <tr><td>413 / アップロード失敗</td><td>ファイルサイズ超過（Vercel のリクエストボディ上限 約4MB）</td></tr>
  </tbody>
</table>
`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ error: '管理機能が未設定です。' });
  }
  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'ログインが必要です。再度ログインしてください。' });
  }
  // 検索エンジン・中間キャッシュに残さない
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return res.status(200).json({ html: MANUAL_HTML });
}
