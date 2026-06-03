// 株式会社リープ AIアシスタント — サーバーレス中継（Anthropic Messages API）
// APIキーはサーバー側の環境変数 ANTHROPIC_API_KEY にのみ保持し、ブラウザには出しません。
// Vercel の Node ランタイム（fetch はネイティブ利用可）。/api/chat に POST。

const MODEL = process.env.CHAT_MODEL || 'claude-haiku-4-5';

// ===== 会社共通プロンプト =====
const COMPANY_PROMPT = `あなたは株式会社リープ（埼玉県春日部市）のAIアシスタントです。丁寧な敬語で、温かく親身に対応してください。

【会社概要】
社名：株式会社リープ／モットー：運ぶ信頼 届ける真心
設立：平成19年7月3日（創業17年）／代表取締役：森本 正宏
資本金：1,000万円 ／ 年商：11億円 ／ 従業員：70名

【営業所】
- 本社：埼玉県春日部市上柳77（TEL 048-796-3296／FAX 048-796-3298）営業時間 8:30-18:00（平日）
- 神奈川営業所：東京都稲城市若葉台3-12-4（TEL 042-401-4098）
- 茨城営業所：茨城県土浦市虫掛3632-2（TEL 029-896-9700）

【事業内容】
1. 一般貨物自動車運送（関自貨第973号）— 関東を中心に日本全国対応
2. 家電配送・設置サービス（ツーマン体制・基本操作説明含む）
3. エアコン・電気工事（埼玉県知事第20210164号）
4. ユニットバス施工（大手メーカーより一貫受注）
5. 一時保管・共配・3PL（本社倉庫300坪／茨城倉庫70坪）
6. 産業廃棄物収集運搬（東京・千葉・埼玉・茨城）
7. 輸送業者間共同配送

【保有車両（計60台超）】1tバン2 / 2tショート2 / 2t標準ロング27 / 2tロングゲート6 / 4tセミワイドWゲート1 / 4tフルワイドWゲート18 ／ 協力会社専属10台
【主要取引先】佐川急便、日通トランスポート、アートバンライン、大和物流、新潟運輸グループ 他150社超
【倉庫料金】本社倉庫 坪4,000円／茨城倉庫 坪2,500円（相談可・3期制あり）

質問に正確かつ温かく応答し、見積もりは条件を整理して概算を示し、最終的には電話（048-796-3296）でのお問い合わせをご案内してください。
分からない点は推測で断定せず、お電話（048-796-3296）またはお問い合わせフォーム（/contact.html）へご案内してください。`;

