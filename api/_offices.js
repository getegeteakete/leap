// 営業所ごとの連絡先と、自動返信メールの署名（先頭が _ のファイルは Vercel の API エンドポイントにならない）
//
// フォームで選ばれた窓口・応募先の文字列から営業所を判定し、その営業所を主とした
// 署名を組み立てる。営業所の連絡先だけだと本社へ連絡したいときに番号が分からなく
// なるため、営業所の場合は本社の代表番号も併記する。

const HONSHA = {
  name: '',                       // 本社は社名のみを出すため空
  zip: '344-0121',
  address: '埼玉県春日部市上柳77',
  tel: '048-796-3296',
  fax: '048-796-3298',
};

const OFFICES = [
  {
    keyword: '神奈川',
    name: '神奈川営業所',
    zip: '206-0824',
    address: '東京都稲城市若葉台3-12-4',
    tel: '042-401-4098',
    fax: '042-401-4099',
  },
  {
    keyword: '茨城',
    name: '茨城営業所',
    zip: '300-0066',
    address: '茨城県土浦市虫掛3632-2',
    tel: '029-896-9700',
    fax: '029-896-9702',
  },
];

// 「わからない・お任せ」や未選択も含め、該当しないものはすべて本社に寄せる。
// 判定の仕方は api/apply.js の送信先振り分けと同じ（部分一致）。
export function resolveOffice(officeText) {
  const s = String(officeText || '');
  return OFFICES.find((o) => s.includes(o.keyword)) || HONSHA;
}

export function officeSignature(officeText) {
  const o = resolveOffice(officeText);
  const lines = [
    '────────────────────────',
    o.name ? `株式会社リープ ${o.name}` : '株式会社リープ',
    `〒${o.zip} ${o.address}`,
    `TEL：${o.tel}／FAX：${o.fax}`,
    '営業時間：平日 8:30〜18:00',
  ];
  if (o !== HONSHA) {
    lines.push('', `本社 TEL：${HONSHA.tel}`);
  }
  lines.push('https://leap-transport.com/', '────────────────────────');
  return lines.join('\n') + '\n';
}
