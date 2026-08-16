import React, { useState, useEffect } from 'react';

const DATA = __DATA__;

/* ── 設計語彙 ─────────────────────────────────────────────
   眼科臨床檢查室：淡冷灰底、細髮絲線、等寬數字如檢驗報告，
   紅色只保留給「禁區」——這套 SOP 花了數月現場修正才換到的東西。 */
const C = {
  bg: '#E6ECEE', surf: '#FFFFFF', ink: '#0E1A20', ink2: '#5C6E77', ink3: '#8A9AA2',
  rule: '#C6D2D7', hair: '#DDE5E8',
  red: '#B8332A', redBg: '#FAEDEC', redRule: '#E6C4C0',
  teal: '#0B6E86', tealBg: '#E7F1F4',
  amber: '#9C640C', amberBg: '#FAF1E0',
  green: '#2C6E52', greenBg: '#E8F1EC',
};
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SANS = "'Noto Sans TC', system-ui, sans-serif";

const nf = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('en-US');
const pf = (n) => (n == null || isNaN(n) ? '—' : (n >= 0 ? '+' : '−') + (Math.abs(n) * 100).toFixed(1) + '%');
const sf = (n) => (n == null || isNaN(n) ? '—' : (n * 100).toFixed(1) + '%');

const TIER_C = { '嚴重衰退': C.red, '衰退': C.amber, '平穩': C.ink2, '成長': C.green, '新客': C.teal, '流失': C.red };

/* ── 拜訪優先序：按可救度＋急迫性，不按金額 ───────────── */
const PRIORITY = [
  { grp: '建祥體系', band: '時效', head: '7/30 一次吃下 175 盒 Ultra MD', why: '佔全年 38%，8–9 月空窗已成形，去化要當面問，過了就沒得問' },
  { grp: '永誠', band: '救火', head: 'TNF 從月月訂變成全年只有兩單', why: '全通路最大失血 −104,458，但 6 月還下過 150 EA，購買力還在' },
  { grp: '康之友', band: '救火', head: 'TN 630→210 EA，不符併單解釋', why: '側源可能已延伸到可經營戰場，這是本客戶最大風險' },
  { grp: '天康＋天文體系', band: '救火', head: '天康端全滅，倉庫 2025 全年 138,692 去向未明', why: '天文端在長、天康端歸零，合併數字掩蓋了；缺口比原估大了六成' },
  { grp: '益全生技', band: '救火', head: 'SKU 4→2、金額腰斬 −76.1%', why: '7/29 才下過 TN 70 EA，關係還在，但只剩兩條線撐著' },
  { grp: '婕登體系', band: '機會', head: '愛三路新店開半年只鋪兩個品項', why: '同體系長庚店做 8 品，落差就是說服素材' },
  { grp: '康宏安', band: '機會', head: 'HA 空白名單裡規模最大的一家', why: '182,124 的盤子，兩年零 HA' },
  { grp: '皇安', band: '機會', head: '成長 +41.8%，但 P1 佔比在下降', why: '只做 3 個品項，擴品空間最寬' },
];

const BAND_C = { 救火: C.red, 時效: C.amber, 機會: C.teal };

/* ── 每家店的禁區、議題、素材、待補情報 ──────────────── */
const PLAY = {
  '益全生技': {
    redlines: [],
    topics: [
      { t: 'SKU 從 4 條掉到 2 條，問剩下的兩條會不會也走', d: '2026 只剩 HAUD（3/3 一單 11 EA）與 TN（7/29 一單 70 EA）。7/29 那單代表關係還在，但整店只靠兩條線撐著，金額腰斬 −76.1%。' },
      { t: 'TNF 歸零，問是被誰接走', d: '2025 做 20,572（54 EA），最後訂單 2025/08/28，之後連 2025 年底都沒再下，2026 全期零。這條是最大的單一缺口。' },
      { t: 'HAMD 也斷了，末筆停在 2025/03/06', d: '2025 只做 3,333 就停。與 TNF 一起看，是兩條線先後掉光，不是單一事件。' },
    ],
    bring: ['不帶推廣素材——這趟的目的是蒐集情報，不是拿單'],
    intel: ['是否已轉競品？對方條件為何', '經營權、藥師或採購有無異動', '店是否仍正常營業'],
  },
  '建祥體系': {
    redlines: [
      'Ultra UD 不可打價格戰。對方有 32 支裝側源，我方正價沒有競爭力。',
      '不得宣稱 UDPF 是新款或不含防腐劑——公司從未推出 Ultra UD 新款，那只是同一產品的另一個名稱。',
      'HAUD 掛零不是流失，不要當缺口質問。這是活動連動型訂購，無活動掛零屬正常。',
      'Ultra UD 末筆訂單為 2025/11/27（2025 全年做 49,728），不是 5 月——舊資料只到 7 月造成的誤判。掛零不列為可救缺口金額。',
    ],
    topics: [
      { t: '7/30 那 175 盒 Ultra MD 去化到哪了', d: '單筆 175 盒＋贈 25，共 200 EA，佔全年 520 EA 的 38%；2025 年同月只有 20 EA。以月流速約 60 EA 估，這批要吃三個多月。問實際動銷，並預告 8–9 月的空窗。' },
      { t: '下一檔贈品活動的檔期', d: '建祥只在有活動時向我方訂 HAUD。活動排程＝建祥的訂單排程，檔期前主動通知就是拿單動作本身。' },
      { t: 'TNF 掉了 24,517，同時贈品率升到 11.5%', d: '629→460 EA，促銷加碼但量在掉——問題不在條件而在通路端被替代。查是誰在供。' },
    ],
    bring: ['活動檔期表（不談價格）', '24 支裝 vs 32 支裝的使用情境：單次用量、隨身攜帶、開封後保存'],
    intel: ['32 支裝側源的供貨穩定度與價格帶', 'HAUD 側源是否已擴及其他 P1 品項'],
  },
  '永誠': {
    redlines: [
      'P1 在這家店沒有商業空間。不投 P1 推廣資源，不列入 HA 空白滲透名單。',
      'P1 訂單有單照接，但量的波動反映的是側源穩不穩，不是我方經營成效——不得據以判定成長或衰退動能。',
      '「P2 不硬救」的通則在這家店不適用。P2 就是我方在永誠的全部實質業務。',
    ],
    topics: [
      { t: 'TNF 的訂購節奏斷在哪五個月', d: '2025 每月都有單（81／81／81／150／50／100／27 EA）；2026 只剩 3 月 54 EA 與 6 月 150 EA。這不是輸掉價格戰，是節奏斷裂。中間那五個月的貨誰供的？' },
      { t: '查證側源是否已延伸到 P2', d: '特註明列的最優先查證項。P1 側源若已伸進 TNF／TN／DT，永誠這家店就沒有戰場了。' },
      { t: 'DT 是唯一成長線，順勢加深', d: '+10,814，798→1,008 EA。在全店衰退 34% 的背景下，這條要守住並擴大。' },
    ],
    bring: ['P2 檔期條件', '不帶任何 P1 素材'],
    intel: ['側源是否已延伸至 TNF／TN／DT', '6 月那筆 150 EA 大單的採購決策點是什麼'],
  },
  '康之友': {
    redlines: [
      'HAUD 與 C 自 2026/04 起掛零是側源造成的。不判流失、不列滲透名單、不作衰退歸因，也不要再當成「斷單事件」查證。',
      '可經營戰場只有：Ultra MD、Ultra UD ＋ 全部 P2 ＋ 未開發空白（HAMD、X3）。',
      '單月零訂單不等於異常——這家店 2026 起轉為少次多量，判讀請看 2–3 個月移動平均。',
      'Ultra UD 兩個名稱是同一產品，7 月那 10 盒是復單不是新品首單，不要套第二單驗證框架。',
    ],
    topics: [
      { t: 'TN 從 630 EA 掉到 210 EA', d: '2026 只有 1、6、7 月各 70 EA。量掉 67%，「併單」解釋不了——併單只會讓次數變少、單量變大。查 TN 是不是也出現側源。這是 SOP 列的首要議題。' },
      { t: 'Ultra UD 復單後回不回得到節奏', d: '5 月停訂、7 月復單 10 EA，低於 2025 年約 18 EA 的月均。追 8 月是否續單。' },
      { t: 'HAMD 與 X3 是唯一乾淨的增量空間', d: '兩年皆零、且經 Kit 釐清屬未開發空白而非側源品項。這家店只有這兩條線可以從零長。' },
    ],
    bring: ['HAMD／X3 導入方案', 'Ultra MD 節奏維持（+8.5%，唯一成長的 P1）'],
    intel: ['側源是否延伸至 Ultra MD／Ultra UD／P2 —— 本客戶最大的流失風險'],
  },
  '天康＋天文體系': {
    redlines: [
      '不得將天康／天文的增減與彬利連結，或據此推論轉單（2026/08/14 裁定）。已查證：彬利完全沒有吸收天康的 DT，時間也不吻合。',
    ],
    topics: [
      { t: '天康端四個名稱全數歸零', d: '天康倉庫 −77,856、八里 −4,833、天康大藥局 −2,382、天康-學府店 −2,382，2026 全期零；只有基隆南榮路的「天康醫藥生技-天康大藥局」新出現 2,345。問天康端的出貨改由誰承接。' },
      { t: '天文端在長，但 DT 與 TN 大失血', d: '天文大藥局 +23,117、學府店 +6,171 是唯一在長的；但體系 DT −34,447、TN −25,556。查天康端的量有沒有本來就記在天文這邊。' },
      { t: 'TNF 已 109 天沒訂', d: '最後訂單 4/13，平均間隔 30 天，已達 3.6 倍。' },
    ],
    bring: ['C 新進成功（0→7,143）可作擴品素材'],
    intel: ['天康倉庫 2025 那 77,856（主力 DT 672 EA）的去向 —— 這一條要回報源頭，不是店頭能解的'],
  },
  '婕登體系': {
    redlines: [],
    topics: [
      { t: '愛三路新店的鋪貨完整度', d: '開店至今只下過兩單（2/9、5/26），只有 Ultra MD 30 EA 與 C 35 EA，另有一筆 TNF 退貨 7 EA。同體系長庚店做 155,027、8 個品項——把兩張品項清單並排放，說服力最強。' },
      { t: '長庚店 Ultra UD 已 109 天沒訂', d: '23,038→15,171，最後訂單 4/13，達平均間隔 2.3 倍。' },
      { t: 'TN 在 +73% 的成長裡被放掉了', d: '11,430→5,715，140→70 EA。成長客戶內部被放掉的品項，通常沒人會主動提。' },
    ],
    bring: ['長庚店品項清單（作新店對照）', 'HAMD 新進成功（0→15,667）可複製到新店'],
    intel: ['愛三路新店的客層與坪效', 'TNF 退貨的原因'],
  },
  '康宏安': {
    redlines: [
    ],
    topics: [
      { t: 'HA 空白名單裡規模最大的一家', d: '兩年完全沒有 HAUD／HAMD，而盤子有 182,124。素材現成：批發端彬利 0→72,570、門市端弘光 0→29,998、博昱 77,044→190,565。' },
      { t: 'X3 加碼', d: 'X3 新進 24 EA，是全通路 36 EA 中的三分之二——這家店是 X3 的主力，值得往上推。' },
      { t: 'C 歸零接線', d: '2,252→0，最後訂單 2025/01/08。金額小，但是一條斷掉的線。' },
    ],
    bring: ['彬利 HA 批發端導入案例', 'X3 組合方案'],
    intel: ['倉庫配發的下游店數與結構 —— 會影響 HA 導入的鋪貨規模估算'],
  },
  '皇安': {
    redlines: [],
    topics: [
      { t: '表揚之前先把成長品質講清楚', d: '+41.8% 全部來自 TN +17,145 與 DT +4,397；Ultra MD 11,865→11,864 完全持平，P1 佔比反而從 23.0% 掉到 16.2%。這是 P2 帶動的成長，不是體質改善。' },
      { t: '兩年都只做 3 個品項', d: 'Ultra MD、TN、DT。全通路平均 5–6 品，這家店的擴品空間是最寬的。' },
      { t: 'HA 從零導入', d: '兩年完全無 HA 系列。' },
    ],
    bring: ['弘光案例：同為門市端，HAUD 0→29,998、P1 佔比 8.7%→22.2%'],
    intel: ['2025/07 曾出現重複開票後隔日折讓（7/8 開、7/9 沖），確認帳務流程已修正'],
  },
};


/* ══════════════════════════════════════════════════════════
   特註豁免｜單一規則來源 —— 排程頁、客戶卡斷單區、複盤頁預測驗證
   三處全部呼叫 exempt()，禁止任何頁面自行判斷。
   新增規則只改這裡；改完三個頁面同時生效。
   來源：SOP v2.4「已定案的歷史裁定」第 9／10／11 條與第三步之二排除規則。
   ══════════════════════════════════════════════════════════ */
const P1_SET = new Set(['Ultra MD', 'X3', 'Ultra UD', 'HAUD', 'HAMD', 'C']);

const EXEMPT_RULES = [
  {
    id: 'WH',
    match: (g) => g === '彬利藥品',
    tag: '倉庫型',
    why: '彬利為批發／倉庫型客戶，進貨為多點配發，進貨節奏不等於單店流速。（康宏安經 Kit 2026/08/15 裁定為一般門市，不適用本條。）',
    use: '不做斷單與流速判讀。議題改看導入與擴品，不看訂貨間隔。',
    src: 'SOP 第三步之二·排除規則 1',
  },
  {
    id: 'YC-P1',
    match: (g, i) => g === '永誠' && P1_SET.has(i),
    tag: 'P1 側源',
    why: '永誠全部 P1 品項有更便宜的私下貨源，P1 在此店無商業空間。',
    use: '不投 P1 推廣資源、不列 HA 滲透名單。量的波動反映側源穩不穩，不是我方經營成效，不得據以判定成長或衰退。有單照接，並順勢蒐集側源情報。',
    src: 'SOP 裁定第 9 條',
  },
  {
    id: 'KZY-SRC',
    match: (g, i) => g === '康之友' && (i === 'HAUD' || i === 'C'),
    tag: '側源品項',
    why: '康之友自 2026/04 起，HAUD 與 C 已於外部取得更低價貨源。',
    use: '掛零不判流失、不列可救缺口、不列滲透名單、不作衰退歸因。當側源穩定度的觀測指標用：突然回單代表側源出狀況，屬接觸窗口而非復甦訊號。',
    src: 'SOP 裁定第 11 條',
  },
  {
    id: 'JX-HAUD',
    match: (g, i) => g === '建祥體系' && i === 'HAUD',
    tag: '活動連動',
    why: '建祥另有稍便宜的 HAUD 側源，只有我方有贈品活動時價格才較優。',
    use: '無活動期間掛零屬正常，不判流失、不列空白。拿單關鍵是活動檔期前主動通知——活動排程就是建祥的訂單排程。',
    src: 'SOP 裁定第 10 條',
  },
  {
    id: 'JX-UMD',
    match: (g, i) => g === '建祥體系' && i === 'Ultra MD',
    tag: '總倉配發',
    why: '建祥藥局（寧夏路17號）為體系總倉，進貨後會再配至建祥三和藥局。2026/07/30 之 175 盒大單有部分配至三重店，實際配發數量對方未透漏。',
    use: '進貨節奏不等於單店消化流速，不做流速與斷單判讀，不給建議拜訪日。去化狀況只能靠現場詢問，不能由訂單間隔推估。（Kit 2026/08/14 裁定：僅排除 Ultra MD 一條線，建祥其餘品項照常分析。）',
    src: 'SOP 裁定第 10 條補充',
  },
  {
    id: 'JX-UUD',
    match: (g, i) => g === '建祥體系' && i === 'Ultra UD',
    tag: '異規格側源',
    why: '建祥於其他通路取得 32 支裝單支貨源（我方為 24 支裝），UD 線被異規格側源取代。',
    use: '掛零不再列為可救缺口金額。不可打價格戰、不可宣稱新款或不含防腐劑。可用槓桿只剩活動條件與 24 vs 32 支裝的使用情境訴求。',
    src: 'SOP 裁定第 10 條（v2.3 更正）',
  },
];