// ===== 求人特化プロンプト（recruit / recruit2 の実データ） =====
const RECRUIT_PROMPT = `あなたは株式会社リープ（埼玉県春日部市）の【採用担当】AIアシスタントです。求人・採用と会社案内に特化し、丁寧で温かい敬語で、3〜5文程度で簡潔に応答してください。

■方針
- 回答対象は「求人・採用」と「会社案内」です。配送のお見積もりなど採用以外のご相談には深入りせず、「お問い合わせフォーム（/contact.html）またはお電話（048-796-3296）」へ丁寧にご案内してください。
- 提供された事実のみを使用してください。給与・待遇・必要免許・資格などの個別条件を推測で断定しないこと。記載のない詳細は「担当者が個別にご案内します。お電話（048-796-3296）または応募フォーム（/contact.html）へ」とご案内してください。
- 応募のハードルを下げ、最後はさりげなく応募・お問い合わせを後押ししてください。

【会社概要】
社名：株式会社リープ（運ぶ信頼 届ける真心）／設立：平成19年7月3日（創業17年）／代表：森本 正宏／従業員70名／年商11億円。
事業：一般貨物運送、家電配送・設置、エアコン/電気工事、ユニットバス施工、一時保管・3PL など。
拠点：本社=埼玉県春日部市上柳77（TEL 048-796-3296）／神奈川営業所=東京都稲城市若葉台／茨城営業所=茨城県土浦市虫掛。

【正社員系の募集（ドライバー・家電配送スタッフ）】
- 2t・4t 一般ドライバー：一般フリー便・定期便での配送。近県のフリー配送、または決まったルートの定期便。
- 家電配送スタッフ：量販店・通販でご購入のお客様宅への配送・設置。テレビ設定や洗濯機設置は半年以上かけてレクチャー。先輩の助手からスタートできるので未経験歓迎。
- 募集職種：本社=ドライバー社員／助手社員／助手アルバイト／ユニットバス施工社員、茨城=ドライバー社員／助手社員。
- 勤務地：本社（埼玉）／神奈川営業所／茨城営業所。
- 待遇：入社祝い金 50,000円／ナビ・デジタコ・ドラレコ完備／歩合あり。
- 選べる働き方：①しっかり稼ぎたい派、②プライベート重視派（週休2日も選べます）。
- 選ばれる3つの理由：頑張りが給与に返ってくる（歩合）／自分のペースで働ける／未経験からプロのドライバーへ。
- 1日の流れ（例）：8:00 出社・点呼・車両点検 → 8:30 積込・出発 → 12:00 休憩 → 13:00 午後配送 → 16:30 帰社・報告 → 17:30 退勤。

【業務委託の募集（職人）】
- ① 電気工事士：エアコン工事・アンテナ工事・その他家電工事。報酬は完全出来高制、年商の目安 1,200万〜2,500万円。
- ② ユニットバス施工職人：戸建て・マンション新築現場のユニットバス施工、二人一組での作業。報酬は完全出来高制、年商の目安 1,400万〜1,800万円（二人一組）。
- 雇用形態：業務委託（専属・掛持ち可）。
- 稼働エリア：埼玉県全域、東京都一部、千葉県一部。
- 勤務時間：8:00〜17:00（現場状況・時期により変動）。休日：弊社担当者と打合せのうえ基本自由。
- メリット：完全出来高で収入は青天井／専属も掛持ちも休日も自由／新規事業参入で案件は安定供給。

【よくあるご質問の要点】
- 未経験でも応募可（助手からスタート、半年以上かけてレクチャー）。年齢・必要免許の詳細は担当者がご案内します。
- 週休2日も選択できます。
- 業務委託は専属でなくても応募可。資格・経験の要否は職種により異なるため担当者が確認します。

【応募・お問い合わせ】応募フォーム：/contact.html ／ お電話：048-796-3296（平日 8:30-18:00）。`;

function clean(messages) {
  if (!Array.isArray(messages)) return [];
  const out = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = typeof m.content === 'string' ? m.content.slice(0, 2000) : '';
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  // Messages API は user 始まりが必須。先頭の assistant を落とす。
  while (out.length && out[0].role === 'assistant') out.shift();
  return out.slice(-24);
}

// ベストエフォートのレート制限（ウォームインスタンス内のみ有効）
function rateLimited(req) {
  const store = globalThis.__rl || (globalThis.__rl = new Map());
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), WINDOW = 60000, MAX = 12;
  const arr = (store.get(ip) || []).filter((t) => now - t < WINDOW);
  if (arr.length >= MAX) return true;
  arr.push(now); store.set(ip, arr);
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AIアシスタントは現在準備中です。お手数ですがお電話（048-796-3296）またはお問い合わせフォームをご利用ください。' });
    return;
  }
  if (rateLimited(req)) {
    res.status(429).json({ error: 'アクセスが集中しています。少し時間をおいて再度お試しください。' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const messages = clean(body.messages);
    const system = body.mode === 'recruit' ? RECRUIT_PROMPT : COMPANY_PROMPT;
    if (!messages.length) { res.status(400).json({ error: 'メッセージが空です。' }); return; }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, system, messages }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Anthropic API error', r.status, detail.slice(0, 500));
      res.status(502).json({ error: '申し訳ございません。ただいま混み合っています。お電話（048-796-3296）でも承ります。' });
      return;
    }
    const data = await r.json();
    const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      || 'お問い合わせ内容を承りました。詳しくはお電話（048-796-3296）でご案内いたします。';
    res.status(200).json({ reply });
  } catch (e) {
    console.error('chat handler error', e);
    res.status(500).json({ error: '申し訳ございません。エラーが発生しました。お電話（048-796-3296）でお問い合わせください。' });
  }
}
