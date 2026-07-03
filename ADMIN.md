# 写真管理画面（Admin）セットアップ手順書

株式会社リープの静的サイト（Vercelデプロイ／リポジトリ `getegeteakete/leap`）に追加した、写真差し替え用の管理画面についての手順書です。

## 1. 概要（何ができるか）

- 管理画面 `/admin.html` から、サイト内の**既存アセット画像を「上書き差し替え」**できます。
- ファイル名を変えずに中身だけを差し替えるため、その画像を参照している**全ページに自動で反映**されます。
- 差し替えの流れ:
  1. `/admin.html` でパスワードログイン（`/api/admin/auth` が署名トークンを発行。8時間有効）。
  2. ページと写真を選び、新しい画像を選択して差し替え。
  3. `/api/admin/replace` サーバーレス関数が GitHub Contents API 経由で対象ブランチにコミット。
  4. Vercel が push を検知して自動再デプロイ。**数十秒〜数分で本番反映**されます。
- 対象ページ・写真の一覧は `assets/admin-manifest.json`（`scripts/gen-admin-manifest.mjs` で自動生成）に基づきます。

> 注意: この画面でできるのは**既存アセットの上書きのみ**です。新規ファイルの追加や、新しい写真スロットの作成はできません（安全のため）。

## 2. 初期セットアップ

### 2-1. 環境変数の設定

Vercel のダッシュボード → 対象プロジェクト → **Settings → Environment Variables** で以下を設定します。

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `ADMIN_PASSWORD` | 必須 | 管理画面ログイン用のパスワード。 |
| `ADMIN_SECRET` | 任意 | トークン署名鍵。未設定なら `ADMIN_PASSWORD` を流用します。**推奨: 長いランダム文字列を別途設定**。 |
| `GITHUB_TOKEN` | 必須 | `contents:write` 権限を持つ GitHub Personal Access Token（PAT）。→ 2-2 参照。 |
| `GITHUB_REPO` | 必須 | `getegeteakete/leap` |
| `GITHUB_BRANCH` | 任意 | 反映先ブランチ。既定は `main`。本番ブランチを指定します。 |

設定後は、変数を反映させるため一度**再デプロイ**してください。

### 2-2. GITHUB_TOKEN（PAT）の作り方

Fine-grained PAT を推奨します（権限を対象リポジトリ・Contents のみに絞れるため）。

1. GitHub → 右上のアイコン → **Settings** → 左メニュー下部の **Developer settings**。
2. **Personal access tokens → Fine-grained tokens** → **Generate new token**。
3. **Repository access** で「Only select repositories」を選び、**`getegeteakete/leap`** を指定。
4. **Permissions → Repository permissions → Contents** を **Read and write** に設定。
5. 有効期限を設定してトークンを生成し、表示されたトークン文字列をコピー。
6. Vercel の `GITHUB_TOKEN` に貼り付けて保存。

> Classic PAT を使う場合は `repo`（`contents:write` を含む）スコープが必要ですが、権限が広くなるため Fine-grained を推奨します。

### 2-3. リポジトリ・ブランチの指定

- `GITHUB_REPO` = `getegeteakete/leap`
- `GITHUB_BRANCH` = 本番ブランチ（既定 `main`）。デプロイ対象と一致させてください。

## 3. 使い方

1. ブラウザで **`https://（本番ドメイン）/admin.html`** を開く。
2. `ADMIN_PASSWORD` でログイン（トークンは8時間有効。切れたら再ログイン）。
3. 一覧から**対象ページ**を選択。
4. そのページ内の**写真スロット**を選び、差し替える画像ファイルを選択。
5. 差し替えを実行。GitHub へのコミットと Vercel の再デプロイが自動で走ります。
6. **反映待ち**（数十秒〜数分）。反映確認時はブラウザキャッシュ対策で**スーパーリロード**（Windows: `Ctrl+Shift+R` / Mac: `Cmd+Shift+R`）を推奨。

## 4. 写真スロット（マニフェスト）の更新方法

対象ページや写真を増やした場合、マニフェストを再生成する必要があります。

```bash
node scripts/gen-admin-manifest.mjs
```

- 実行すると `assets/admin-manifest.json` が更新されます。
- 更新後は**そのファイルをコミットして push** してください（管理画面はこのマニフェストを参照して一覧を表示します）。
- ページを追加した／ページ内に新しい写真を追加したときは、必ず再実行してください。

## 5. 制約・トラブルシューティング

### 制約

- **1ファイル約4MBまで**: Vercel のリクエストボディ上限の都合です。管理画面側で大きな画像は自動的に縮小（**長辺2000px・JPEG化**）してから送信しますが、それでも超える場合はエラーになります。事前に軽量化してください。
- **動画（.mp4）は対象外になりやすい**: 容量が大きいため、管理画面からの差し替えには向きません。動画の差し替えは**従来どおり git コミット**で行ってください。
- **上書き専用**: 新規ファイルの追加・新しいスロットの作成はできません（安全のため）。

### トラブルシューティング

- **反映されない**: 次の順に確認。
  1. **ブラウザキャッシュ** → スーパーリロードで確認。
  2. **Vercel の再デプロイ待ち／失敗** → Vercel のデプロイ状況を確認。
  3. **PAT の権限・有効期限** → `GITHUB_TOKEN` が対象リポジトリの Contents: Read and write を持ち、期限切れでないか確認。
- **401 が返る**: トークン期限切れ（8時間）または未ログイン。**再ログイン**してください。
- **503 が返る**: サーバー側の環境変数が未設定の可能性。`ADMIN_PASSWORD` / `GITHUB_TOKEN` / `GITHUB_REPO` などが設定されているか確認し、設定後に再デプロイ。
- **アップロードでエラー**: ファイルサイズ超過（4MB制限）や動画ファイルの可能性。画像を軽量化するか、git コミットでの差し替えに切り替えてください。

## 6. セキュリティ上の注意

- **PAT は強力なため漏洩に注意**。GitHub の書き込み権限そのものです。Vercel の環境変数以外に貼り付けない、コードやチャットに残さないこと。
- **Fine-grained PAT** で対象リポジトリ（`getegeteakete/leap`）・**Contents 権限のみ**に絞ることを強く推奨します。有効期限も設定してください。
- 万一漏洩した場合は、GitHub で該当 PAT を即座に **Revoke** し、新しいトークンを発行して `GITHUB_TOKEN` を更新してください。
- `ADMIN_SECRET` は `ADMIN_PASSWORD` とは別の長いランダム文字列を推奨します（署名鍵の分離）。
- この画面は**既存アセットの上書き専用**設計です。任意ファイルの追加や削除はできないため、被害範囲は限定されますが、パスワードとPATの管理は厳重に行ってください。