function exempt(grp, item) {
  return EXEMPT_RULES.find((r) => r.match(grp, item)) || null;
}

/* 議題穩定 ID 與目標類型｜ID 不隨議題文字改寫而變動，歷史紀錄才對得回來 */
const GRP_KEY = {
  '益全生技': 'yq', '建祥體系': 'jx', '永誠': 'yc', '康之友': 'kzy',
  '天康＋天文體系': 'tk', '婕登體系': 'jd', '康宏安': 'khn', '皇安': 'ha',
};
const TOPIC_KIND = {
  '益全生技': ['查證', '查證', '拿單'],
  '建祥體系': ['查證', '拿單', '查證'],
  '永誠': ['查證', '查證', '拿單'],
  '康之友': ['查證', '拿單', '拿單'],
  '天康＋天文體系': ['查證', '查證', '拿單'],
  '婕登體系': ['拿單', '拿單', '拿單'],
  '康宏安': ['拿單', '拿單', '拿單'],
  '皇安': ['查證', '拿單', '拿單'],
};
/* 全部 22 客戶群：優先名單 8 家排前，其餘依 2026 金額。接單補登涵蓋全部。 */
// 排除通路彙總 __CH__：它有 grp 但沒有客戶層欄位，混進來會讓客戶清單多出一筆假客戶
const GROUP_LIST = Object.values(DATA).filter((d) => d.grp && Array.isArray(d.items));
const PRI_SET = new Set(PRIORITY.map((p) => p.grp));
const ALL_GRPS = [
  ...PRIORITY.map((p) => p.grp),
  ...GROUP_LIST.filter((d) => !PRI_SET.has(d.grp)).sort((a, b) => b.s26 - a.s26).map((d) => d.grp),
];

const tid = (grp, i) => `${GRP_KEY[grp]}-t${i + 1}`;
const tkind = (grp, i) => (TOPIC_KIND[grp] || [])[i] || '拿單';
const GRP_KEY_SAFE = (g) => GRP_KEY[g] || 'x';

/* 非優先名單的 14 家沒有手寫議題，依規則自動生成。明確標示來源，不與手寫議題混淆。 */
function autoTopics(grp, entries) {
  const d = DATA[grp]; if (!d) return [];
  const out = [];
  allCadence(grp, entries).forEach((c) => {
    if (exempt(grp, c.item) || !c.ok) return;
    const gap = Math.round((new Date(TODAY_STR()) - new Date(c.last)) / 86400000);
    if (gap >= c.avg_int * 2) out.push({ pri: 1, kind: '查證',
      t: `${c.item} 已 ${gap} 天沒訂`, d: `平均 ${c.avg_int} 天一訂，已達 ${(gap / c.avg_int).toFixed(1)} 倍。問是賣不動、被競品接走，還是採購節奏改了。` });
  });
  (d.zero || []).forEach((z) => {
    if (exempt(grp, z.item)) return;
    out.push({ pri: 2, kind: '拿單', t: `${z.item} 2026 全期歸零`, d: `2025 全年做 ${nf(z.s25)}（${z.e25} EA），末筆訂單 ${z.last}${z.h2 ? '——這條是 2025 下半年才斷的，2026 全期零' : ''}。單線斷掉通常關係還在，優先接線。` });
  });
  const ha = d.items.filter((x) => (x.item === 'HAUD' || x.item === 'HAMD')).reduce((a, x) => a + x.s26, 0);
  if (ha === 0) out.push({ pri: 3, kind: '拿單', t: 'HA 系列兩年未導入',
    d: `這家店 2026 做 ${nf(d.s26)}，HA 一條線都沒有。素材：批發端彬利 0→72,570、門市端弘光 0→29,998、安佑全系列 0→43,379。` });
  if (d.p1sh26 < 0.3) out.push({ pri: 4, kind: '查證', t: `P1 佔比只有 ${sf(d.p1sh26)}`,
    d: `${sf(d.p1sh25)} → ${sf(d.p1sh26)}。先確認是沒推過，還是推過但有側源——有側源的話要先報我加進豁免規則，不要硬推。` });
  if (d.sku26 < d.sku25) out.push({ pri: 5, kind: '查證', t: `品項數 ${d.sku25}→${d.sku26}`,
    d: 'SKU 收縮是轉向競品的前兆，比金額下滑更早出現。問掉的那幾條是誰接走的。' });
  return out.sort((a, b) => a.pri - b.pri).slice(0, 3);
}

const ITEM_FULL = {
  'Ultra MD': 'SYSTANE ULTRA 10ML', 'X3': 'SYSTANE ULTRA 10ML X3', 'Ultra UD': 'SYSTANE ULTRA UD 24X0.5ML',
  'HAUD': 'SYSTANE HA UD 30X0.7ML', 'HAMD': 'SYSTANE HA MULTI-DOSE 10ML', 'C': 'SYSTANE COMPLETE 5ML',
  'TN': 'TEARS NATURALE 15ML', 'TNF': 'TEARS NATURALE FREE', 'DT': 'DURATEARS OINTMENT 3.5G',
};


/* ══════════════════════════════════════════════════════════
   儲存層｜localStorage．單一來源．所有讀寫只走這裡
   - 命名空間 dsipharm: 前綴，避免與同網域下其他 App 撞鍵
   - 每包資料外層帶 schema 版本，載入時跑遷移鏈，遷移前先自動快照
   - 每次寫入前滾動保留最近 5 份快照，可還原
   - 使用者資料（拜訪紀錄）與分析數字（DATA 常數）永遠分開存
   ══════════════════════════════════════════════════════════ */
const NS = 'dsipharm';
const KEY = { data: NS + ':data', backups: NS + ':backups', draft: NS + ':draft', sid: NS + ':sid', imp: NS + ':lastimport' };
const CUTOFF = '2026-07-31';   // 官方 Offtake 資料截止日。補登只認這天之後的訂單。
/* 單價一律鎖定（Kit 2026/08/15 裁定），不可手動更改。
   採用值＝Offtake 報表之 InvoiceSales 單價，**未稅**。
   Kit 提供之進價為含稅（＝未稅 ×1.05），僅供對照顯示，不進入計算——
   兩者混用會使補登金額比官方資料多算 5%，即時 YoY 恆為高估。
   TNF 於 2026/04 由 285.7 調為 333.35（一刀切，與客戶及品名無關），補登一律適用新價。 */
const UNIT = { 'Ultra MD': 169.5, 'X3': 460, 'Ultra UD': 281, 'HAUD': 428.5, 'HAMD': 333.38, 'C': 238.1, 'TN': 95.25, 'TNF': 333.35, 'DT': 58.62 };
const UNIT_TAX = { 'Ultra MD': 178, 'X3': 483, 'Ultra UD': 295, 'HAUD': 450, 'HAMD': 350, 'C': 250, 'TN': 100, 'TNF': 350, 'DT': 61.57 };
const SCHEMA = 2;
const APP_VERSION = '1.15.0';
const BUILD = '2026-08-15';
const BUILD_AT = '__BUILD_AT__';   // 建置當下的台北時間，由打包程序注入
/* 每次交付都遞增 APP_VERSION，資料頁看得到，你才分得出手上是哪一版 */
const CHANGELOG = [
  ['1.15.0', '2026-08-15', '「🔥接單」移至最左並設為預設起始頁'],
  ['1.14.0', '2026-08-15', '接單補登改為一張訂單可一次輸入多個品項，顯示整張合計'],
  ['1.13.0', '2026-08-15', '移除「紀錄」分頁（與拜訪前重複，Kit 裁定一律由客戶卡進入）；拜訪歷程與編輯移至複盤頁'],
  ['1.12.1', '2026-08-15', '補登表單「金額」改稱「報表金額」，明確標示為未稅口徑'],
  ['1.12.0', '2026-08-15', '單價鎖定為報表未稅價，不可手動更改；同時標示對應含稅進價。TNF 採 2026/04 調價後之 333.35'],
  ['1.11.0', '2026-08-15', '新增「待追蹤承諾」：拜訪紀錄裡結果為口頭承諾的議題自動列出並顯示擱置天數'],
  ['1.10.1', '2026-08-15', '修正：版本偵測在缺少 fetch 的環境會導致整頁空白，改為安全略過'],
  ['1.10.0', '2026-08-15', '匯入支援直接選 JSON 檔；資料頁顯示上次匯入時間與來源匯出時間（單向同步用）'],
  ['1.9.2', '2026-08-15', '自動偵測新版本：伺服器有更新時跳出橫幅，一鍵繞過快取載入（解決 iOS 桌面 App 拿到舊版）'],
  ['1.9.1', '2026-08-15', '匯入可選擇覆蓋同 ID 紀錄（跨裝置搬資料用），預覽顯示新增／覆蓋／略過筆數'],
  ['1.9.0', '2026-08-15', '資料頁新增「儲存空間識別碼」：兩個入口顯示同一組碼＝資料互通，不同＝各存各的'],
  ['1.8.1', '2026-08-15', '加入 App 圖示與 iOS 全螢幕支援，可加到主畫面當獨立 App 使用'],
  ['1.8.0', '2026-08-15', '更正：益全末筆訂單為 2026/07/29（原誤記 150 天無單）、建祥 Ultra UD 斷線為 2025/11；優先序重排；歸零線改用 2025 全年判定'],
  ['1.7.0', '2026-08-15', '涵蓋度不足時不計算通路即時成長率（寧可留白）；列出未補登且去年同期有單的客戶'],
  ['1.6.1', '2026-08-15', '頁尾顯示本版建置日期時間；標題列 SOP 版號更正為 v2.8'],
  ['1.6.0', '2026-08-15', '補齊 2025 全年資料：新增雙口徑 YoY（官方已對帳／即時含補登）、2025 同日累計基準、季節性'],
  ['1.6.0', '2026-08-15', '補上 2025 全年資料，新增雙口徑：官方（已對帳）與即時同日累計（含補登，未對帳）並列'],
  ['1.6.0', '2026-08-15', '補上 2025 全年資料：雙口徑改用 2025 同日累計為基準，客戶卡與首頁並列顯示'],
  ['1.5.1', '2026-08-15', '修正：複盤頁因資料欄位變更而空白（預測驗證改由即時節奏計算）'],
  ['1.5.0', '2026-08-15', '康宏安改判為一般門市（Kit 裁定），移出倉庫型豁免，恢復流速與斷單判讀'],
  ['1.4.0', '2026-08-15', '全 22 客戶群納入：接單補登、排程、客戶卡數字全數涵蓋；非優先名單自動生成議題'],
  ['1.3.0', '2026-08-15', '拜訪紀錄可編輯與刪除、可自訂拜訪日期；補登可編輯；加入版號與更新紀錄'],
  ['1.2.0', '2026-08-15', '新增「接單」補登：即時修正排程、斷單與客戶卡；補登與官方資料分離，逾期自動歸檔'],
  ['1.1.0', '2026-08-14', '改為 GitHub Pages 單檔；localStorage 保存、schema 遷移、自動快照、匯出匯入、草稿自動存檔'],
  ['1.0.0', '2026-08-14', '拜訪前議題、紀錄、複盤、排程四頁；特註豁免單一規則來源'],
];
const DATASET = '2026 年 1–7 月';
const MAX_BACKUPS = 5;

/* 儲存空間識別碼：首次啟動產生一次並常駐。兩個入口（Safari／桌面 App）
   若顯示同一組碼＝共用同一個 localStorage；不同碼＝各自獨立，資料不會互通。 */
function storageId() {
  try {
    let v = localStorage.getItem(KEY.sid);
    if (!v) {
      v = Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      localStorage.setItem(KEY.sid, v);
    }
    return v;
  } catch { return '無法讀取'; }
}

