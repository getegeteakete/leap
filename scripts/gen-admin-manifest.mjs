// 管理画面用マニフェスト生成スクリプト
// 各ページ HTML を解析し、表示される写真（<img>/<source>/<video poster>/背景画像）を
// アセット単位で列挙する。ラベルは alt / 近傍の見出し等から推定。
// 実行: node scripts/gen-admin-manifest.mjs  → assets/admin-manifest.json を出力
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  { file: 'index.html', title: 'トップページ' },
  { file: 'company.html', title: '会社案内' },
  { file: 'business.html', title: '事業内容' },
  { file: 'transport.html', title: '運送・物流サービス' },
  { file: 'delivery.html', title: '家電配送・設置' },
  { file: 'office-honsha.html', title: '本社営業所' },
  { file: 'office-kanagawa.html', title: '神奈川営業所' },
  { file: 'office-ibaraki.html', title: '茨城営業所' },
  { file: 'recruit.html', title: '採用情報' },
  { file: 'recruit2.html', title: '採用情報（ドライバー）' },
  { file: 'news.html', title: 'お知らせ' },
  { file: 'contact.html', title: 'お問い合わせ' },
];

const MEDIA_RE = /\.(jpe?g|png|webp|avif|gif|mp4)$/i;

// HTML から画像URLとラベル候補を抽出
function extractSlots(html) {
  const slots = new Map(); // assetPath -> { label, count }
  const add = (rawPath, label) => {
    if (!rawPath) return;
    let p = rawPath.trim().replace(/^["']|["']$/g, '');
    p = p.split('?')[0].split('#')[0];
    if (!p.startsWith('/assets/')) return;
    if (!MEDIA_RE.test(p)) return;
    const key = p.replace(/^\//, ''); // assets/xxx.jpg
    const cur = slots.get(key) || { label: '', count: 0 };
    cur.count += 1;
    if (label && (!cur.label || label.length > cur.label.length) && label.length <= 60) {
      cur.label = label.replace(/\s+/g, ' ').trim();
    }
    slots.set(key, cur);
  };

  // <img ... > タグ単位で src / alt を拾う
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags) {
    const src = (tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    const alt = (tag.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1];
    add(src, alt);
    // srcset 内の候補も同一スロット扱い
    const srcset = (tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (srcset) srcset.split(',').forEach((s) => add(s.trim().split(/\s+/)[0], alt));
  }

  // <source src / srcset>（picture / video）
  const sourceTags = html.match(/<source\b[^>]*>/gi) || [];
  for (const tag of sourceTags) {
    add((tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1], '');
    const srcset = (tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (srcset) srcset.split(',').forEach((s) => add(s.trim().split(/\s+/)[0], ''));
  }

  // <video poster>
  const videoTags = html.match(/<video\b[^>]*>/gi) || [];
  for (const tag of videoTags) add((tag.match(/\bposter\s*=\s*["']([^"']+)["']/i) || [])[1], '動画ポスター');

  // インライン背景画像 style="background-image:url(...)"
  const bgs = html.match(/background(?:-image)?\s*:\s*url\(([^)]+)\)/gi) || [];
  for (const bg of bgs) add((bg.match(/url\(([^)]+)\)/i) || [])[1], '背景画像');

  return slots;
}

function fileSize(assetPath) {
  try { return statSync(join(ROOT, assetPath)).size; } catch { return null; }
}

const pages = [];
const globalAssets = new Set();
for (const p of PAGES) {
  let html;
  try { html = readFileSync(join(ROOT, p.file), 'utf8'); }
  catch { continue; }
  const slots = extractSlots(html);
  const photos = [...slots.entries()]
    .map(([path, info]) => ({ path, label: info.label || '', uses: info.count, size: fileSize(path) }))
    .filter((s) => s.size !== null) // 実在するアセットのみ
    .sort((a, b) => a.path.localeCompare(b.path));
  photos.forEach((s) => globalAssets.add(s.path));
  pages.push({ file: p.file, title: p.title, photoCount: photos.length, photos });
}

const manifest = {
  generatedNote: 'このファイルは scripts/gen-admin-manifest.mjs で自動生成されます。手動編集は上書きされます。',
  pages,
  totalUniqueAssets: globalAssets.size,
};

writeFileSync(join(ROOT, 'assets/admin-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest 生成完了: ${pages.length} ページ / ユニーク画像 ${globalAssets.size} 点`);
for (const pg of pages) console.log(`  ${pg.file.padEnd(22)} ${pg.photoCount} 点`);
