// Apps whose member barcode can't be used from a screenshot, from research/fixed-barcode-apps.md (2026-10).
// kind: 'dynamic' = the barcode changes over time; 'noScreenshot' = the terms forbid screenshots.
const KNOWN = [
  { keys: ['楽天', 'rakuten'], kind: 'dynamic', label: '楽天ポイントカード', note: 'アプリのバーコードは表示のたびに変わります。手元のプラスチックカードを読み取るか、「公式アプリ」として登録してください。' },
  { keys: ['vポイント', 'tポイント', 'モバイルv', 'vpoint', 'tsutaya'], kind: 'dynamic', label: 'Vポイント', note: 'アプリのバーコードには有効期限があり、公式にスクショでの利用が禁止されています。「公式アプリ」として登録してください。' },
  { keys: ['dポイント', 'd払い', 'ドコモ', 'docomo'], kind: 'dynamic', label: 'dポイント', note: '2026年7月から、アプリの「つかう」画面は5分で変わります。プラスチックカードの番号は変わらないので、カードの方を読み取ってください。' },
  { keys: ['阪急', '阪神', 'おでかけ'], kind: 'dynamic', label: '阪急阪神おでかけアプリ', note: 'バーコードは5分で無効になります。「公式アプリ」として登録してください。' },
  { keys: ['ブックオフ', 'bookoff'], kind: 'dynamic', label: 'ブックオフアプリ', note: 'バーコードが時間で変わるという報告があります(公式には未確認)。うまく使えなければ「公式アプリ」として登録してください。' },
  { keys: ['ゆうゆう', '郵便'], kind: 'noScreenshot', label: 'ゆうゆうポイント', note: '公式に「スクリーンショットではポイントを獲得できない」とされています。「公式アプリ」として登録してください。' },
  { keys: ['スポーツポイント', 'ゼビオ', 'ヴィクトリア', 'xebio'], kind: 'noScreenshot', label: 'スポーツポイント', note: '公式にスクリーンショットでの利用はできないとされています。「公式アプリ」として登録してください。' },
];

export function lookupKnownApp(name) {
  const n = String(name || '').toLowerCase().replace(/\s/g, '');
  if (!n) return null;
  return KNOWN.find((k) => k.keys.some((key) => n.includes(key))) || null;
}