const rawGet = (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const rawSet = (k, v) => {
  const str = JSON.stringify(v);
  localStorage.setItem(k, str);
  if (localStorage.getItem(k) !== str) throw new Error('寫入後讀回不一致');
};

/* 遷移鏈：只往前加，不改舊的。未知或更舊的形狀一律先轉成當前 schema。 */
function migrate(blob) {
  if (!blob) return null;
  let b = blob;
  if (Array.isArray(b)) b = { schema: 0, visits: b };            // 早期 artifact 純陣列
  if (typeof b.schema !== 'number') b = { ...b, schema: 0 };
  if (b.schema === 0) {
    b = {
      schema: 1,
      visits: (b.visits || []).map((v) => ({
        ...v,
        createdAt: v.createdAt || new Date().toISOString(),
        topics: (v.topics || []).map((t, i) => ({
          tid: t.tid || `legacy-t${i + 1}`, title: t.title || t.t || '', kind: t.kind || '拿單',
          result: t.result || '沒談到', note: t.note || '',
        })),
      })),
    };
  }
  if (b.schema === 1) b = { ...b, schema: 2, entries: [] };
  return { ...b, schema: SCHEMA, entries: b.entries || [] };
}

/* 補登是否已被新的官方資料涵蓋。涵蓋者歸檔：保留但不列入計算，避免重複計數。 */
const isArchived = (e) => e.date <= CUTOFF;
const liveEntries = (entries) => (entries || []).filter((e) => !isArchived(e));

function snapshot(reason) {
  const cur = rawGet(KEY.data);
  if (!cur) return;
  const list = rawGet(KEY.backups) || [];
  list.unshift({ ts: new Date().toISOString(), reason, payload: cur });
  try { rawSet(KEY.backups, list.slice(0, MAX_BACKUPS)); } catch { /* 空間不足時捨棄備份，不擋主寫入 */ }
}

function loadAll() {
  const raw = rawGet(KEY.data);
  if (!raw) return { blob: null, migrated: false };
  const before = raw.schema;
  const blob = migrate(raw);
  const migrated = before !== SCHEMA;
  if (migrated) { snapshot(`遷移前快照 schema ${before}→${SCHEMA}`); try { rawSet(KEY.data, blob); } catch {} }
  return { blob, migrated };
}

function saveAll(visits, entries) {
  snapshot('存檔前快照');
  const blob = { schema: SCHEMA, updatedAt: new Date().toISOString(), appVersion: APP_VERSION, build: BUILD, dataset: DATASET, cutoff: CUTOFF, visits, entries };
  rawSet(KEY.data, blob);
  return blob;
}

/* 由 artifact 手動轉錄的既有紀錄。僅在完全沒有本機資料時載入一次。 */
const SEED = [{
  id: 'jx-20260814-seed',
  grp: '建祥體系',
  date: '2026-08-14',
  createdAt: '2026-08-14T00:00:00.000Z',
  source: '自 Claude artifact 逐字轉錄',
  topics: [
    { tid: 'jx-t1', title: '7/30 那 175 盒 Ultra MD 去化到哪了', kind: '查證', result: '獲得資訊',
      note: '寧夏店普遍是總倉的角色，這一筆175盒大單有部分是分配到三重店，但實際分配的數量沒有透漏。' },
    { tid: 'jx-t2', title: '下一檔贈品活動的檔期', kind: '拿單', result: '口頭承諾',
      note: '7/29：我有提出如果建祥下單HAUD 10盒，即便公司沒有任何搭贈活動，我會額外送他一盒，平均單價為409，比他從外面找到的便宜源頭來的更優惠。對方口頭說先收下這個資訊，我感覺是有機會再把HAUD再次進到建祥的。' },
    { tid: 'jx-t3', title: 'TNF 掉了 24,517，同時贈品率升到 11.5%', kind: '查證', result: '沒談到', note: '' },
  ],
  intel: '',
  next: '',
}];

/* ══════════════════════════════════════════════════════════
   節奏計算｜唯一來源
   官方訂單（DATA.orders，唯讀）＋ 補登（未歸檔者）合併後計算。
   任何頁面要用間隔／流速／建議日，都呼叫 cadence()，不得自行推算。
   ══════════════════════════════════════════════════════════ */
const TODAY_STR = () => new Date().toISOString().slice(0, 10);

function cadence(grp, item, entries) {
  const base = ((DATA[grp] || {}).orders || {})[item] || [];
  const extra = liveEntries(entries).filter((e) => e.grp === grp && e.item === item)
    .map((e) => [e.date, (Number(e.paidEA) || 0) + (Number(e.giftEA) || 0)]);
  const byDate = {};
  [...base, ...extra].forEach(([d, ea]) => { byDate[d] = (byDate[d] || 0) + ea; });
  const b = Object.entries(byDate).filter(([, ea]) => ea > 0).sort((a, x) => (a[0] < x[0] ? -1 : 1));
  if (b.length === 0) return null;
  const added = extra.length > 0;
  const last = b[b.length - 1][0];
  const lastBatch = b[b.length - 1][1];
  const avgBatch = b.reduce((a, x) => a + x[1], 0) / b.length;
  if (b.length < 2) {
    return { item, n: 1, ok: false, why: '僅 1 筆訂單，無法計算間隔', last, added, avgBatch, lastBatch };
  }
  const ints = b.slice(1).map((x, i) => (new Date(x[0]) - new Date(b[i][0])) / 86400000);
  const avgInt = ints.reduce((a, x) => a + x, 0) / ints.length;
  const ratio = avgBatch ? lastBatch / avgBatch : 1;
  const dep = avgInt * ratio;
  const shift = (d, days) => new Date(new Date(d).getTime() + days * 86400000).toISOString().slice(0, 10);
  const diff = dep - avgInt;
  let ok = true, why = '';
  if (b.length <= 2) { ok = false; why = '僅 2 筆訂單，平均間隔樣本數為 1'; }
  else if (Math.abs(diff) > 90) { ok = false; why = `兩法差距 ${Math.abs(diff).toFixed(0)} 天，流速估計不穩`; }
  return {
    item, n: b.length, ok, why, last, added,
    avg_int: +avgInt.toFixed(1), avg_batch: +avgBatch.toFixed(1), last_batch: +lastBatch.toFixed(1),
    ratio: +ratio.toFixed(2), dep: +dep.toFixed(1), diff: +diff.toFixed(1),
    flow: +(avgBatch / avgInt * 30.44).toFixed(1),
    d_int: shift(last, avgInt - 7), d_dep: shift(last, dep - 7),
    sig: Math.abs(diff) <= 10 ? '穩定' : (diff > 10 ? '剛進大批' : '訂得比平常少'),
  };
}

const allCadence = (grp, entries) => {
  const items = new Set([
    ...Object.keys(((DATA[grp] || {}).orders) || {}),
    ...liveEntries(entries).filter((e) => e.grp === grp).map((e) => e.item),
  ]);
  return [...items].map((i) => cadence(grp, i, entries)).filter(Boolean);
};

/* ══════════════════════════════════════════════════════════
   雙口徑 YoY｜SOP 裁定第 16 條
   官方口徑：官方 Offtake 同期間（1–7 月），已對帳，唯一可對外。
   即時口徑：官方 ＋ 補登，對比 2025 同日累計。2026 端為人工輸入，
             漏登只會少不會多，偏誤恆為低估，僅供內部方向判讀。
   ══════════════════════════════════════════════════════════ */
const CH = DATA.__CH__;
const cum25 = (series, mmdd) => (series || []).reduce((a, [d, v]) => (d <= mmdd ? a + v : a), 0);
const CUT_MMDD = CUTOFF.slice(5);

/* 涵蓋度以「金額」而非「家數」衡量：少打一家大客戶的殺傷力遠大於少打一家小客戶。
   缺口＝2025 同期窗口內、2026 卻沒有任何補登的客戶，其 2025 同期金額佔比。
   缺口 > MAX_GAP 時不輸出通路即時成長率——寧可留白，不給看起來精確的假數字。 */
const MAX_GAP = 0.20;

function windowCoverage(entries, fromMMDD, toMMDD) {
  const has = new Set(liveEntries(entries).filter((e) => {
    const m = e.date.slice(5);
    return m > fromMMDD && m <= toMMDD;
  }).map((e) => e.grp));
  let total = 0; const miss = [];
  GROUP_LIST.forEach((d) => {
    const v = (d.d25 || []).reduce((a, [dt, x]) => (dt > fromMMDD && dt <= toMMDD ? a + x : a), 0);
    if (v <= 0) return;
    total += v;
    if (!has.has(d.grp)) miss.push({ grp: d.grp, v });
  });
  const missV = miss.reduce((a, x) => a + x.v, 0);
  miss.sort((a, b) => b.v - a.v);
  return { total, missV, gap: total ? missV / total : 0, miss, covered: has.size,
           expected: GROUP_LIST.filter((d) => (d.d25 || []).some(([dt, x]) => dt > fromMMDD && dt <= toMMDD && x > 0)).length };
}

function dualYoY(grp, entries) {
  const src = grp ? DATA[grp] : CH;
  if (!src) return null;
  const base26 = grp ? DATA[grp].s26 : CH.s26;
  const base25 = cum25(src.d25, CUT_MMDD);
  const mine = liveEntries(entries).filter((e) => !grp || e.grp === grp);
  const addAmt = mine.reduce((a, e) => a + (Number(e.paidEA) || 0) * (Number(e.unit) || 0), 0);
  const lastEntry = mine.length ? mine.map((e) => e.date).sort().slice(-1)[0] : null;
  const asOf = lastEntry && lastEntry.slice(5) > CUT_MMDD ? lastEntry : CUTOFF;
  const live25 = cum25(src.d25, asOf.slice(5));
  const same = asOf === CUTOFF;
  const cov = same || grp ? null : windowCoverage(entries, CUT_MMDD, asOf.slice(5));
  const suppress = !!cov && cov.gap > MAX_GAP;
  return {
    official: { s25: base25, s26: base26, gr: base25 ? base26 / base25 - 1 : null, asOf: CUTOFF },
    live: { s25: live25, s26: base26 + addAmt, gr: live25 ? (base26 + addAmt) / live25 - 1 : null, asOf, addAmt, n: mine.length },
    same, cov, suppress,
  };
}

/* ── 小元件 ───────────────────────────────────────────── */
const Rule = ({ c = C.hair, my = 0 }) => <div style={{ height: 1, background: c, margin: `${my}px 0` }} />;

const Eyebrow = ({ children, color = C.ink3 }) => (
  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', color, textTransform: 'uppercase' }}>{children}</div>
);

const Num = ({ children, size = 13, color = C.ink, weight = 500 }) => (
  <span style={{ fontFamily: MONO, fontSize: size, color, fontWeight: weight, fontVariantNumeric: 'tabular-nums' }}>{children}</span>
);

function Spark({ a, b }) {
  const all = [...a, ...b];
  const max = Math.max(...all, 1);
  const W = 132, H = 34;
  const path = (arr) => arr.map((v, i) => `${(i / 6) * W},${H - (v / max) * (H - 4) - 2}`).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={path(a)} fill="none" stroke={C.ink3} strokeWidth="1" strokeDasharray="2 2" />
      <polyline points={path(b)} fill="none" stroke={C.teal} strokeWidth="1.6" />
    </svg>
  );
}

/* ── 禁區區塊：整個工具的核心 ─────────────────────────── */
function RedLines({ lines }) {
  if (!lines.length) {
    return (
      <div className="flex" style={{ border: `1px solid ${C.hair}`, background: C.surf }}>
        <div style={{ width: 30, background: '#F2F6F7', borderRight: `1px solid ${C.hair}` }} className="flex items-center justify-center">
          <span style={{ fontFamily: SANS, fontSize: 11, color: C.ink3, writingMode: 'vertical-rl', letterSpacing: '0.3em' }}>通則</span>
        </div>
        <div className="p-3" style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7 }}>
          本店無客戶特註，適用 SOP 通用邏輯。P1 優先、可救度排序、HA 空白視為增量機會。
        </div>
      </div>
    );
  }
  return (
    <div className="flex" style={{ border: `1px solid ${C.redRule}`, background: C.redBg }}>
      <div style={{ width: 30, background: C.red }} className="flex items-center justify-center py-3">
        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 900, color: '#fff', writingMode: 'vertical-rl', letterSpacing: '0.35em' }}>禁區</span>
      </div>
      <div className="p-3" style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 8, letterSpacing: '0.05em' }}>
          進門前先讀。這幾條覆寫通則，照通則做會做錯。
        </div>
        {lines.map((l, i) => (
          <div key={i} className="flex" style={{ marginTop: i ? 9 : 0, gap: 8 }}>
            <Num size={11} color={C.red} weight={600}>{String(i + 1).padStart(2, '0')}</Num>
            <div style={{ fontSize: 13, color: '#4A1E1A', lineHeight: 1.75, flex: 1 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ── 待追蹤承諾 ───────────────────────────────────────────
   口頭承諾＝有進展但還沒到手，是最容易被遺忘的一類。
   不要求使用者手動設追蹤日——按下「口頭承諾」就自動進清單，
   直到同一家、同一議題在更晚的紀錄裡改成其他結果才結案。 */
function pendingPromises(log) {
  const latest = {};
  [...log].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((v) => {
    (v.topics || []).forEach((t) => {
      latest[`${v.grp}|${t.tid || t.title}`] = { grp: v.grp, date: v.date, title: t.title, note: t.note, result: t.result, kind: t.kind };
    });
  });
  const today = TODAY_STR();
  return Object.values(latest)
    .filter((x) => x.result === '口頭承諾')
    .map((x) => ({ ...x, days: Math.round((new Date(today) - new Date(x.date)) / 86400000) }))
    .sort((a, b) => b.days - a.days);
}

function PendingBlock({ log, onGo }) {
  const list = pendingPromises(log);
  if (list.length === 0) return null;
  return (
    <div className="px-4 py-4" style={{ background: C.amberBg, borderBottom: `1px solid ${C.rule}` }}>
      <Eyebrow color={C.amber}>待追蹤承諾 {list.length} 筆 · 對方說了要，但還沒下單</Eyebrow>
      <div style={{ display: 'grid', gap: 8, marginTop: 9 }}>
        {list.map((x, i) => (
          <button key={i} onClick={() => onGo(x.grp)} className="w-full text-left"
            style={{ background: C.surf, border: `1px solid #E0CFA8`, padding: '11px 13px', display: 'block' }}>
            <div className="flex items-baseline flex-wrap" style={{ gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 14.5, fontWeight: 900, color: C.ink }}>{x.grp}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, color: C.ink2 }}>{x.title}</span>
              <span style={{ marginLeft: 'auto' }}>
                <Num size={13} weight={600} color={x.days >= 30 ? C.red : C.amber}>擱置 {x.days} 天</Num>
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.ink3, marginTop: 3 }}>承諾於 {x.date}</div>
            {x.note && (
              <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.7, marginTop: 6, borderLeft: `2px solid #E0CFA8`, paddingLeft: 9 }}>
                {x.note.length > 110 ? x.note.slice(0, 110) + '…' : x.note}
              </div>
            )}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: '#7A5C1A', lineHeight: 1.7, marginTop: 9 }}>
        口頭承諾不會自己變成訂單，放著就會自然死掉。結案方式：下次拜訪時在紀錄裡把同一條議題改成「拿到單」或「對方拒絕」，它就會從這裡消失。
      </div>
    </div>
  );
}

/* ── 畫面一：拜訪優先序 ───────────────────────────────── */
function PrepList({ onPick, entries, log }) {
  return (
    <div>
      <div className="px-4 pt-5 pb-3">
        <Eyebrow>Visit priority · 依可救度排序，不依金額</Eyebrow>
        <h2 style={{ fontFamily: SANS, fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: '-0.01em', marginTop: 6 }}>
          這週先去這幾家
        </h2>
        <p style={{ fontSize: 13, color: C.ink2, marginTop: 6, lineHeight: 1.7 }}>
          益全生技只做 10,000 元卻排第一，永誠做 201,991 排第三。排序看的是「還救不救得回來」跟「有沒有時效」。
        </p>
      </div>
      <Rule c={C.rule} />
      <PendingBlock log={log} onGo={onPick} />
      <DualBlock grp={null} entries={entries} />
      <Rule c={C.rule} />
      {PRIORITY.map((p, i) => {
        const d = DATA[p.grp];
        const scale = i < 2 ? 1 : i < 5 ? 0.92 : 0.86;
        const mine = liveEntries(entries).filter((e) => e.grp === p.grp);
        return (
          <button key={p.grp} onClick={() => onPick(p.grp)}
            className="w-full text-left px-4 py-4"
            style={{ background: C.surf, borderBottom: `1px solid ${C.hair}`, display: 'block' }}>
            <div className="flex items-start" style={{ gap: 14 }}>
              <div style={{ width: 30, flexShrink: 0, paddingTop: 2 }}>
                <div style={{ fontFamily: MONO, fontSize: 24 * scale, fontWeight: 600, color: C.ink3, lineHeight: 1 }}>{i + 1}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                  <span style={{ fontFamily: SANS, fontSize: 17 * scale, fontWeight: 900, color: C.ink }}>{p.grp}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', background: BAND_C[p.band], padding: '2px 6px', letterSpacing: '0.1em' }}>{p.band}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: TIER_C[d.tier] }}>{d.tier}</span>
                </div>
                <div style={{ fontSize: 13.5, color: C.ink, marginTop: 5, fontWeight: 500, lineHeight: 1.55 }}>{p.head}</div>
                <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 3, lineHeight: 1.6 }}>{p.why}</div>
                <div className="flex items-center" style={{ gap: 12, marginTop: 8 }}>
                  <Num size={12} color={C.ink2}>{nf(d.s26)}</Num>
                  <Num size={12} color={d.gr >= 0 ? C.green : C.red}>{pf(d.gr)}</Num>
                  <Num size={11} color={C.ink3}>P1 {sf(d.p1sh26)}</Num>
                  {mine.length > 0 && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', background: C.green, padding: '2px 6px' }}>
                      補登 {mine.length} 筆 · 最近 {mine.map((e) => e.date).sort().slice(-1)[0].slice(5)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
      <div className="px-4 pt-5 pb-2">
        <Eyebrow>其餘 14 家 · 依 2026 金額排序</Eyebrow>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 6 }}>
          這些沒有手寫劇本，議題依規則自動生成（斷單、歸零、HA 空白、P1 佔比、SKU 收縮）。
          接單補登與排程一樣涵蓋，數字都是真的。要升為重點客戶跟我說，我補一份劇本。
        </div>
      </div>
      {ALL_GRPS.filter((g) => !PLAY[g]).map((g) => {
        const dd = DATA[g];
        const mine = liveEntries(entries).filter((e) => e.grp === g);
        return (
          <button key={g} onClick={() => onPick(g)} className="w-full text-left px-4 py-3"
            style={{ background: C.surf, borderBottom: `1px solid ${C.hair}`, display: 'block' }}>
            <div className="flex items-baseline flex-wrap" style={{ gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.ink }}>{g}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: TIER_C[dd.tier] }}>{dd.tier}</span>
              <span style={{ marginLeft: 'auto' }}>
                <Num size={12} color={C.ink2}>{nf(dd.s26)}</Num>
                <Num size={12} color={dd.gr >= 0 ? C.green : C.red}>　{pf(dd.gr)}</Num>
              </span>
            </div>
            <div className="flex items-center" style={{ gap: 10, marginTop: 5 }}>
              <Num size={10.5} color={C.ink3}>P1 {sf(dd.p1sh26)}</Num>
              <Num size={10.5} color={C.ink3}>品項 {dd.sku25}→{dd.sku26}</Num>
              {mine.length > 0 && <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#fff', background: C.green, padding: '2px 5px' }}>補登 {mine.length}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}


function DualBlock({ grp, entries }) {
  const y = dualYoY(grp, entries);
  if (!y) return null;
  const head = (title, tag, tagBg) => (
    <div className="flex items-baseline" style={{ gap: 7 }}>
      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 900, color: C.ink }}>{title}</span>
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#fff', background: tagBg, padding: '2px 6px' }}>{tag}</span>
    </div>
  );
  const wrap = { flex: '1 1 240px', background: C.surf, border: `1px solid ${C.hair}`, padding: '12px 14px' };

  return (
    <div className="px-4 py-4" style={{ background: '#F1F5F6' }}>
      <Eyebrow>兩年同期比較 · 兩個口徑並列（SOP 裁定第 16 條）</Eyebrow>
      <div className="flex flex-wrap" style={{ gap: 10, marginTop: 9 }}>
        <div style={wrap}>
          {head('官方口徑', '已對帳', C.ink)}
          <div style={{ marginTop: 7 }}><Num size={22} weight={600} color={y.official.gr >= 0 ? C.green : C.red}>{pf(y.official.gr)}</Num></div>
          <div style={{ marginTop: 4 }}>
            <Num size={11.5} color={C.ink3}>{nf(y.official.s25)}</Num>
            <span style={{ color: C.ink3, margin: '0 5px' }}>→</span>
            <Num size={12} color={C.ink}>{nf(y.official.s26)}</Num>
          </div>
          <div style={{ fontSize: 11.5, color: C.ink2, lineHeight: 1.6, marginTop: 6 }}>
            1/1–{y.official.asOf.slice(5)}，取自官方 Offtake。這是唯一可對外、可正式回報的數字。
          </div>
        </div>

        <div style={wrap}>
          {head('即時口徑', y.suppress ? '樣本不足' : '未對帳', y.suppress ? C.ink3 : C.amber)}
          {y.suppress ? (
            <>
              <div style={{ marginTop: 7 }}>
                <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: C.ink3 }}>—</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.ink2, lineHeight: 1.7, marginTop: 6 }}>
                8/1 之後去年同期有下單的 {y.cov.expected} 家裡，你補登了 {y.cov.covered} 家。
                未補登者佔去年同期金額 <b style={{ color: C.red }}>{sf(y.cov.gap)}</b>，
                拿它算出來的成長率會被嚴重低估。<b style={{ color: C.ink }}>不計算，寧可留白。</b>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 7 }}><Num size={22} weight={600} color={y.live.gr >= 0 ? C.green : C.red}>{pf(y.live.gr)}</Num></div>
              <div style={{ marginTop: 4 }}>
                <Num size={11.5} color={C.ink3}>{nf(y.live.s25)}</Num>
                <span style={{ color: C.ink3, margin: '0 5px' }}>→</span>
                <Num size={12} color={C.ink}>{nf(y.live.s26)}</Num>
              </div>
              <div style={{ fontSize: 11.5, color: C.ink2, lineHeight: 1.6, marginTop: 6 }}>
                {y.same
                  ? '目前沒有補登，與官方口徑相同。到「接單」記下截止日之後的訂單，這個數字才會動。'
                  : `1/1–${y.live.asOf.slice(5)}，含 ${y.live.n} 筆補登（${nf(y.live.addAmt)}）。${grp ? '這家店的補登若已輸入完整，這個比較就是公平的。' : `未補登缺口 ${sf(y.cov ? y.cov.gap : 0)}，仍偏保守，只看方向、不對外。`}`}
              </div>
            </>
          )}
        </div>
      </div>

      {y.suppress && y.cov.miss.length > 0 && (
        <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '10px 14px', marginTop: 10 }}>
          <Eyebrow>還沒補登、但去年同期有下單的客戶</Eyebrow>
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 7 }}>
            {y.cov.miss.slice(0, 10).map((m) => (
              <span key={m.grp} style={{ fontFamily: SANS, fontSize: 12, color: C.ink2, border: `1px solid ${C.rule}`, padding: '3px 8px' }}>
                {m.grp}<span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, marginLeft: 5 }}>{nf(m.v)}</span>
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 8, lineHeight: 1.6 }}>
            金額為該客戶去年同期實績，供你判斷先補哪幾家最有效。補到缺口低於 20% 就會開始顯示成長率。
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 畫面二：客戶卡 ───────────────────────────────────── */
function Card({ grp, onBack, onLog, entries }) {
  const d = DATA[grp];
  const hand = PLAY[grp];
  const auto = hand ? null : autoTopics(grp, entries);
  const p = hand || { redlines: [], topics: auto, bring: [], intel: [] };
  const mine = liveEntries(entries).filter((e) => e.grp === grp).sort((a, b) => (a.date < b.date ? 1 : -1));
  const addBy = {};
  mine.forEach((e) => {
    const k = e.item;
    addBy[k] = addBy[k] || { paid: 0, gift: 0, amt: 0 };
    addBy[k].paid += Number(e.paidEA) || 0; addBy[k].gift += Number(e.giftEA) || 0;
    addBy[k].amt += (Number(e.paidEA) || 0) * (Number(e.unit) || 0);
  });
  const addAmt = Object.values(addBy).reduce((a, x) => a + x.amt, 0);
  const live = d.items.filter((x) => x.s25 || x.s26);
  const warns = allCadence(grp, entries).filter((c) => {
    if (!c.ok) return false;
    const gap = (new Date(TODAY_STR()) - new Date(c.last)) / 86400000;
    return gap >= c.avg_int * 2;
  }).map((c) => ({ item: c.item, avg: c.avg_int, gap: Math.round((new Date(TODAY_STR()) - new Date(c.last)) / 86400000) }));
  const actWarns = warns.filter((f) => !exempt(grp, f.item));
  const actZero = d.zero.filter((z) => !exempt(grp, z.item));
  const exList = [
    ...warns.filter((f) => exempt(grp, f.item)).map((f) => ({ item: f.item, r: exempt(grp, f.item) })),
    ...d.zero.filter((z) => exempt(grp, z.item)).map((z) => ({ item: z.item, r: exempt(grp, z.item) })),
  ];
  return (
    <div>
      <div className="px-4 pt-4 pb-3" style={{ background: C.surf, borderBottom: `1px solid ${C.rule}` }}>
        <button onClick={onBack} style={{ fontFamily: MONO, fontSize: 11, color: C.teal, letterSpacing: '0.1em' }}>← 優先序</button>
        <div className="flex items-baseline flex-wrap" style={{ gap: 10, marginTop: 8 }}>
          <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink }}>{grp}</h2>
          <span style={{ fontFamily: MONO, fontSize: 12, color: TIER_C[d.tier] }}>{d.tier}</span>
        </div>
        <div className="flex flex-wrap" style={{ gap: 18, marginTop: 10 }}>
          {[['2026 銷售額', nf(d.s26), C.ink], ['YoY', pf(d.gr), d.gr >= 0 ? C.green : C.red],
            ['P1 佔比', sf(d.p1sh26), C.ink], ['贈品率', sf(d.gift26), C.ink], ['品項數', `${d.sku25}→${d.sku26}`, d.sku26 < d.sku25 ? C.red : C.ink]
          ].map(([k, v, c]) => (
            <div key={k}>
              <Eyebrow>{k}</Eyebrow>
              <div style={{ marginTop: 2 }}><Num size={16} color={c} weight={600}>{v}</Num></div>
            </div>
          ))}
          <div>
            <Eyebrow>月度走勢 25／26</Eyebrow>
            <div style={{ marginTop: 2 }}><Spark a={d.m25} b={d.m26} /></div>
          </div>
        </div>
      </div>

      <DualBlock grp={grp} entries={entries} />

      <div className="p-4" style={{ display: 'grid', gap: 18 }}>
        <div>
          <SecHead n="A" t="拜訪前必讀" />
          <RedLines lines={p.redlines} />
        </div>

        <div>
          <SecHead n="B" t="本次要談的三件事" />
          <div style={{ display: 'grid', gap: 10 }}>
            {p.topics.map((t, i) => (
              <div key={i} style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '12px 14px' }}>
                <div className="flex items-baseline" style={{ gap: 9 }}>
                  <Num size={11} color={C.teal} weight={600}>{String(i + 1).padStart(2, '0')}</Num>
                  <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>{t.t}</div>
                </div>
                <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.8, marginTop: 6, paddingLeft: 20 }}>{t.d}</div>
                {Object.keys(addBy).filter((it) => t.t.includes(it) || t.d.includes(it)).map((it) => (
                  <div key={it} style={{ marginLeft: 20, marginTop: 7, background: C.greenBg, border: `1px solid #C4DCCF`, padding: '7px 10px', fontSize: 12.5, color: '#1E4D39', lineHeight: 1.7 }}>
                    <b>{it} 已有補登</b>：7/31 後 +{addBy[it].paid} EA{addBy[it].gift ? `（另贈 ${addBy[it].gift}）` : ''}。這條議題的前提可能已改變，進門前先確認。
                  </div>
                ))}
              </div>
            ))}
          </div>
          {!hand && (
            <div style={{ background: '#F4F7F8', border: `1px solid ${C.hair}`, padding: '10px 14px', marginTop: 10, fontSize: 12.5, color: C.ink2, lineHeight: 1.8 }}>
              以上議題是<b style={{ color: C.ink }}>依規則自動生成</b>的（斷單、歸零、HA 空白、P1 佔比、SKU 收縮），不是逐家寫過的劇本。
              優先名單那 8 家才有手寫議題與談判素材。這家若升為重點客戶，跟我說，我補一份。
            </div>
          )}
          {p.bring.length > 0 && (
          <div style={{ background: C.tealBg, border: `1px solid #CDE2E8`, padding: '10px 14px', marginTop: 10 }}>
            <Eyebrow color={C.teal}>帶什麼進去</Eyebrow>
            {p.bring.map((b, i) => <div key={i} style={{ fontSize: 13, color: '#0A4A5A', marginTop: 5, lineHeight: 1.7 }}>· {b}</div>)}
          </div>)}
        </div>

        <div>
          <SecHead n="C" t="數字快照" />
          <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
            <div className="flex px-3 py-2" style={{ borderBottom: `1px solid ${C.hair}`, background: '#F4F8F9' }}>
              {['品項', '2025', '2026', 'EA 25→26', mine.length ? '7/31後補登' : '狀態'].map((h, i) => (
                <div key={h} style={{ flex: i === 0 ? 1.5 : 1, textAlign: i > 0 && i < 3 ? 'right' : 'left' }}><Eyebrow>{h}</Eyebrow></div>
              ))}
            </div>
            {live.map((x) => (
              <div key={x.item} className="flex px-3 py-2 items-center" style={{ borderBottom: `1px solid ${C.hair}` }}>
                <div style={{ flex: 1.5 }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.ink }}>{x.item}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: x.p === 'P1' ? C.teal : C.ink3, marginLeft: 5 }}>{x.p}</span>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}><Num size={12} color={C.ink3}>{nf(x.s25)}</Num></div>
                <div style={{ flex: 1, textAlign: 'right' }}><Num size={12}>{nf(x.s26)}</Num></div>
                <div style={{ flex: 1, textAlign: 'left', paddingLeft: 12 }}><Num size={11} color={C.ink2}>{x.e25}→{x.e26}</Num></div>
                <div style={{ flex: 1 }}>
                  {addBy[x.item]
                    ? <Num size={11} color={C.green} weight={600}>+{addBy[x.item].paid}{addBy[x.item].gift ? `+贈${addBy[x.item].gift}` : ''} EA</Num>
                    : <span style={{ fontFamily: MONO, fontSize: 10.5, color: TIER_C[x.st] || (x.st === '新進' ? C.teal : x.st === '歸零' ? C.red : C.ink3) }}>{x.st}</span>}
                </div>
              </div>
            ))}
          </div>
          {d.inner.length > 0 && (
            <div style={{ marginTop: 10, background: C.surf, border: `1px solid ${C.hair}`, padding: '10px 14px' }}>
              <Eyebrow>體系內部拆解 · 防止合併數字掩蓋反向變化</Eyebrow>
              {d.inner.map((x) => (
                <div key={x.name} className="flex justify-between items-center" style={{ marginTop: 7 }}>
                  <span style={{ fontSize: 12.5, color: C.ink }}>{x.name}</span>
                  <span><Num size={11} color={C.ink3}>{nf(x.s25)}</Num>
                    <span style={{ color: C.ink3, margin: '0 5px' }}>→</span>
                    <Num size={12} color={x.s26 - x.s25 >= 0 ? C.green : C.red}>{nf(x.s26)}</Num></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {(warns.length > 0 || d.zero.length > 0 || exList.length > 0) && (
          <div>
            <SecHead n="D" t="斷單與歸零" />
            {(actWarns.length > 0 || actZero.length > 0) ? (
              <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '10px 14px' }}>
                {actWarns.map((f) => (
                  <div key={f.item} className="flex justify-between items-baseline" style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 13, color: C.ink }}>{f.item}　<span style={{ fontSize: 11.5, color: C.ink2 }}>平均 {f.avg} 天一訂</span></span>
                    <span><Num size={12} color={C.amber} weight={600}>{f.gap} 天未訂</Num></span>
                  </div>
                ))}
                {actZero.map((z) => (
                  <div key={z.item} className="flex justify-between items-baseline flex-wrap" style={{ marginTop: 6, gap: 6 }}>
                    <span style={{ fontSize: 13, color: C.ink }}>
                      {z.item}　<span style={{ fontSize: 11.5, color: C.ink2 }}>末筆 {z.last}</span>
                      {z.h2 && <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#fff', background: C.amber, padding: '1px 5px', marginLeft: 6 }}>下半年才斷</span>}
                    </span>
                    <span><Num size={11.5} color={C.ink3}>2025 全年 {nf(z.s25)}</Num>　<Num size={12} color={C.red} weight={600}>2026 歸零</Num></span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '12px 14px', fontSize: 13, color: C.ink2, lineHeight: 1.7 }}>
                沒有需要處理的斷單或歸零線。
              </div>
            )}
            {exList.length > 0 && (
              <div style={{ border: `1px solid ${C.hair}`, background: '#F4F7F8', padding: '11px 14px', marginTop: 9 }}>
                <Eyebrow>特註豁免 · 以下線不列拜訪議題</Eyebrow>
                {exList.map((x, i) => (
                  <div key={i} style={{ marginTop: 8 }}>
                    <div className="flex items-baseline" style={{ gap: 7 }}>
                      <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.ink2 }}>{x.item}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.ink3, border: `1px solid ${C.rule}`, padding: '1px 5px' }}>{x.r.tag}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.ink3 }}>{x.r.src}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.75, marginTop: 3 }}>{x.r.use}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {p.intel.length > 0 && (
        <div>
          <SecHead n="E" t="這趟要帶回來的情報" />
          <div style={{ background: C.amberBg, border: `1px solid #E8D9B8`, padding: '11px 14px' }}>
            {p.intel.map((x, i) => <div key={i} style={{ fontSize: 13, color: '#4A3608', marginTop: i ? 7 : 0, lineHeight: 1.75 }}>· {x}</div>)}
            <div style={{ fontSize: 11.5, color: '#7A5C1A', marginTop: 10, lineHeight: 1.6, borderTop: `1px solid #E8D9B8`, paddingTop: 8 }}>
              SOP 裡的每一條客戶特註，都是從這一欄長出來的。永誠的側源、建祥的 32 支裝、康之友的 2026/04 轉折，全部來自現場回報。
            </div>
          </div>
        </div>)}

        <button onClick={() => onLog(grp)}
          style={{ background: C.ink, color: '#fff', fontFamily: SANS, fontSize: 15, fontWeight: 700, padding: '14px', width: '100%' }}>
          拜訪完了，記錄結果
        </button>
      </div>
    </div>
  );
}

const SecHead = ({ n, t }) => (
  <div className="flex items-baseline" style={{ gap: 8, marginBottom: 9 }}>
    <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, fontWeight: 600 }}>{n}</span>
    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 900, color: C.ink, letterSpacing: '0.02em' }}>{t}</span>
    <div style={{ flex: 1, height: 1, background: C.rule }} />
  </div>
);

/* ── 畫面三：拜訪紀錄 ─────────────────────────────────── */
const RESULTS = ['拿到單', '口頭承諾', '獲得資訊', '對方拒絕', '沒談到'];
const RES_C = { '拿到單': C.green, '口頭承諾': C.teal, '獲得資訊': C.amber, '對方拒絕': C.red, '沒談到': C.ink3 };
/* 計分：查證型議題的成功是問到東西，拿單型的成功才是拿到單。混在一起算會把兩個問題平均掉。 */
const scoreOf = (kind, result) => {
  if (result === '沒談到') return null;
  if (kind === '查證') return result === '獲得資訊' ? 1 : 0;
  if (result === '拿到單' || result === '口頭承諾') return 1;
  if (result === '獲得資訊') return 0.5;
  return 0;
};

function LogForm({ grp, existing, onSave, onCancel, onDelete, allEntries }) {
  // 編輯既有紀錄時沿用當時的議題（議題文字之後可能被改寫，歷史紀錄要保留原貌）
  const topics = existing
    ? existing.topics.map((t) => ({ t: t.title, d: '', tid: t.tid, kind: t.kind || '拿單' }))
    : (PLAY[grp]
        ? PLAY[grp].topics.map((t, i) => ({ ...t, tid: tid(grp, i), kind: tkind(grp, i) }))
        : autoTopics(grp, allEntries).map((t, i) => ({ ...t, tid: `auto-${GRP_KEY[grp] || grp}-t${i + 1}`, kind: t.kind })));

  const [date, setDate] = useState(existing ? existing.date : TODAY_STR());
  const [res, setRes] = useState(() => (existing ? Object.fromEntries(existing.topics.map((t, i) => [i, t.result])) : {}));
  const [notes, setNotes] = useState(() => (existing ? Object.fromEntries(existing.topics.map((t, i) => [i, t.note || ''])) : {}));
  const [intel, setIntel] = useState(existing ? existing.intel || '' : '');
  const [next, setNext] = useState(existing ? existing.next || '' : '');
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // 草稿自動存檔只用於「新增」，編輯既有紀錄不寫草稿，避免蓋掉未完成的新紀錄
  useEffect(() => {
    if (existing) return;
    const d = rawGet(KEY.draft);
    if (d && d.grp === grp) {
      setRes(d.res || {}); setNotes(d.notes || {}); setIntel(d.intel || ''); setNext(d.next || '');
      if (d.date) setDate(d.date);
      setRestored(true);
    }
  }, [grp]);
  useEffect(() => {
    if (existing) return;
    const id = setTimeout(() => {
      try { rawSet(KEY.draft, { grp, date, res, notes, intel, next, ts: Date.now() }); } catch {}
    }, 600);
    return () => clearTimeout(id);
  }, [grp, date, res, notes, intel, next]);

  const save = () => {
    setBusy(true);
    onSave({
      id: existing ? existing.id : `${GRP_KEY[grp] || 'v'}-${Date.now()}`,
      grp, date,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: existing ? new Date().toISOString() : undefined,
      source: existing ? existing.source : undefined,
      topics: topics.map((t, i) => ({ tid: t.tid, title: t.t, kind: t.kind, result: res[i] || '沒談到', note: notes[i] || '' })),
      intel, next,
    }, !!existing);
    setBusy(false);
  };

  return (
    <div className="p-4" style={{ display: 'grid', gap: 16 }}>
      <div>
        <button onClick={() => { if (!existing) { try { localStorage.removeItem(KEY.draft); } catch {} } onCancel(); }}
          style={{ fontFamily: MONO, fontSize: 11, color: C.teal }}>← {existing ? '取消編輯' : '取消（清除草稿）'}</button>
        <h2 style={{ fontFamily: SANS, fontSize: 22, fontWeight: 900, color: C.ink, marginTop: 8 }}>
          {grp}　{existing ? '編輯拜訪紀錄' : '拜訪紀錄'}
        </h2>
        <p style={{ fontSize: 12.5, color: C.ink2, marginTop: 4 }}>
          {existing ? '所有欄位都可以改，包含拜訪日期。' : '一分鐘填完。最重要的是最下面那一欄。輸入會自動暫存草稿。'}
        </p>
        {restored && <div style={{ background: C.tealBg, border: `1px solid #CDE2E8`, padding: '9px 12px', marginTop: 8, fontSize: 12.5, color: '#0A4A5A' }}>已還原上次未存檔的草稿。</div>}
      </div>

      <div>
        <Eyebrow>拜訪日期</Eyebrow>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ marginTop: 5, border: `1px solid ${C.rule}`, padding: '9px 10px', fontFamily: MONO, fontSize: 14, background: C.surf }} />
        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, lineHeight: 1.6 }}>
          填實際去店裡的那天，不是輸入的那天——複盤的排序與拜訪間隔都靠它。
        </div>
      </div>

      {topics.map((t, i) => (
        <div key={i} style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '12px 14px' }}>
          <div className="flex items-baseline" style={{ gap: 7 }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#fff', background: t.kind === '查證' ? C.amber : C.teal, padding: '2px 6px' }}>{t.kind === '查證' ? '查證型' : '拿單型'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>{t.t}</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>{t.kind === '查證' ? '目標是問出東西——「獲得資訊」就算成功。' : '目標是拿單——「獲得資訊」算有進展但未達標。'}</div>
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 9 }}>
            {RESULTS.map((r) => (
              <button key={r} onClick={() => setRes({ ...res, [i]: r })}
                style={{
                  fontFamily: SANS, fontSize: 12.5, padding: '6px 11px',
                  border: `1px solid ${res[i] === r ? RES_C[r] : C.rule}`,
                  background: res[i] === r ? RES_C[r] : C.surf,
                  color: res[i] === r ? '#fff' : C.ink2,
                }}>{r}</button>
            ))}
          </div>
          <textarea value={notes[i] || ''} onChange={(e) => setNotes({ ...notes, [i]: e.target.value })}
            placeholder="對方原話／關鍵細節"
            style={{ width: '100%', marginTop: 9, border: `1px solid ${C.rule}`, padding: '8px 10px', fontSize: 13, fontFamily: SANS, minHeight: 52, resize: 'vertical', background: '#FCFDFD' }} />
        </div>
      ))}

      <div style={{ background: C.amberBg, border: `1px solid #E8D9B8`, padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#4A3608' }}>新情報</div>
        <div style={{ fontSize: 12, color: '#7A5C1A', marginTop: 3, lineHeight: 1.6 }}>
          側源、競品條件、人員異動、活動反應、通路定位。這一欄是 SOP 特註的唯一來源。
        </div>
        <textarea value={intel} onChange={(e) => setIntel(e.target.value)}
          style={{ width: '100%', marginTop: 9, border: `1px solid #E0CFA8`, padding: '8px 10px', fontSize: 13, fontFamily: SANS, minHeight: 84, resize: 'vertical', background: '#FFFDF7' }} />
      </div>

      <div>
        <Eyebrow>下次追蹤日</Eyebrow>
        <input type="date" value={next} onChange={(e) => setNext(e.target.value)}
          style={{ marginTop: 5, border: `1px solid ${C.rule}`, padding: '8px 10px', fontFamily: MONO, fontSize: 13, background: C.surf }} />
      </div>

      <button onClick={save} disabled={busy}
        style={{ background: busy ? C.ink3 : C.ink, color: '#fff', fontFamily: SANS, fontSize: 15, fontWeight: 700, padding: 14 }}>
        {busy ? '儲存中…' : existing ? '儲存修改' : '儲存拜訪紀錄'}
      </button>

      {existing && (
        confirmDel ? (
          <div style={{ background: C.redBg, border: `1px solid ${C.redRule}`, padding: '12px 14px' }}>
            <div style={{ fontSize: 13.5, color: '#4A1E1A', lineHeight: 1.7 }}>刪除這筆 {grp} {existing.date} 的紀錄？刪除前會自動留快照，但筆記內容就沒了。</div>
            <div className="flex" style={{ gap: 8, marginTop: 10 }}>
              <button onClick={() => onDelete(existing.id)} style={{ background: C.red, color: '#fff', fontFamily: SANS, fontSize: 13.5, fontWeight: 700, padding: '9px 16px' }}>確定刪除</button>
              <button onClick={() => setConfirmDel(false)} style={{ background: C.surf, border: `1px solid ${C.rule}`, fontFamily: SANS, fontSize: 13.5, padding: '9px 16px' }}>取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} style={{ fontFamily: SANS, fontSize: 13, color: C.red, border: `1px solid ${C.redRule}`, background: C.redBg, padding: '10px 16px' }}>刪除這筆紀錄</button>
        )
      )}
    </div>
  );
}

/* ── 畫面四：複盤迭代 ─────────────────────────────────── */
function Review({ log, onClear, onEdit, entries }) {
  const all = log.flatMap((v) => v.topics);
  const scored = all.map((t) => ({ ...t, sc: scoreOf(t.kind || '拿單', t.result) })).filter((t) => t.sc !== null);
  const ordL = scored.filter((t) => (t.kind || '拿單') !== '查證');
  const intL = scored.filter((t) => (t.kind || '拿單') === '查證');
  const pct = (arr) => (arr.length ? `${Math.round((arr.reduce((a, b) => a + b.sc, 0) / arr.length) * 100)}%` : '—');
  const talked = scored.length;
  const intels = log.filter((v) => (v.intel && v.intel.trim()) || v.topics.some((t) => t.note && t.note.trim()));
  const exportText = log.map((v) => {
    const lines = v.topics.filter((t) => t.note && t.note.trim())
      .map((t) => `· [${t.kind}｜${t.result}] ${t.title}\n  ${t.note.trim()}`);
    if (v.intel && v.intel.trim()) lines.push(`· [新情報] ${v.intel.trim()}`);
    return lines.length ? `【${v.grp}｜${v.date}】\n${lines.join('\n')}` : null;
  }).filter(Boolean).join('\n\n');
  const [copied, setCopied] = useState(false);

  const today = TODAY_STR();
  const rawWarns = GROUP_LIST.flatMap((d) =>
    allCadence(d.grp, entries).filter((c) => {
      if (!c.ok) return false;
      return (new Date(today) - new Date(c.last)) / 86400000 >= c.avg_int * 2;
    }).map((c) => ({ grp: d.grp, item: c.item, avg: c.avg_int, gap: Math.round((new Date(today) - new Date(c.last)) / 86400000) }))
  );
  const allWarns = rawWarns.filter((w) => !exempt(w.grp, w.item));
  const exWarns = rawWarns.filter((w) => exempt(w.grp, w.item));

  return (
    <div className="p-4" style={{ display: 'grid', gap: 18 }}>
      <div>
        <Eyebrow>Review · 讓下一輪比這一輪準</Eyebrow>
        <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 6 }}>複盤</h2>
      </div>

      <div className="flex flex-wrap" style={{ gap: 24, background: C.surf, border: `1px solid ${C.hair}`, padding: '14px 16px' }}>
        {[['已記錄拜訪', log.length], ['拿單命中率', pct(ordL)], ['情報命中率', pct(intL)], ['新情報則數', intels.length]].map(([k, v]) => (
          <div key={k}>
            <Eyebrow>{k}</Eyebrow>
            <div style={{ marginTop: 3 }}><Num size={24} weight={600}>{v}</Num></div>
          </div>
        ))}
      </div>
      {talked > 0 && (
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: -8 }}>
          兩種議題分開計分：<b style={{ color: C.ink }}>拿單型</b>要拿到單或口頭承諾才算命中，獲得資訊算半分；
          <b style={{ color: C.ink }}>查證型</b>問到東西就算命中。分開看才有意義——情報命中率低代表問得不夠深或對方有戒心，
          拿單命中率低代表議題選錯標的，這兩個問題要修的地方完全不同。
          （目前拿單型 {ordL.length} 題、查證型 {intL.length} 題）
        </div>
      )}

      <div>
        <SecHead n="1" t="預測驗證：下期回來對答案" />
        <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
          {allWarns.map((w, i) => (
            <div key={i} className="flex justify-between items-baseline px-4 py-2" style={{ borderBottom: `1px solid ${C.hair}` }}>
              <span style={{ fontSize: 13, color: C.ink }}>{w.grp}　<span style={{ color: C.ink2 }}>{w.item}</span></span>
              <span><Num size={11} color={C.ink3}>平均 {w.avg} 天</Num><span style={{ color: C.ink3, margin: '0 6px' }}>·</span><Num size={12} color={C.amber}>{w.gap} 天未訂</Num></span>
            </div>
          ))}
        </div>
        {exWarns.length > 0 && (
          <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.7, marginTop: 8, borderLeft: `2px solid ${C.rule}`, paddingLeft: 10 }}>
            另有 {exWarns.length} 條（{exWarns.map((w) => `${w.grp} ${w.item}`).join('、')}）因客戶特註豁免，已排除在驗證之外——
            它們的掛零原因已知，不是預測要驗的東西。
          </div>
        )}
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 8 }}>
          這些線是用「訂貨間隔拉長到平均 2 倍」判出來的。下期資料進來時逐條回頭看：真的斷了幾條、
          誤報幾條。誤報多就把門檻往上調，漏報多就往下調——門檻是拿來校準的，不是拿來供著的。
        </div>
      </div>

      <div>
        <SecHead n="2" t="情報彙整：回寫 SOP" />
        {intels.length === 0 ? (
          <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '16px', fontSize: 13, color: C.ink2, lineHeight: 1.8 }}>
            還沒有情報。拜訪後在「新情報」欄留下觀察，這裡就會彙整成可以直接回寫 SOP 的格式。
          </div>
        ) : (
          <>
            <textarea readOnly value={exportText}
              style={{ width: '100%', border: `1px solid ${C.rule}`, padding: '10px 12px', fontSize: 12.5, fontFamily: SANS, minHeight: 140, background: C.surf, lineHeight: 1.7 }} />
            <button onClick={() => { navigator.clipboard?.writeText(exportText); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
              style={{ background: C.teal, color: '#fff', fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '11px 18px', marginTop: 8 }}>
              {copied ? '已複製' : '複製全部情報'}
            </button>
            <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 8 }}>
              複製後貼回對話，我會判斷哪幾條夠明確可以寫成客戶特註、哪幾條還需要再確認範圍，
              然後更新 SOP 版本。這是閉環的最後一段：現場 → SOP → 分析 → 現場。
            </div>
          </>
        )}
      </div>

      {log.length > 0 && (
        <div>
          <SecHead n="3" t="拜訪歷程" />
          <div style={{ display: 'grid', gap: 8 }}>
            {[...log].reverse().map((v) => (
              <div key={v.id} style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '10px 14px' }}>
                <div className="flex justify-between items-baseline">
                  <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.ink }}>{v.grp}</span>
                  <Num size={11} color={C.ink3}>{v.date}</Num>
                </div>
                <div className="flex flex-wrap" style={{ gap: 6, marginTop: 7 }}>
                  {v.topics.map((t, i) => (
                    <span key={i} style={{ fontFamily: MONO, fontSize: 10, color: RES_C[t.result], border: `1px solid ${RES_C[t.result]}`, padding: '2px 6px' }}>
                      {(t.kind || '拿單') === '查證' ? '查·' : '單·'}{t.result}
                    </span>
                  ))}
                </div>
                {v.next && <div style={{ fontSize: 12, color: C.ink2, marginTop: 7 }}>下次追蹤 <Num size={11}>{v.next}</Num></div>}
                <div className="flex items-center" style={{ gap: 14, marginTop: 9 }}>
                  <button onClick={() => onEdit(v)} style={{ fontFamily: SANS, fontSize: 12.5, color: C.teal, border: `1px solid ${C.rule}`, padding: '5px 12px', background: C.surf }}>編輯</button>
                  {v.updatedAt && <Num size={10} color={C.ink3}>已於 {v.updatedAt.slice(0, 10)} 修改</Num>}
                </div>
              </div>
            ))}
          </div>
          <button onClick={onClear} style={{ fontFamily: SANS, fontSize: 12, color: C.red, marginTop: 12 }}>清除全部紀錄</button>
        </div>
      )}
    </div>
  );
}

/* ── 畫面五：拜訪節奏排程 ─────────────────────────────── */
const SIG_C = { '穩定': C.ink2, '剛進大批': C.amber, '訂得比平常少': C.teal };
const SIG_D = {
  '穩定': '兩法一致，照排程去',
  '剛進大批': '這批比平常大，別急著去，先盯去化',
  '訂得比平常少': '這次訂得比平常少，提早去看發生什麼事',
};

function Schedule({ entries }) {
  const TODAY = new Date(TODAY_STR());
  const [open, setOpen] = useState(null);
  const rows = [], weak = [], exs = [];
  GROUP_LIST.forEach((d) => {
    allCadence(d.grp, entries).forEach((c) => {
      const r = exempt(d.grp, c.item);
      if (r) exs.push({ grp: d.grp, item: c.item, r, last: c.last });
      else (c.ok ? rows : weak).push({ grp: d.grp, ...c });
    });
  });
  GROUP_LIST.forEach((d) => {
    (d.zero || []).forEach((z) => {
      const r = exempt(d.grp, z.item);
      if (r && !exs.some((e) => e.grp === d.grp && e.item === z.item)) exs.push({ grp: d.grp, item: z.item, r, last: z.last });
    });
  });
  exs.sort((a, b) => (a.grp + a.item < b.grp + b.item ? -1 : 1));
  rows.sort((a, b) => (a.d_int < b.d_int ? -1 : 1));

  // 門店成熟度：找出一趟拜訪（±14 天）能覆蓋最多線的日期
  const WIN = 14;
  const byStore = {};
  rows.forEach((r) => { (byStore[r.grp] = byStore[r.grp] || []).push(r); });
  const stores = Object.entries(byStore).map(([grp, lines]) => {
    let best = null;
    lines.forEach((c) => {
      const hit = lines.filter((x) => Math.abs((new Date(x.d_int) - new Date(c.d_int)) / 86400000) <= WIN);
      if (!best || hit.length > best.hit.length || (hit.length === best.hit.length && c.d_int < best.date)) {
        best = { date: c.d_int, hit };
      }
    });
    const miss = lines.filter((x) => !best.hit.includes(x)).sort((a, b) => (a.d_int < b.d_int ? -1 : 1));
    return { grp, lines, date: best.date, hit: best.hit, miss, rate: best.hit.length / lines.length };
  }).sort((a, b) => (b.rate - a.rate) || (a.date < b.date ? -1 : 1));
  weak.sort((a, b) => (a.grp < b.grp ? -1 : 1));
  const days = (s) => Math.round((TODAY - new Date(s)) / 86400000);

  return (
    <div className="p-4">
      <Eyebrow>Cadence · 於估算庫存見底前一週拜訪</Eyebrow>
      <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 6 }}>拜訪節奏</h2>

      <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '13px 15px', marginTop: 12 }}>
        <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.85 }}>
          兩種算法並列。<b style={{ color: C.ink }}>間隔法</b>取這條線歷次訂單的平均天數，穩但看不見批量變化；
          <b style={{ color: C.ink }}>消化法</b>再乘上「這批 ÷ 平均批」的倍數，會反映對方這次是進多了還是進少了。
        </div>
        <Rule my={11} />
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink, lineHeight: 1.9 }}>
          間隔法 = 最後訂單日 + 平均間隔 − 7<br />
          消化法 = 最後訂單日 + 平均間隔 × (本批量 ÷ 平均批量) − 7
        </div>
        <Rule my={11} />
        <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.8 }}>
          月均流速改由「平均批量 ÷ 平均間隔」推算，不用「總 EA ÷ 7 個月」——後者對年中才開始或中途停掉的線會嚴重低估流速，
          把消化時間灌成一兩百天。康之友的 C 就是這樣被誤判成「剛進大批」，改法後回到穩定。
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SecHead n="1" t={`門店成熟度 ${stores.length} 家 · 排週行程用這張`} />
        <div style={{ display: 'grid', gap: 9 }}>
          {stores.map((st) => {
            const od = days(st.date);
            const full = st.rate === 1;
            return (
              <div key={st.grp} style={{ background: C.surf, border: `1px solid ${full ? C.rule : C.hair}`, padding: '12px 14px' }}>
                <div className="flex items-baseline flex-wrap" style={{ gap: 9 }}>
                  <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 900, color: C.ink }}>{st.grp}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: full ? C.green : C.ink2 }}>
                    一趟收 {st.hit.length}／{st.lines.length} 條
                  </span>
                  <span style={{ marginLeft: 'auto' }}>
                    <Num size={13} color={od > 0 ? C.red : C.ink} weight={600}>{st.date}</Num>
                    <Num size={10.5} color={C.ink3}>{od > 0 ? `　逾期 ${od} 天` : `　還有 ${-od} 天`}</Num>
                  </span>
                </div>
                <div className="flex flex-wrap" style={{ gap: 5, marginTop: 9 }}>
                  {st.hit.map((x) => (
                    <span key={x.item} style={{ fontFamily: SANS, fontSize: 12, color: C.ink, border: `1px solid ${C.rule}`, background: '#F4F8F9', padding: '3px 8px' }}>
                      {x.item}<span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, marginLeft: 5 }}>{x.d_int.slice(5)}</span>
                    </span>
                  ))}
                </div>
                {st.miss.length > 0 && (
                  <div style={{ marginTop: 9, borderTop: `1px dashed ${C.rule}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 11.5, color: C.amber, fontWeight: 600 }}>另 {st.miss.length} 條這天還沒熟，不要硬談，要分次去</div>
                    <div className="flex flex-wrap" style={{ gap: 5, marginTop: 6 }}>
                      {st.miss.map((x) => (
                        <span key={x.item} style={{ fontFamily: SANS, fontSize: 12, color: C.ink3, border: `1px dashed ${C.rule}`, padding: '3px 8px' }}>
                          {x.item}<span style={{ fontFamily: MONO, fontSize: 10, marginLeft: 5 }}>{x.d_int.slice(5)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 10 }}>
          「一趟收 N／M」是以該日前後 14 天為窗口算的。覆蓋率高的排前面，因為單趟能收的價值大。
          虛線框的線那天還沒到補貨點，談了拿不到單，只會消耗提問額度——分次去。
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <SecHead n="2" t={`單條線排程 ${rows.length} 條 · 排單店節奏用這張`} />
        <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
          {rows.map((r, i) => {
            const od = days(r.d_int);
            const isOpen = open === `${r.grp}-${r.item}`;
            return (
              <div key={i} style={{ borderBottom: `1px solid ${C.hair}` }}>
                <button onClick={() => setOpen(isOpen ? null : `${r.grp}-${r.item}`)}
                  className="w-full text-left px-3 py-3" style={{ background: 'none', display: 'block' }}>
                  <div className="flex items-baseline flex-wrap" style={{ gap: 8 }}>
                    <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.ink }}>{r.grp}</span>
                    <span style={{ fontFamily: SANS, fontSize: 13, color: C.ink2 }}>{r.item}</span>
                    {r.added && <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', background: C.green, padding: '2px 6px' }}>含補登</span>}
                    <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', background: SIG_C[r.sig], padding: '2px 6px', marginLeft: 'auto' }}>{r.sig}</span>
                  </div>
                  <div className="flex flex-wrap" style={{ gap: 18, marginTop: 8 }}>
                    <div>
                      <Eyebrow>間隔法</Eyebrow>
                      <div style={{ marginTop: 2 }}>
                        <Num size={13} color={od > 0 ? C.red : C.ink} weight={600}>{r.d_int}</Num>
                        <Num size={10.5} color={C.ink3}>{od > 0 ? `　逾期 ${od} 天` : `　還有 ${-od} 天`}</Num>
                      </div>
                    </div>
                    <div>
                      <Eyebrow>消化法</Eyebrow>
                      <div style={{ marginTop: 2 }}>
                        <Num size={13} color={days(r.d_dep) > 0 ? C.red : C.ink} weight={600}>{r.d_dep}</Num>
                        <Num size={10.5} color={C.ink3}>{`　差 ${r.diff > 0 ? '+' : '−'}${Math.abs(r.diff)} 天`}</Num>
                      </div>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3" style={{ background: '#F6F9FA' }}>
                    <div style={{ fontSize: 12.5, color: SIG_C[r.sig], fontWeight: 600, paddingTop: 10 }}>{SIG_D[r.sig]}</div>
                    <div className="flex flex-wrap" style={{ gap: 16, marginTop: 9 }}>
                      {[['2026 訂單數', `${r.n} 筆`], ['平均間隔', `${r.avg_int} 天`], ['平均批量', `${r.avg_batch} EA`],
                        ['最後一批', `${r.last_batch} EA`], ['倍數', `${r.ratio}×`], ['月均流速', `${r.flow} EA`], ['末筆訂單', r.last]
                      ].map(([k, v]) => (
                        <div key={k}>
                          <Eyebrow>{k}</Eyebrow>
                          <div style={{ marginTop: 2 }}><Num size={12}>{v}</Num></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <SecHead n="3" t={`樣本不足 ${weak.length} 條 · 不給日期`} />
        <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
          {weak.map((r, i) => (
            <div key={i} className="flex items-baseline flex-wrap px-3 py-2" style={{ borderBottom: `1px solid ${C.hair}`, gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 13.5, color: C.ink3 }}>{r.grp}</span>
              <span style={{ fontFamily: SANS, fontSize: 13, color: C.ink3 }}>{r.item}</span>
              <span style={{ fontSize: 11.5, color: C.ink3, marginLeft: 'auto' }}>{r.why}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 9 }}>
          這些線寧可留白也不給看起來很精確的假日期。訂單只有一兩筆時，「平均間隔」其實只是單一觀測值，
          兩種算法都沒有意義。等下一期訂單進來、樣本補足了會自動出現在上面。
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <SecHead n="4" t={`特註豁免 ${exs.length} 條 · 不列拜訪議題`} />
        <div style={{ border: `1px solid ${C.redRule}`, background: C.redBg }}>
          <div className="px-4 py-2" style={{ borderBottom: `1px solid ${C.redRule}`, fontSize: 12, color: C.red, fontWeight: 700, lineHeight: 1.6 }}>
            這些線的掛零或拉長是已知原因造成的，不是節奏斷裂。照排程去問＝做了 SOP 明文禁止的事。
          </div>
          {exs.map((x, i) => (
            <div key={i} className="px-4 py-3" style={{ borderBottom: `1px solid ${C.redRule}` }}>
              <div className="flex items-baseline flex-wrap" style={{ gap: 8 }}>
                <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.ink }}>{x.grp}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: C.ink2 }}>{x.item}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#fff', background: C.red, padding: '2px 6px' }}>{x.r.tag}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.ink3, marginLeft: 'auto' }}>{x.r.src}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#5A2A24', lineHeight: 1.75, marginTop: 5 }}>{x.r.why}</div>
              <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.75, marginTop: 4 }}><b style={{ color: C.ink }}>改怎麼做：</b>{x.r.use}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <SecHead n="5" t="目前生效的豁免規則" />
        <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
          {EXEMPT_RULES.map((r) => (
            <div key={r.id} className="px-4 py-2" style={{ borderBottom: `1px solid ${C.hair}` }}>
              <div className="flex items-baseline" style={{ gap: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.teal }}>{r.id}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.ink }}>{r.tag}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: C.ink3, marginLeft: 'auto' }}>{r.src}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.8, marginTop: 9 }}>
          這五條規則寫在同一個地方，排程頁、客戶卡的斷單區、複盤頁的預測驗證三處共用，
          不會各算各的。SOP 新增客戶特註時只要在這裡補一條，三個頁面同時生效。
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.85, marginTop: 18 }}>
        三個內建前提：估算假設下單當下架上庫存為零（對方還有貨會低估）；
        搭贈加碼期客戶可能囤貨、消化時間會被高估，判讀請對照當期促銷檔期；
        倉庫型客戶（彬利）整組排除，進貨為多點配發，節奏與單店消化無關。
      </div>
    </div>
  );
}


/* ── 畫面六：資料保存 ─────────────────────────────────── */
function DataScreen({ log, onReplace, backups, onRestore, entries }) {
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [lastImp, setLastImp] = useState(() => rawGet(KEY.imp));

  const pickFile = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setPaste(String(r.result)); setPreview(null); setMsg(`已讀取檔案 ${f.name}`); };
    r.readAsText(f);
  };
  const blob = { schema: SCHEMA, exportedAt: new Date().toISOString(), appVersion: APP_VERSION, build: BUILD, dataset: DATASET, cutoff: CUTOFF, visits: log, entries };
  const json = JSON.stringify(blob, null, 2);
  const lastTs = backups[0]?.ts;
  const sinceBackup = lastTs ? Math.floor((Date.now() - new Date(lastTs)) / 86400000) : null;

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `獨立藥局拜訪紀錄_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    setMsg('已下載備份檔');
  };

  const check = () => {
    try {
      const inc = migrate(JSON.parse(paste));
      if (!inc || !Array.isArray(inc.visits)) throw new Error('找不到 visits 陣列');
      const ids = new Set(log.map((v) => v.id));
      const add = inc.visits.filter((v) => !ids.has(v.id));
      const dupV = inc.visits.filter((v) => ids.has(v.id));
      const eids = new Set((entries || []).map((e) => e.id));
      const addE = (inc.entries || []).filter((e) => !eids.has(e.id));
      const dupE = (inc.entries || []).filter((e) => eids.has(e.id));
      setPreview({ add, addE, dupV, dupE, total: inc.visits.length, totalE: (inc.entries || []).length,
        srcExportedAt: (inc.exportedAt || '').slice(0, 16).replace('T', ' '), srcVersion: inc.appVersion });
      setMsg('');
    } catch (e) { setPreview(null); setMsg(`這段內容讀不出來：${e.message}`); }
  };

  return (
    <div className="p-4" style={{ display: 'grid', gap: 18 }}>
      <div>
        <Eyebrow>Data · 資料是你的，隨時帶得走</Eyebrow>
        <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 6 }}>資料保存</h2>
      </div>

      <div style={{ background: C.surf, border: `2px solid ${C.teal}`, padding: '13px 16px' }}>
        <Eyebrow color={C.teal}>儲存空間識別碼</Eyebrow>
        <div style={{ marginTop: 5 }}>
          <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: C.ink, letterSpacing: '0.06em' }}>{storageId()}</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 7 }}>
          在 Safari 與桌面 App 各自打開這一頁，比對這組碼：<b style={{ color: C.ink }}>相同＝資料互通</b>，
          改一邊另一邊就會跟著變；<b style={{ color: C.red }}>不同＝各存各的</b>，兩邊的紀錄不會互相看到，
          請選定一個入口固定使用，另一邊的資料用匯出／匯入搬過去。
        </div>
      </div>

      <div className="flex flex-wrap" style={{ gap: 22, background: C.surf, border: `1px solid ${C.hair}`, padding: '14px 16px' }}>
        {[['拜訪紀錄', `${log.length} 筆`], ['接單補登', `${(entries || []).length} 筆`], ['資料格式', `schema v${SCHEMA}`], ['分析資料期間', DATASET],
          ['程式版本', `v${APP_VERSION}`], ['建置時間', BUILD_AT], ['自動快照', `${backups.length} 份`],
          ['距上次快照', sinceBackup === null ? '—' : `${sinceBackup} 天`],
          ['上次匯入', lastImp ? lastImp.at : '從未']].map(([k, v]) => (
          <div key={k}><Eyebrow>{k}</Eyebrow><div style={{ marginTop: 3 }}><Num size={14} weight={600}>{v}</Num></div></div>
        ))}
      </div>

      <div style={{ background: C.amberBg, border: `1px solid #E8D9B8`, padding: '12px 15px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: '#4A3608' }}>請每兩週手動下載一次備份</div>
        <div style={{ fontSize: 12.5, color: '#5C4410', lineHeight: 1.8, marginTop: 5 }}>
          紀錄存在這台裝置的瀏覽器裡，跟著網域走，所以我更新程式碼不會動到它。但 iOS Safari 會清除長期未使用網站的本機資料，
          換手機、清快取、無痕視窗也都看不到。<b>下載下來的 JSON 檔才是真正安全的那一份。</b>
        </div>
      </div>

      <div>
        <SecHead n="1" t="匯出備份" />
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          <button onClick={download} style={{ background: C.ink, color: '#fff', fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '11px 20px' }}>下載 JSON 檔</button>
          <button onClick={() => { navigator.clipboard?.writeText(json); setMsg('已複製到剪貼簿'); }}
            style={{ background: C.surf, color: C.ink, border: `1px solid ${C.rule}`, fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '11px 20px' }}>複製 JSON</button>
        </div>
        {msg && <div style={{ fontSize: 12.5, color: C.teal, marginTop: 8 }}>{msg}</div>}
      </div>

      <div>
        <SecHead n="2" t="匯入／還原" />
        <div className="flex flex-wrap items-center" style={{ gap: 10, marginBottom: 9 }}>
          <label style={{ background: C.surf, border: `1px solid ${C.rule}`, padding: '9px 16px', fontFamily: SANS, fontSize: 13.5, cursor: 'pointer' }}>
            選擇 JSON 檔
            <input type="file" accept=".json,application/json" onChange={pickFile} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: 12, color: C.ink3 }}>或直接把內容貼在下面</span>
        </div>
        <textarea value={paste} onChange={(e) => { setPaste(e.target.value); setPreview(null); }}
          placeholder="把備份檔內容貼進來" 
          style={{ width: '100%', border: `1px solid ${C.rule}`, padding: '10px 12px', fontSize: 12, fontFamily: MONO, minHeight: 96, background: C.surf }} />
        <button onClick={check} disabled={!paste.trim()}
          style={{ background: paste.trim() ? C.teal : C.ink3, color: '#fff', fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '10px 18px', marginTop: 8 }}>
          檢查內容
        </button>
        {preview && (
          <div style={{ background: C.tealBg, border: `1px solid #CDE2E8`, padding: '12px 14px', marginTop: 10 }}>
            <div style={{ fontSize: 13.5, color: '#0A4A5A', lineHeight: 1.8 }}>
              拜訪紀錄 {preview.total} 筆：新增 <b>{preview.add.length}</b> 筆、
              ID 重複 <b>{preview.dupV.length}</b> 筆（{overwrite ? '將以匯入內容覆蓋' : '將略過'}）。
              <br />接單補登 {preview.totalE} 筆：新增 <b>{preview.addE.length}</b> 筆、
              ID 重複 <b>{preview.dupE.length}</b> 筆（{overwrite ? '將覆蓋' : '將略過'}）。
            </div>
            <label className="flex items-baseline" style={{ gap: 7, marginTop: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 12.5, color: '#0A4A5A', lineHeight: 1.6 }}>
                以匯入的內容覆蓋 ID 相同的紀錄。<b>跨裝置搬資料時要勾</b>——兩台裝置的種子紀錄 ID 相同，不勾的話你改過的版本會被當成重複而略過。
              </span>
            </label>
            {(preview.add.length > 0 || preview.addE.length > 0 || (overwrite && (preview.dupV.length > 0 || preview.dupE.length > 0))) && (
              <button onClick={() => {
                  const mergeV = overwrite
                    ? [...log.map((v) => preview.dupV.find((x) => x.id === v.id) || v), ...preview.add]
                    : [...log, ...preview.add];
                  const mergeE = overwrite
                    ? [...(entries || []).map((e) => preview.dupE.find((x) => x.id === e.id) || e), ...preview.addE]
                    : [...(entries || []), ...preview.addE];
                  onReplace(mergeV, mergeE); setPreview(null); setPaste('');
                  const rec = { at: new Date().toISOString().slice(0, 16).replace('T', ' '), from: preview.srcExportedAt || '未標示', v: preview.srcVersion || '?' };
                  try { rawSet(KEY.imp, rec); } catch {}
                  setLastImp(rec);
                  setMsg(`已合併：新增 ${preview.add.length + preview.addE.length} 筆${overwrite ? `、覆蓋 ${preview.dupV.length + preview.dupE.length} 筆` : ''}`);
                }}
                style={{ background: C.green, color: '#fff', fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '10px 18px', marginTop: 9 }}>
                確認合併
              </button>
            )}
          </div>
        )}
      </div>

      {lastImp && (
        <div style={{ background: C.tealBg, border: '1px solid #CDE2E8', padding: '11px 14px' }}>
          <Eyebrow color={C.teal}>單向同步狀態</Eyebrow>
          <div style={{ fontSize: 12.5, color: '#0A4A5A', lineHeight: 1.8, marginTop: 5 }}>
            這台裝置上次匯入是 <b>{lastImp.at}</b>，來源檔的匯出時間是 <b>{lastImp.from}</b>（v{lastImp.v}）。
            這台看到的資料就停在那個時間點，之後手機上新增的東西不會自己過來。
          </div>
        </div>
      )}

      <div>
        <SecHead n="3" t={`自動快照 ${backups.length} 份`} />
        {backups.length === 0 ? (
          <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: 14, fontSize: 13, color: C.ink2 }}>
            還沒有快照。每次存檔前會自動留一份，最多保留 {MAX_BACKUPS} 份。
          </div>
        ) : (
          <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
            {backups.map((b, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-2" style={{ borderBottom: `1px solid ${C.hair}`, gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <Num size={11.5}>{b.ts.slice(0, 16).replace('T', ' ')}</Num>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>{b.reason}· {(b.payload.visits || []).length} 筆</div>
                </div>
                <button onClick={() => { if (confirm('還原這份快照？目前的紀錄會先被自動快照保存。')) onRestore(b); }}
                  style={{ fontFamily: SANS, fontSize: 12.5, color: C.teal, border: `1px solid ${C.rule}`, padding: '6px 12px', background: C.surf, flexShrink: 0 }}>還原</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SecHead n="4" t="更新紀錄" />
        <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
          {CHANGELOG.map(([v, d, t], i) => (
            <div key={v} className="px-4 py-3" style={{ borderBottom: `1px solid ${C.hair}`, background: i === 0 ? '#F4F8F9' : C.surf }}>
              <div className="flex items-baseline" style={{ gap: 9 }}>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: i === 0 ? C.teal : C.ink3 }}>v{v}</span>
                <Num size={10.5} color={C.ink3}>{d}</Num>
                {i === 0 && <span style={{ fontFamily: MONO, fontSize: 9.5, color: '#fff', background: C.teal, padding: '2px 6px' }}>目前</span>}
              </div>
              <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.7, marginTop: 4 }}>{t}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.8, marginTop: 9 }}>
          上傳新版後若畫面沒變，多半是瀏覽器快取——強制重新整理（桌機 Cmd/Ctrl+Shift+R，手機關掉分頁再開），
          回這裡看版號是不是最新的。
        </div>
      </div>

      <div>
        <SecHead n="5" t="危險操作" />
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} style={{ fontFamily: SANS, fontSize: 13, color: C.red, border: `1px solid ${C.redRule}`, background: C.redBg, padding: '10px 16px' }}>
            清除全部紀錄
          </button>
        ) : (
          <div style={{ background: C.redBg, border: `1px solid ${C.redRule}`, padding: '12px 14px' }}>
            <div style={{ fontSize: 13.5, color: '#4A1E1A', lineHeight: 1.7 }}>
              確定要清除 {log.length} 筆拜訪紀錄與 {(entries || []).length} 筆補登嗎？清除前會自動留一份快照，但請先下載 JSON 備份比較保險。
            </div>
            <div className="flex" style={{ gap: 8, marginTop: 10 }}>
              <button onClick={() => { onReplace([], []); setConfirmClear(false); setMsg('已清除，快照仍保留'); }}
                style={{ background: C.red, color: '#fff', fontFamily: SANS, fontSize: 13.5, fontWeight: 700, padding: '9px 16px' }}>確定清除</button>
              <button onClick={() => setConfirmClear(false)}
                style={{ background: C.surf, color: C.ink, border: `1px solid ${C.rule}`, fontFamily: SANS, fontSize: 13.5, padding: '9px 16px' }}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── 畫面七：接單補登 ─────────────────────────────────── */
function EntryScreen({ entries, onSave, grps }) {
  const [grp, setGrp] = useState(grps[0]);
  const [date, setDate] = useState(TODAY_STR());
  const [lines, setLines] = useState([{ item: 'Ultra MD', paid: '', gift: '' }]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState(null);

  const live = liveEntries(entries).sort((a, b) => (a.date < b.date ? 1 : -1));
  const arch = (entries || []).filter(isArchived);
  const lineAmt = (l) => (Number(l.paid) || 0) * UNIT[l.item];
  const total = lines.reduce((a, l) => a + lineAmt(l), 0);
  const valid = lines.some((l) => (Number(l.paid) || 0) > 0 || (Number(l.gift) || 0) > 0);

  const setLine = (i, patch) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addLine = () => {
    const used = new Set(lines.map((l) => l.item));
    const next = Object.keys(UNIT).find((k) => !used.has(k)) || 'Ultra MD';
    setLines([...lines, { item: next, paid: '', gift: '' }]);
  };
  const delLine = (i) => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines);
  const reset = () => { setLines([{ item: 'Ultra MD', paid: '', gift: '' }]); setNote(''); setEditId(null); };

  const save = () => {
    if (!valid) { setMsg('至少要有一個品項填了數量'); return; }
    if (date <= CUTOFF) { setMsg(`日期必須晚於官方資料截止日 ${CUTOFF}，否則會與官方資料重複計算`); return; }
    const now = new Date().toISOString();
    const keep = lines.filter((l) => (Number(l.paid) || 0) > 0 || (Number(l.gift) || 0) > 0);
    if (editId) {
      const l = keep[0];
      onSave((entries || []).map((e) => (e.id === editId
        ? { ...e, grp, date, item: l.item, paidEA: Number(l.paid) || 0, giftEA: Number(l.gift) || 0, unit: UNIT[l.item], note, updatedAt: now }
        : e)));
      setMsg(`已更新：${grp} ${l.item}`);
    } else {
      const recs = keep.map((l, i) => ({
        id: `e-${Date.now()}-${i}`, grp, date, item: l.item,
        paidEA: Number(l.paid) || 0, giftEA: Number(l.gift) || 0, unit: UNIT[l.item],
        note, createdAt: now,
      }));
      onSave([...(entries || []), ...recs]);
      setMsg(`已補登 ${recs.length} 個品項：${grp} ${date}`);
    }
    reset();
  };

  const edit = (e) => {
    setEditId(e.id); setGrp(e.grp); setDate(e.date);
    setLines([{ item: e.item, paid: String(e.paidEA || ''), gift: String(e.giftEA || '') }]);
    setNote(e.note || ''); setMsg('');
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const del = (id) => { onSave((entries || []).filter((e) => e.id !== id)); if (editId === id) reset(); };

  const inp = { border: `1px solid ${C.rule}`, padding: '9px 10px', fontFamily: MONO, fontSize: 14, background: C.surf, width: '100%' };

  return (
    <div className="p-4" style={{ display: 'grid', gap: 18 }}>
      <div>
        <Eyebrow>Live orders · 今天接到的單，馬上進來</Eyebrow>
        <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 6 }}>接單補登</h2>
        <p style={{ fontSize: 13, color: C.ink2, marginTop: 6, lineHeight: 1.75 }}>
          官方 Offtake 只到 {CUTOFF}。這裡補的是那之後的實際下單，會即時修正排程、斷單判定與客戶卡，
          但<b style={{ color: C.ink }}>不會併進 YoY 成長率</b>——期間對不上，比了會失真。
        </p>
      </div>

      <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '14px 16px', display: 'grid', gap: 13 }}>
        {editId && (
          <div style={{ background: C.tealBg, border: '1px solid #CDE2E8', padding: '8px 11px', fontSize: 12.5, color: '#0A4A5A' }}>
            編輯既有補登，一次只能改一個品項。
          </div>
        )}
        <div className="flex flex-wrap" style={{ gap: 12 }}>
          <div style={{ flex: '2 1 200px' }}>
            <Eyebrow>客戶群</Eyebrow>
            <select value={grp} onChange={(e) => setGrp(e.target.value)} style={{ ...inp, fontFamily: SANS, marginTop: 4 }}>
              {grps.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <Eyebrow>訂單日期</Eyebrow>
            <input type="date" value={date} min="2026-08-01" onChange={(e) => setDate(e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
        </div>

        <div>
          <Eyebrow>品項與數量 · 同一張訂單可以一次加多個</Eyebrow>
          <div style={{ display: 'grid', gap: 10, marginTop: 7 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ border: `1px solid ${C.hair}`, background: '#FAFCFC', padding: '10px 11px' }}>
                <div className="flex flex-wrap" style={{ gap: 5 }}>
                  {Object.keys(UNIT).map((it) => (
                    <button key={it} onClick={() => setLine(i, { item: it })}
                      style={{ fontFamily: SANS, fontSize: 12.5, padding: '6px 10px',
                        border: `1px solid ${l.item === it ? C.ink : C.rule}`,
                        background: l.item === it ? C.ink : C.surf, color: l.item === it ? '#fff' : C.ink2 }}>{it}</button>
                  ))}
                </div>
                <div className="flex flex-wrap items-end" style={{ gap: 10, marginTop: 9 }}>
                  <div style={{ flex: '1 1 84px' }}>
                    <Eyebrow>付費 EA</Eyebrow>
                    <input type="number" inputMode="numeric" value={l.paid} placeholder="0"
                      onChange={(e) => setLine(i, { paid: e.target.value })} style={{ ...inp, marginTop: 4 }} />
                  </div>
                  <div style={{ flex: '1 1 84px' }}>
                    <Eyebrow>贈品 EA</Eyebrow>
                    <input type="number" inputMode="numeric" value={l.gift} placeholder="0"
                      onChange={(e) => setLine(i, { gift: e.target.value })} style={{ ...inp, marginTop: 4 }} />
                  </div>
                  <div style={{ flex: '2 1 150px', paddingBottom: 2 }}>
                    <Eyebrow>單價（鎖定．未稅）</Eyebrow>
                    <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 13.5, color: C.ink }}>
                      {UNIT[l.item]}
                      <span style={{ fontSize: 11, color: C.ink3, marginLeft: 7 }}>＝進價 {UNIT_TAX[l.item]} 含稅</span>
                    </div>
                  </div>
                  <div style={{ paddingBottom: 3, textAlign: 'right', flex: '1 1 90px' }}>
                    <Eyebrow>報表金額</Eyebrow>
                    <div style={{ marginTop: 4 }}><Num size={14} weight={600}>{nf(lineAmt(l))}</Num></div>
                  </div>
                  {lines.length > 1 && !editId && (
                    <button onClick={() => delLine(i)} style={{ fontFamily: SANS, fontSize: 12, color: C.red, paddingBottom: 6 }}>移除</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!editId && lines.length < Object.keys(UNIT).length && (
            <button onClick={addLine}
              style={{ marginTop: 9, border: `1px dashed ${C.rule}`, background: C.surf, color: C.teal,
                fontFamily: SANS, fontSize: 13.5, fontWeight: 700, padding: '10px 16px', width: '100%' }}>
              ＋ 再加一個品項
            </button>
          )}
        </div>

        <div>
          <Eyebrow>備註（選填．整張訂單共用）</Eyebrow>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：搭贈檔期、電話追單"
            style={{ ...inp, fontFamily: SANS, marginTop: 4 }} />
        </div>

        <div className="flex items-center flex-wrap" style={{ gap: 12, borderTop: `1px solid ${C.hair}`, paddingTop: 12 }}>
          <button onClick={save}
            style={{ background: valid ? C.ink : C.ink3, color: '#fff', fontFamily: SANS, fontSize: 15, fontWeight: 700, padding: '12px 24px' }}>
            {editId ? '儲存修改' : `補登這張訂單${lines.filter((l) => Number(l.paid) || Number(l.gift)).length > 1 ? `（${lines.filter((l) => Number(l.paid) || Number(l.gift)).length} 個品項）` : ''}`}
          </button>
          {editId && <button onClick={reset} style={{ background: C.surf, border: `1px solid ${C.rule}`, fontFamily: SANS, fontSize: 14, padding: '11px 18px' }}>取消編輯</button>}
          <div style={{ fontSize: 13, color: C.ink2 }}>整張合計 <Num size={16} weight={600}>{nf(total)}</Num></div>
        </div>
        {msg && <div style={{ fontSize: 12.5, color: msg.startsWith('已') ? C.green : C.red, lineHeight: 1.6 }}>{msg}</div>}
      </div>

      <div>
        <SecHead n="1" t={`生效中 ${live.length} 筆`} />
        {live.length === 0 ? (
          <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: 14, fontSize: 13, color: C.ink2, lineHeight: 1.7 }}>
            還沒有補登。接到單就進來記一筆，排程與斷單判定會立刻跟著改。
          </div>
        ) : (
          <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
            {live.map((e) => (
              <div key={e.id} className="flex items-baseline flex-wrap px-3 py-3" style={{ borderBottom: `1px solid ${C.hair}`, gap: 8, background: editId === e.id ? C.tealBg : C.surf }}>
                <Num size={11.5} color={C.ink3}>{e.date}</Num>
                <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: C.ink }}>{e.grp}</span>
                <span style={{ fontFamily: SANS, fontSize: 13, color: C.ink2 }}>{e.item}</span>
                <Num size={12.5} color={C.green} weight={600}>{e.paidEA} EA</Num>
                {e.giftEA > 0 && <Num size={11.5} color={C.ink3}>贈 {e.giftEA}</Num>}
                <Num size={11.5} color={C.ink2}>{nf(e.paidEA * e.unit)}</Num>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                  <button onClick={() => edit(e)} style={{ fontFamily: SANS, fontSize: 12, color: C.teal }}>編輯</button>
                  <button onClick={() => del(e.id)} style={{ fontFamily: SANS, fontSize: 12, color: C.red }}>刪除</button>
                </span>
                {e.note && <div style={{ width: '100%', fontSize: 12, color: C.ink3, marginTop: 4 }}>{e.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {arch.length > 0 && (
        <div>
          <SecHead n="2" t={`已歸檔 ${arch.length} 筆 · 不列入計算`} />
          <div style={{ background: '#F4F7F8', border: `1px solid ${C.hair}`, padding: '11px 14px' }}>
            <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8 }}>
              這些補登的日期已被官方資料涵蓋（≤ {CUTOFF}），為避免重複計算而停用，但內容保留。
            </div>
            {arch.map((e) => (
              <div key={e.id} className="flex items-baseline py-2" style={{ gap: 8, borderTop: `1px solid ${C.hair}`, marginTop: 8 }}>
                <Num size={11} color={C.ink3}>{e.date}</Num>
                <span style={{ fontSize: 12.5, color: C.ink3 }}>{e.grp} {e.item} {e.paidEA} EA</span>
                <button onClick={() => del(e.id)} style={{ marginLeft: 'auto', fontFamily: SANS, fontSize: 11.5, color: C.ink3 }}>刪除</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.85 }}>
        <b style={{ color: C.ink }}>單價已鎖定，不可手動更改</b>（Kit 2026/08/15 裁定）。採用的是 Offtake 報表的<b style={{ color: C.ink }}>未稅</b>單價，
        與官方資料同一口徑；旁邊標示的是對應的含稅進價，只供你核對，不進入計算。
        兩者混用會讓補登金額比官方資料多算 5%，即時成長率會恆為高估。
        TNF 於 2026/04 由 285.7 調為 333.35，補登一律適用新價。
        贈品 EA 計入總量與贈品率、不計入金額與付費 EA，與 SOP 三口徑一致。
        一張訂單的多個品項會各自存成獨立紀錄（流速是逐條品項線計算的），只有輸入端合併。
      </div>
    </div>
  );
}

/* ── 外殼 ─────────────────────────────────────────────── */
const NAV = [['entry', '🔥接單'], ['prep', '拜訪前'], ['review', '複盤'], ['sched', '排程'], ['data', '資料']];

export default function App() {
  const [tab, setTab] = useState('entry');
  const [sel, setSel] = useState(null);
  const [logGrp, setLogGrp] = useState(null);
  const [editing, setEditing] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [backups, setBackups] = useState([]);
  const [entries, setEntries] = useState([]);
  const [newVer, setNewVer] = useState(null);

  // 版本偵測：iOS 桌面 App 的 HTTP 快取無法手動清除，改由程式主動比對
  useEffect(() => {
    if (typeof fetch !== 'function') return;   // 缺少 fetch 的環境直接略過，不得讓版本偵測拖垮整個畫面
    try {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => { if (v && v.version && v.version !== APP_VERSION) setNewVer(v); })
      .catch(() => {});
    } catch { /* 版本偵測失敗不影響任何功能 */ }
  }, []);

  useEffect(() => {
    try {
      const { blob, migrated } = loadAll();
      if (!blob) {
        const seeded = saveAll(SEED, []);
        setLog(seeded.visits); setEntries([]);
        setErr('首次啟動：已載入 1 筆自 Claude 轉錄的建祥拜訪紀錄。請到「資料」頁下載一份 JSON 備份。');
      } else {
        setLog(blob.visits || []); setEntries(blob.entries || []);
        if (migrated) setErr(`資料格式已升級至 schema v${SCHEMA}，升級前的版本已存成快照。`);
      }
      setBackups(rawGet(KEY.backups) || []);
    } catch (e) {
      setErr(`讀取本機資料失敗：${e.message}。先不要輸入新紀錄，請截圖畫面內容。`);
    }
    setLoading(false);
  }, []);

  const persist = (next, nextEntries) => {
    const ent = nextEntries !== undefined ? nextEntries : entries;
    setLog(next); setEntries(ent);
    try { saveAll(next, ent); setBackups(rawGet(KEY.backups) || []); setErr(null); }
    catch (e) { setErr(`存檔失敗（${e.message}）。瀏覽器儲存空間可能已滿或處於無痕模式——離開前請到「資料」頁複製 JSON。`); }
  };

  const restore = (b) => { persist((b.payload && b.payload.visits) || [], (b.payload && b.payload.entries) || []); };

  const saveVisit = (v, isEdit) => {
    persist(isEdit ? log.map((x) => (x.id === v.id ? v : x)) : [...log, v]);
    if (!isEdit) { try { localStorage.removeItem(KEY.draft); } catch {} }
    setLogGrp(null); setEditing(null); setSel(null); setTab('review');
  };
  const deleteVisit = (id) => {
    persist(log.filter((x) => x.id !== id));
    setLogGrp(null); setEditing(null); setTab('review');
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: SANS, color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        button:focus-visible, textarea:focus-visible, input:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 1px; }
        textarea, input { border-radius: 0; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>

      <div style={{ maxWidth: 780, margin: '0 auto', background: C.bg, minHeight: '100vh' }}>
        <header className="px-4 py-3" style={{ background: C.ink, color: '#fff' }}>
          <div className="flex items-baseline justify-between">
            <div>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 900, letterSpacing: '0.02em' }}>獨立藥局 拜訪作戰台</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#8FA8B2', marginTop: 2, letterSpacing: '0.08em' }}>v{APP_VERSION} · SOP v2.8 · 分析 {DATASET} · schema v{SCHEMA}</div>
            </div>
          </div>
        </header>

        <nav className="flex" style={{ background: C.surf, borderBottom: `1px solid ${C.rule}`, position: 'sticky', top: 0, zIndex: 10 }}>
          {NAV.map(([k, t]) => (
            <button key={k} onClick={() => { setTab(k); setSel(null); setLogGrp(null); setEditing(null); }}
              style={{
                flex: 1, padding: '11px 4px', fontFamily: SANS, fontSize: 13.5,
                fontWeight: tab === k ? 900 : 500, color: tab === k ? C.ink : C.ink3,
                borderBottom: `2px solid ${tab === k ? C.ink : 'transparent'}`, background: 'none',
              }}>{t}</button>
          ))}
        </nav>

        {newVer && (
          <div className="px-4 py-3" style={{ background: C.teal, color: '#fff' }}>
            <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <div style={{ flex: '1 1 200px', fontSize: 13, lineHeight: 1.65 }}>
                有新版本 <b>v{newVer.version}</b>（{newVer.buildAt}），你手上是 v{APP_VERSION}。
                你的紀錄不會受影響。
              </div>
              <button onClick={() => { window.location.replace(window.location.pathname + '?v=' + newVer.version); }}
                style={{ background: '#fff', color: C.teal, fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '9px 18px' }}>
                立即更新
              </button>
            </div>
          </div>
        )}
        {err && (
          <div className="px-4 py-3" style={{ background: C.redBg, borderBottom: `1px solid ${C.redRule}`, fontSize: 13, color: '#4A1E1A', lineHeight: 1.7 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div className="p-8" style={{ fontSize: 13, color: C.ink3 }}>載入拜訪紀錄…</div>
        ) : logGrp ? (
          <LogForm grp={logGrp} existing={editing} onSave={saveVisit} onDelete={deleteVisit} allEntries={entries}
            onCancel={() => { setLogGrp(null); setEditing(null); }} />
        ) : tab === 'prep' ? (
          sel ? <Card grp={sel} onBack={() => setSel(null)} onLog={(g) => setLogGrp(g)} entries={entries} /> : <PrepList onPick={setSel} entries={entries} log={log} />
        ) : tab === 'entry' ? (
          <EntryScreen entries={entries} onSave={(e) => persist(log, e)} grps={ALL_GRPS} />
        ) : tab === 'review' ? (
          <Review log={log} onClear={() => persist([])} entries={entries} onEdit={(v) => { setEditing(v); setLogGrp(v.grp); }} />
        ) : tab === 'sched' ? (
          <Schedule entries={entries} />
        ) : (
          <DataScreen log={log} onReplace={persist} backups={backups} onRestore={restore} entries={entries} />
        )}

        <footer className="px-4 py-6" style={{ fontSize: 11.5, color: C.ink3, lineHeight: 1.8, borderTop: `1px solid ${C.rule}`, marginTop: 20 }}>
          分析數字為 {DATASET} 與去年同期對照，寫死在程式碼裡，每期新的 Offtake 檔進來後需重新產生。
          拜訪紀錄存在這台裝置的瀏覽器（localStorage，命名空間 {NS}），與程式碼分離，更新版本不會影響。
          換裝置或清除瀏覽器資料則看不到——請定期到「資料」頁下載 JSON 備份。
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.hair}` }}>
            <Eyebrow>本版更新時間</Eyebrow>
            <div style={{ marginTop: 3 }}>
              <Num size={12.5} color={C.ink2} weight={600}>{BUILD_AT}</Num>
              <Num size={11} color={C.ink3}>　v{APP_VERSION}</Num>
            </div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>
              台北時間。若這裡的時間比預期舊，代表瀏覽器拿到的是快取版本，請強制重新整理。
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
