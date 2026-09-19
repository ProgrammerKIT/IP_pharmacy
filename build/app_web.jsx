import React, { useState, useEffect } from 'react';

/* 客戶資料不編進程式檔（見 SOP：程式與客戶資料兩條路徑分開）。
   以下四個容器在 App 啟動時由「匯入的資料檔」填入；未匯入時為空，畫面顯示匯入引導。 */
let DATA = {};

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
/* 拜訪優先序＝客戶資料，由資料檔帶入 */
let PRIORITY = [];

const BAND_C = { 救火: C.red, 時效: C.amber, 機會: C.teal };

/* ── 每家店的禁區、議題、素材、待補情報 ──────────────── */
/* PLAY 已移出程式檔（客戶劇本／禁區＝客戶資料）。執行時由匯入的資料檔填入。 */
let PLAY = {};



/* ══════════════════════════════════════════════════════════
   特註豁免｜單一規則來源 —— 排程頁、客戶卡斷單區、複盤頁預測驗證
   三處全部呼叫 exempt()，禁止任何頁面自行判斷。
   新增規則只改這裡；改完三個頁面同時生效。
   來源：SOP v2.4「已定案的歷史裁定」第 9／10／11 條與第三步之二排除規則。
   ══════════════════════════════════════════════════════════ */
const P1_SET = new Set(['Ultra MD', 'X3', 'Ultra UD', 'HAUD', 'HAMD', 'C']);

/* 豁免規則＝客戶資料，由資料檔帶入。原為 match 函式，改宣告式：
   items 為 null＝全品項、'P1'＝P1 六品項、陣列＝指定品項。判斷見 matchExempt。 */
let EXEMPT_RULES = [];
function matchExempt(r, g, i) {
  if (r.grp !== g) return false;
  if (!r.items) return true;                       // 全品項
  if (r.items === 'P1') return P1_SET.has(i);      // P1 六品項
  return r.items.includes(i);                      // 指定品項
}

function exempt(grp, item) {
  return EXEMPT_RULES.find((r) => matchExempt(r, grp, item)) || null;
}

/* 議題穩定 ID 與目標類型｜ID 不隨議題文字改寫而變動，歷史紀錄才對得回來 */
let GRP_KEY = {};
let TOPIC_KIND = {};
/* 全部 22 客戶群：優先名單 8 家排前，其餘依 2026 金額。接單補登涵蓋全部。 */
// 排除通路彙總 __CH__：它有 grp 但沒有客戶層欄位，混進來會讓客戶清單多出一筆假客戶
let GROUP_LIST = [];
/* 由資料檔衍生，必須在 hydrate 之後才算得出來。
   ⚠ 不得在模組層直接求值——載入當下容器還是空的，算出來會是空集合。 */
let PRI_SET = new Set();
let ALL_GRPS = [];

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
      t: `${c.item} 已 ${gap} 天沒訂`, d: `訂單平均相隔 ${c.avg_int} 天，已達 ${(gap / c.avg_int).toFixed(1)} 倍。問是賣不動、被競品接走，還是採購節奏改了。` });
  });
  (d.zero || []).forEach((z) => {
    if (exempt(grp, z.item)) return;
    out.push({ pri: 2, kind: '拿單', t: `${z.item} 2026 全期歸零`, d: `2025 全年做 ${nf(z.s25)}（${z.e25} EA），末筆訂單 ${z.last}${z.h2 ? '——這條是 2025 下半年才斷的，2026 全期零' : ''}。單線斷掉通常關係還在，優先接線。` });
  });
  const ha = d.items.filter((x) => (x.item === 'HAUD' || x.item === 'HAMD')).reduce((a, x) => a + x.s26, 0);
  if (ha === 0) out.push({ pri: 3, kind: '拿單', t: 'HA 系列兩年未導入',
    d: `這家店 2026 做 ${nf(d.s26)}，HA 一條線都沒有。${HA_PITCH}` });
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
const KEY = { dataset: NS + ':dataset', dsbak: NS + ':dsbak', data: NS + ':data', backups: NS + ':backups', draft: NS + ':draft', sid: NS + ':sid', imp: NS + ':lastimport', exp: NS + ':lastexport' };
const BACKUP_DUE_DAYS = 14;   // 超過即提醒手動匯出（自動快照防不了 iOS 清除本機資料）
let CUTOFF = '';   // 官方 Offtake 資料截止日，由資料檔帶入。補登只認這天之後的訂單。
/* 單價一律鎖定（Kit 2026/08/15 裁定），不可手動更改。
   採用值＝Offtake 報表之 InvoiceSales 單價，**未稅**。
   Kit 提供之進價為含稅（＝未稅 ×1.05），僅供對照顯示，不進入計算——
   兩者混用會使補登金額比官方資料多算 5%，即時 YoY 恆為高估。
   期中調價一律以資料檔帶入之單價為準（調價為一刀切，與客戶及品名無關）。 */
let UNIT = {};   // 單價屬客戶／商業資料，由資料檔帶入，仍為鎖定不可手動更改
const UNIT_TAX = { 'Ultra MD': 178, 'X3': 483, 'Ultra UD': 295, 'HAUD': 450, 'HAMD': 350, 'C': 250, 'TN': 100, 'TNF': 350, 'DT': 61.57 };
const SCHEMA = 3;
const APP_VERSION = '2.1.5';
const BUILD = '2026-08-15';
const BUILD_AT = '__BUILD_AT__';   // 建置當下的台北時間，由打包程序注入
/* 每次交付都遞增 APP_VERSION，資料頁看得到，你才分得出手上是哪一版 */
const CHANGELOG = [
  ['1.17.0', '2026-08-20', '匯入改為依時間戳自動判斷新舊（取消手動勾選覆蓋）；新增雙邊分歧警告；備份逾期 14 天提醒'],
  ['1.16.1', '2026-08-20', '修正：版本偵測只在載入時執行一次，iOS 桌面 App 從背景恢復時不會檢查；改為每次回到前景都重新檢查'],
  ['1.16.0', '2026-08-20', '接單補登新增「下單時間」（上午／下午＋整點，選填）；客戶卡新增下單時間習慣分析，滿 5 筆才給結論'],
  ['2.1.5', '2026-09-20', '說明欄釐清兩件事：卡片右上角建議日取的是「一趟能收最多線」那天，未必等於警訊線的建議日（實測 8 家中 7 家相同、1 家不同）；效率區改寫為「建議日已過即代表估計庫存見底，去了是補單也是止血」，原文「不是救火」會低估'],
  ['2.1.4', '2026-09-20', '品項方塊的天數加上「距今」標籤（原為光禿的「81天」，與「訂單平均相隔」同為天數卻無標示，容易誤讀）；說明欄改列三個詞的差異'],
  ['2.1.3', '2026-09-20', '用詞統一：天數一律稱「訂單平均相隔」、數量一律稱「平均每批」——原本兩者都叫「平均」但單位不同（天 vs EA），容易混淆。說明欄加註兩詞差異'],
  ['2.1.2', '2026-09-19', '手機閱讀優化：「單條線排程」84 條改為預設收合（整頁由約 10,400 字降到約 2,400 字）；摘要列改為 sticky，捲動時固定在頂部；滅火區警訊列改為品項與倍數同一行、細節縮次行，窄螢幕不再拆行'],
  ['2.1.1', '2026-09-19', '排程頁改為一眼可讀：頂部加摘要列（滅火幾家幾條、效率幾家、最急是誰）；算法與欄位說明改為預設收合（內容不刪）；效率區預設只列 5 家且明細收起，滅火區維持完整攤開'],
  ['2.1.0', '2026-09-19', '排程改為兩區：「先滅火」（有斷單警訊，依警訊條數→最高倍數）與「效率排程」（無警訊，依一趟收得完的比率）。並修正只列建議日已過的線——原本未到期的線也算進「一趟收 N 條」，使訂得勤的健康客戶排在前面、出事的客戶被擠到後面。說明欄補上排序規則'],
  ['2.0.5', '2026-09-19', '排程頁新增「欄位說明」區塊：逐項說明建議日、逾期天數、一趟收 N／M、末單日、天數、付費+贈品數量、平均批量各代表什麼，並點出「逾 38 天」與「80天」是兩個不同基準'],
  ['2.0.4', '2026-09-19', '排程方塊改顯示末單日、距今天數、末單數量(含贈品)與平均批量，標題明確標示「建議」日；斷單警訊改依倍數排序並顯示倍數（天數未除掉各店訂貨頻率）；今天改用台北時區（原為 UTC，午夜到早上 8 點會少算一天）'],
  ['2.0.3', '2026-09-15', '修正：兩年皆掛零的品項線在客戶卡整列不顯示，該線的補登因而無處可掛、靜默消失在畫面上（資料其實有存）。改為有補登即列出並標「首見」——掛零線突然來單正是最該看見的訊號'],
  ['2.0.2', '2026-09-15', '修正：客戶卡補登欄位的標籤寫死為「7/31」，官方截止日推進後未跟著更新（數字一直是對的，只有標籤過期）。改為由資料檔的截止日導出'],
  ['2.0.1', '2026-09-12', '修正 v2.0.0：客戶清單、豁免比對集合、補登截止日等衍生值誤在模組層求值，當時資料檔尚未匯入，導致接單頁客戶選單全空。改於匯入後統一重算，並在測試加入選單筆數斷言'],
  ['2.0.0', '2026-09-12', '程式與客戶資料分離：App 程式檔不再含任何客戶資料（分析數字、客戶劇本與禁區、優先序、豁免規則、單價全部移出），改由使用者匯入 pharmacy-data.json，只存在本機。首次啟動顯示匯入畫面；資料頁可更新資料檔，匯入前驗證格式、保留上一份可退回'],
  ['1.21.1', '2026-09-07', '修正：資料頁的置頂提醒重複出現兩個相同區塊，合併為一個'],
  ['1.21.0', '2026-09-07', '「資料」頁置頂單一輸入入口提醒：以手機為主力、網頁版只當備援；說明匯入為單向搬移而非同步'],
  ['1.20.0', '2026-09-03', '撤除即時成長率（SOP 裁定 16 修訂）：補登改為只登經手訂單，全通路加總永遠不完整，成長率恆為低估。補登價值改定位於逐條線修正排程、斷單判定與下單時段；首頁與客戶卡改顯示「補登現況」'],
  ['1.19.0', '2026-09-03', '拜訪歷程可「展開閱讀」：原地攤開議題備註與新情報，唯讀不進編輯表單；加客戶篩選與筆數，並依日期新到舊排序'],
  ['1.18.0', '2026-09-03', '口徑升級為 1–8 月（SOP v3.9 裁定 23）；補登截止日推進，逾期補登自動歸檔；命中率補上 5 筆樣本門檻；客戶卡禁區與議題依現場回報更新'],
  ['1.15.1', '2026-08-18', '修正：體系內部拆解的 2025 端誤用全年資料（應為 1–7 月同期），影響 7 個合併客戶群；pipeline 加入期間口徑不變式檢查'],
  ['1.15.0', '2026-08-15', '「🔥接單」移至最左並設為預設起始頁'],
  ['1.14.0', '2026-08-15', '接單補登改為一張訂單可一次輸入多個品項，顯示整張合計'],
  ['1.13.0', '2026-08-15', '移除「紀錄」分頁（與拜訪前重複，Kit 裁定一律由客戶卡進入）；拜訪歷程與編輯移至複盤頁'],
  ['1.12.1', '2026-08-15', '補登表單「金額」改稱「報表金額」，明確標示為未稅口徑'],
  ['1.12.0', '2026-08-15', '單價鎖定為報表未稅價，不可手動更改；同時標示對應含稅進價；期中調價一律套用新價'],
  ['1.11.0', '2026-08-15', '新增「待追蹤承諾」：拜訪紀錄裡結果為口頭承諾的議題自動列出並顯示擱置天數'],
  ['1.10.1', '2026-08-15', '修正：版本偵測在缺少 fetch 的環境會導致整頁空白，改為安全略過'],
  ['1.10.0', '2026-08-15', '匯入支援直接選 JSON 檔；資料頁顯示上次匯入時間與來源匯出時間（單向同步用）'],
  ['1.9.2', '2026-08-15', '自動偵測新版本：伺服器有更新時跳出橫幅，一鍵繞過快取載入（解決 iOS 桌面 App 拿到舊版）'],
  ['1.9.1', '2026-08-15', '匯入可選擇覆蓋同 ID 紀錄（跨裝置搬資料用），預覽顯示新增／覆蓋／略過筆數'],
  ['1.9.0', '2026-08-15', '資料頁新增「儲存空間識別碼」：兩個入口顯示同一組碼＝資料互通，不同＝各存各的'],
  ['1.8.1', '2026-08-15', '加入 App 圖示與 iOS 全螢幕支援，可加到主畫面當獨立 App 使用'],
  ['1.8.0', '2026-08-15', '更正兩處末筆訂單日誤記；優先序重排；歸零線改用 2025 全年判定'],
  ['1.7.0', '2026-08-15', '涵蓋度不足時不計算通路即時成長率（寧可留白）；列出未補登且去年同期有單的客戶'],
  ['1.6.1', '2026-08-15', '頁尾顯示本版建置日期時間；標題列 SOP 版號更正為 v2.8'],
  ['1.6.0', '2026-08-15', '補齊 2025 全年資料：新增雙口徑 YoY（官方已對帳／即時含補登）、2025 同日累計基準、季節性'],
  ['1.6.0', '2026-08-15', '補上 2025 全年資料，新增雙口徑：官方（已對帳）與即時同日累計（含補登，未對帳）並列'],
  ['1.6.0', '2026-08-15', '補上 2025 全年資料：雙口徑改用 2025 同日累計為基準，客戶卡與首頁並列顯示'],
  ['1.5.1', '2026-08-15', '修正：複盤頁因資料欄位變更而空白（預測驗證改由即時節奏計算）'],
  ['1.5.0', '2026-08-15', '一家客戶改判為一般門市（Kit 裁定），移出倉庫型豁免，恢復流速與斷單判讀'],
  ['1.4.0', '2026-08-15', '全 22 客戶群納入：接單補登、排程、客戶卡數字全數涵蓋；非優先名單自動生成議題'],
  ['1.3.0', '2026-08-15', '拜訪紀錄可編輯與刪除、可自訂拜訪日期；補登可編輯；加入版號與更新紀錄'],
  ['1.2.0', '2026-08-15', '新增「接單」補登：即時修正排程、斷單與客戶卡；補登與官方資料分離，逾期自動歸檔'],
  ['1.1.0', '2026-08-14', '改為 GitHub Pages 單檔；localStorage 保存、schema 遷移、自動快照、匯出匯入、草稿自動存檔'],
  ['1.0.0', '2026-08-14', '拜訪前議題、紀錄、複盤、排程四頁；特註豁免單一規則來源'],
];
let DATASET = '';
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
/* ── 資料檔（客戶資料）──────────────────────────────────────────────
   程式檔不含任何客戶資料。分析數字、客戶劇本／禁區、單價一律由使用者
   匯入的 pharmacy-data.json 提供，存在本機 localStorage，永不上傳。
   程式更新不會動到這份資料（與拜訪紀錄、補登同理）。 */
const DS_SCHEMA = 1;
function hydrate(p) {
  if (!p || p.kind !== 'pharmacy-dataset') throw new Error('這不是資料檔（缺少 kind 標記）');
  if (p.schema > DS_SCHEMA) throw new Error(`資料檔版本 ${p.schema} 高於本 App 支援的 ${DS_SCHEMA}，請先更新 App`);
  if (!p.data || typeof p.data !== 'object') throw new Error('資料檔缺少 data 區塊');
  DATA = p.data;
  PLAY = p.play || {};
  UNIT = p.unit || {};
  DATASET = p.dataset || '';
  CUTOFF = p.cutoff || '';
  GROUP_LIST = Object.values(DATA).filter((d) => d.grp && Array.isArray(d.items));
  CH = DATA.__CH__ || null;
  PRIORITY = p.priority || [];
  EXEMPT_RULES = p.exempt || [];
  GRP_KEY = p.grpKey || {};
  TOPIC_KIND = p.topicKind || {};
  SEED = p.seed || [];
  HA_PITCH = p.haPitch || '';
  // ── 衍生值：全部在這裡重算，不得散落到模組層 ──
  PRI_SET = new Set(PRIORITY.map((x) => x.grp));
  ALL_GRPS = [
    ...PRIORITY.map((x) => x.grp),
    ...GROUP_LIST.filter((d) => !PRI_SET.has(d.grp)).sort((a, b) => b.s26 - a.s26).map((d) => d.grp),
  ];
  CUT_MMDD = (CUTOFF || '').slice(5);
  return { groups: GROUP_LIST.length, dataset: DATASET, cutoff: CUTOFF, buildAt: p.buildAt || '' };
}
function loadDataset() {
  const p = rawGet(KEY.dataset);
  if (!p) return null;
  try { return hydrate(p); } catch { return null; }
}

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
  if (b.schema === 2) b = { ...b, schema: 3, entries: (b.entries || []).map((e) => ({ hour: null, ...e })) };
  return { ...b, schema: SCHEMA, entries: (b.entries || []).map((e) => ({ hour: e.hour ?? null, ...e })) };
}

/* 補登是否已被新的官方資料涵蓋。涵蓋者歸檔：保留但不列入計算，避免重複計數。 */
const isArchived = (e) => e.date <= CUTOFF;
/* 補登欄位的標籤一律由 CUTOFF 導出。寫死日期會在官方檔更新後靜靜說謊——
   數字照樣正確，只有標籤過期，畫面上看不出異狀。（2026/09/15 修，原寫死 7/31。） */
const cutLabel = () => { const p = (CUTOFF || '').split('-'); return p.length === 3 ? `${+p[1]}/${+p[2]}` : ''; };
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
/* 種子拜訪紀錄＝客戶資料，由資料檔帶入（首次啟動寫入本機） */
let SEED = [];
let HA_PITCH = '';

/* ══════════════════════════════════════════════════════════
   節奏計算｜唯一來源
   官方訂單（DATA.orders，唯讀）＋ 補登（未歸檔者）合併後計算。
   任何頁面要用間隔／流速／建議日，都呼叫 cadence()，不得自行推算。
   ══════════════════════════════════════════════════════════ */
/* toISOString() 給的是 UTC 日期。台北快 8 小時，台北時間午夜到早上 8 點之間
   會被判成前一天，所有逾期天數與建議日都少一天——固定方向的偏差，比隨機誤差難察覺。
   （2026/09/19 修。） */
const TODAY_STR = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);

function cadence(grp, item, entries) {
  /* orders 新格式 [日期, 付費EA, 贈品EA]；舊格式 [日期, 總EA] 仍相容（贈品視為 0）。
     節奏一律用總量計算，付費／贈品只在顯示時拆開。 */
  const base = (((DATA[grp] || {}).orders || {})[item] || [])
    .map((r) => (r.length >= 3 ? [r[0], Number(r[1]) || 0, Number(r[2]) || 0] : [r[0], Number(r[1]) || 0, 0]));
  const extra = liveEntries(entries).filter((e) => e.grp === grp && e.item === item)
    .map((e) => [e.date, Number(e.paidEA) || 0, Number(e.giftEA) || 0]);
  const byDate = {};
  [...base, ...extra].forEach(([d, p, g]) => {
    if (!byDate[d]) byDate[d] = { p: 0, g: 0 };
    byDate[d].p += p; byDate[d].g += g;
  });
  const b = Object.entries(byDate).map(([d, v]) => [d, v.p + v.g, v.p, v.g])
    .filter((x) => x[1] > 0).sort((a, x) => (a[0] < x[0] ? -1 : 1));
  if (b.length === 0) return null;
  const added = extra.length > 0;
  const last = b[b.length - 1][0];
  const lastBatch = b[b.length - 1][1];
  const lastPaid = b[b.length - 1][2];
  const lastGift = b[b.length - 1][3];
  const avgBatch = b.reduce((a, x) => a + x[1], 0) / b.length;
  if (b.length < 2) {
    return { item, n: 1, ok: false, why: '僅 1 筆訂單，無法計算間隔', last, added, avgBatch, lastBatch, lastPaid, lastGift };
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
    item, n: b.length, ok, why, last, added, lastPaid, lastGift,
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
   官方口徑：官方 Offtake 同期間（1–8 月），已對帳，唯一可對外。
   即時口徑：官方 ＋ 補登，對比 2025 同日累計。2026 端為人工輸入，
             漏登只會少不會多，偏誤恆為低估，僅供內部方向判讀。
   ══════════════════════════════════════════════════════════ */
let CH = null;
const cum25 = (series, mmdd) => (series || []).reduce((a, [d, v]) => (d <= mmdd ? a + v : a), 0);
let CUT_MMDD = '';   // 同上，於 hydrate 時設定

/* 涵蓋度門檻與未補登客戶清單已於 2026/09/03 移除（SOP 裁定 16 修訂）。
   原設計是：補登涵蓋度 ≥80% 才輸出通路即時成長率，未達則留白並列出待補客戶。
   撤除原因不是門檻訂錯，而是前提不成立——補登只涵蓋經手的訂單，
   全通路加總永遠補不滿，該指標無論門檻怎麼調都無法成立。 */

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
  const cov = null, suppress = false;   // 即時成長率已撤除，見上方註解
  return {
    official: { s25: base25, s26: base26, gr: base25 ? base26 / base25 - 1 : null, asOf: CUTOFF },
    live: { s25: live25, s26: base26 + addAmt, gr: live25 ? (base26 + addAmt) / live25 - 1 : null, asOf, addAmt, n: mine.length },
    same, cov, suppress,
  };
}

/* ── 下單時間 ─────────────────────────────────────────────
   來源只有補登，官方 Offtake 沒有時間欄位，無法回溯。
   刻意不自動帶入當下時間——批次補登時會把「輸入時間」誤記成「下單時間」，
   而且看起來完全合理、不會被發現。 */
const HOURS_AM = [8, 9, 10, 11];
const HOURS_PM = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const hourLabel = (h) => (h == null ? '—' : h < 12 ? `上午 ${h} 點` : h === 12 ? '中午 12 點' : `下午 ${h - 12} 點`);
const MIN_HOUR_SAMPLES = 5;   // 樣本充足性原則：未滿門檻不給結論

function hourHabit(grp, entries) {
  const hs = (entries || []).filter((e) => e.grp === grp && e.hour != null).map((e) => e.hour);
  if (hs.length < MIN_HOUR_SAMPLES) return { n: hs.length, ok: false };
  const bins = {};
  hs.forEach((h) => { bins[h] = (bins[h] || 0) + 1; });
  const sorted = Object.entries(bins).map(([h, c]) => ({ h: +h, c })).sort((a, b) => b.c - a.c || a.h - b.h);
  const top = sorted[0];
  const am = hs.filter((h) => h < 12).length;
  return {
    n: hs.length, ok: true, bins: sorted, top,
    ampm: am > hs.length / 2 ? '上午' : (am < hs.length / 2 ? '下午' : '各半'),
    amRatio: am / hs.length,
    remind: Math.max(8, top.h - 1),
  };
}

/* 紀錄的版本時間：以最後修改為準，沒改過就用建立時間。
   匯入時據此自動判斷新舊，不再要求使用者手動勾選覆蓋——
   那是整個流程裡唯一「漏掉會白做且不會報錯」的環節。 */
const recTime = (r) => r && (r.updatedAt || r.createdAt || '');

function mergePlan(localArr, incomingArr) {
  const byId = {}; (localArr || []).forEach((r) => { byId[r.id] = r; });
  const add = [], update = [], keepLocal = [], same = [];
  (incomingArr || []).forEach((r) => {
    const cur = byId[r.id];
    if (!cur) { add.push(r); return; }
    const a = recTime(r), b = recTime(cur);
    if (a > b) update.push(r);
    else if (a < b) keepLocal.push({ incoming: r, local: cur });
    else same.push(r);
  });
  return { add, update, keepLocal, same };
}

const applyPlan = (localArr, plan) => {
  const upd = {}; plan.update.forEach((r) => { upd[r.id] = r; });
  return [...(localArr || []).map((r) => upd[r.id] || r), ...plan.add];
};

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
          排序不看金額：做一萬元的可能排第一，做二十萬的可能排第三。看的是「還救不救得回來」跟「有沒有時效」。
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

  const liveN = liveEntries(entries).filter((e) => !grp || e.grp === grp);
  const liveAmt = liveN.reduce((a, e) => a + e.paidEA * e.unit, 0);
  const lastD = liveN.length ? liveN.map((e) => e.date).sort().slice(-1)[0] : null;

  return (
    <div className="px-4 py-4" style={{ background: '#F1F5F6' }}>
      <Eyebrow>兩年同期比較 · 官方口徑（SOP 裁定第 16 條，v3.10 修訂）</Eyebrow>
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
            1/1–{y.official.asOf.slice(5)}，取自官方 Offtake。這是唯一的成長率數字。
          </div>
        </div>

        <div style={wrap}>
          {head('補登現況', '不算成長率', C.ink3)}
          <div style={{ marginTop: 7 }}>
            <Num size={22} weight={600} color={liveN.length ? C.ink : C.ink3}>{liveN.length}</Num>
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.ink2, marginLeft: 6 }}>筆</span>
            {liveN.length > 0 && <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink2, marginLeft: 10 }}>{nf(liveAmt)}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: C.ink2, lineHeight: 1.7, marginTop: 6 }}>
            {liveN.length === 0
              ? `官方資料只到 ${CUTOFF}。之後的訂單到「接單」補登，會即時修正排程與斷單判定。`
              : <>最新 <Num size={11}>{lastD}</Num>。補登只修正<b style={{ color: C.ink }}>排程、斷單判定與下單時段</b>，不併入成長率。</>}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: C.ink3, lineHeight: 1.7, marginTop: 10 }}>
        即時成長率已於 2026/09/03 撤除。補登只涵蓋經手的訂單，全通路加總永遠不完整，
        算出來的成長率恆為低估且無法校正——與其給一個要打折看的數字，不如不給。
        補登的價值在<b style={{ color: C.ink2 }}>逐條線</b>：補一筆就修正一條線，一筆就有一筆的用處。
      </div>
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
  /* 兩年皆 0 的品項線原本整列不顯示，導致該線的補登無處可掛——補登存進去了、
     總額也算進去了，客戶卡上卻完全看不到，而且不會有任何錯誤訊息。
     這種情況偏偏最值得注意（掛零線突然來單＝側源不穩或新導入），故一併列出。
     （2026/09/15 修，原為 x.s25 || x.s26。） */
  const live = d.items.filter((x) => x.s25 || x.s26 || addBy[x.item]);
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
                    <b>{it} 已有補登</b>：{cutLabel()} 後 +{addBy[it].paid} EA{addBy[it].gift ? `（另贈 ${addBy[it].gift}）` : ''}。這條議題的前提可能已改變，進門前先確認。
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
              {['品項', '2025', '2026', 'EA 25→26', mine.length ? `${cutLabel()}後補登` : '狀態'].map((h, i) => (
                <div key={h} style={{ flex: i === 0 ? 1.5 : 1, textAlign: i > 0 && i < 3 ? 'right' : 'left' }}><Eyebrow>{h}</Eyebrow></div>
              ))}
            </div>
            {live.map((x) => (
              <div key={x.item} className="flex px-3 py-2 items-center" style={{ borderBottom: `1px solid ${C.hair}` }}>
                <div style={{ flex: 1.5 }}>
                  <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: C.ink }}>{x.item}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: x.p === 'P1' ? C.teal : C.ink3, marginLeft: 5 }}>{x.p}</span>
                  {!x.s25 && !x.s26 && addBy[x.item] && (
                    <span style={{ fontFamily: MONO, fontSize: 9, color: C.green, border: `1px solid ${C.green}`, padding: '0 4px', marginLeft: 5 }}>首見</span>
                  )}
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
              <Eyebrow>體系內部拆解 · 1–8 月同期 · 防止合併數字掩蓋反向變化</Eyebrow>
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

        <div>
          <SecHead n="D2" t="下單時間習慣" />
          {(() => {
            const hh = hourHabit(grp, entries);
            if (!hh.ok) return (
              <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '12px 14px', fontSize: 12.5, color: C.ink2, lineHeight: 1.8 }}>
                已累積 <b style={{ color: C.ink }}>{hh.n}</b> 筆有時間的補登，滿 {MIN_HOUR_SAMPLES} 筆後才開始分析。
                官方 Offtake 沒有時間欄位，這項只能從補登往前累積，無法回溯。
              </div>
            );
            const max = Math.max(...hh.bins.map((b) => b.c));
            return (
              <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '12px 14px' }}>
                <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.8 }}>
                  {hh.n} 筆樣本中，最常下單在 <b>{hourLabel(hh.top.h)}</b>（{hh.top.c} 次），
                  整體偏<b>{hh.ampm}</b>（上午佔 {sf(hh.amRatio)}）。
                </div>
                <div className="flex items-end" style={{ gap: 4, marginTop: 10, height: 46 }}>
                  {[...HOURS_AM, ...HOURS_PM].map((h) => {
                    const c = (hh.bins.find((b) => b.h === h) || {}).c || 0;
                    return (
                      <div key={h} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ height: c ? Math.max(4, (c / max) * 34) : 1,
                          background: c ? (h === hh.top.h ? C.teal : C.rule) : C.hair }} />
                        <div style={{ fontFamily: MONO, fontSize: 8.5, color: C.ink3, marginTop: 3 }}>{h > 12 ? h - 12 : h}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12.5, color: C.teal, fontWeight: 600, marginTop: 9 }}>
                  建議提醒時機：{hourLabel(hh.remind)} 前後
                </div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4, lineHeight: 1.6 }}>
                  抓在習慣下單時間前一小時聯繫，對方正要處理採購，接受度最高。
                </div>
              </div>
            );
          })()}
        </div>

        {p.intel.length > 0 && (
        <div>
          <SecHead n="E" t="這趟要帶回來的情報" />
          <div style={{ background: C.amberBg, border: `1px solid #E8D9B8`, padding: '11px 14px' }}>
            {p.intel.map((x, i) => <div key={i} style={{ fontSize: 13, color: '#4A3608', marginTop: i ? 7 : 0, lineHeight: 1.75 }}>· {x}</div>)}
            <div style={{ fontSize: 11.5, color: '#7A5C1A', marginTop: 10, lineHeight: 1.6, borderTop: `1px solid #E8D9B8`, paddingTop: 8 }}>
              SOP 裡的每一條客戶特註，都是從這一欄長出來的——側源、異規格貨源、轉折時間點，全部來自現場回報。
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
  const [openId, setOpenId] = useState(null);      // 展開閱讀的紀錄 id（唯讀，不進編輯表單）
  const [histGrp, setHistGrp] = useState('全部');   // 拜訪歷程的客戶篩選
  const all = log.flatMap((v) => v.topics);
  const scored = all.map((t) => ({ ...t, sc: scoreOf(t.kind || '拿單', t.result) })).filter((t) => t.sc !== null);
  const ordL = scored.filter((t) => (t.kind || '拿單') !== '查證');
  const intL = scored.filter((t) => (t.kind || '拿單') === '查證');
  const HIT_MIN = 5;   // 樣本充足性原則：未達門檻不輸出百分比（SOP v3.9 實例表）
  const pct = (arr) => (arr.length >= HIT_MIN ? `${Math.round((arr.reduce((a, b) => a + b.sc, 0) / arr.length) * 100)}%` : `${arr.length}/${HIT_MIN}`);
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
    }).map((c) => {
      const gap = Math.round((new Date(today) - new Date(c.last)) / 86400000);
      return { grp: d.grp, item: c.item, avg: c.avg_int, gap, ratio: c.avg_int ? gap / c.avg_int : 0 };
    })
  );
  /* 依「倍數」排序，不是逾期天數——天數沒有除掉各店本來的訂貨頻率。
     兩個多月訂一次的店逾 131 天只是剛過兩輪；半個月訂一次的店逾 60 天
     等於跳過三次半，後者才是真的不對勁。 */
  const allWarns = rawWarns.filter((w) => !exempt(w.grp, w.item))
    .sort((a, b) => b.ratio - a.ratio);
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
          {(ordL.length < HIT_MIN || intL.length < HIT_MIN) && (
            <div style={{ marginTop: 6 }}>
              命中率須累積 <b style={{ color: C.ink }}>{HIT_MIN} 題</b>才計算。未達門檻時顯示「已累積/門檻」而非百分比——
              三題就報一個百分比是假的，寧可留白。
            </div>
          )}
        </div>
      )}

      <div>
        <SecHead n="1" t="預測驗證：下期回來對答案" />
        <div style={{ background: C.surf, border: `1px solid ${C.hair}` }}>
          {allWarns.map((w, i) => (
            <div key={i} className="flex justify-between items-baseline px-4 py-2" style={{ borderBottom: `1px solid ${C.hair}` }}>
              <span style={{ fontSize: 13, color: C.ink }}>{w.grp}　<span style={{ color: C.ink2 }}>{w.item}</span></span>
              <span><Num size={11} color={C.ink3}>平均 {w.avg} 天</Num><span style={{ color: C.ink3, margin: '0 6px' }}>·</span><Num size={12} color={C.amber}>{w.gap} 天未訂</Num><span style={{ color: C.ink3, margin: '0 6px' }}>·</span><Num size={12.5} color={C.red} weight={600}>{w.ratio.toFixed(2)} 倍</Num></span>
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
          <SecHead n="3" t={`拜訪歷程 ${log.length} 筆 · 點卡片展開閱讀`} />
          {(() => {
            const grps = ['全部', ...Array.from(new Set(log.map((v) => v.grp)))];
            return grps.length > 2 ? (
              <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 10 }}>
                {grps.map((g) => (
                  <button key={g} onClick={() => { setHistGrp(g); setOpenId(null); }}
                    style={{ fontFamily: SANS, fontSize: 12, padding: '5px 11px', background: histGrp === g ? C.teal : C.surf,
                      color: histGrp === g ? '#fff' : C.ink2, border: `1px solid ${histGrp === g ? C.teal : C.rule}` }}>
                    {g}{g !== '全部' && ` ${log.filter((v) => v.grp === g).length}`}
                  </button>
                ))}
              </div>
            ) : null;
          })()}
          <div style={{ display: 'grid', gap: 8 }}>
            {[...log].filter((v) => histGrp === '全部' || v.grp === histGrp)
              .sort((a, b) => (a.date < b.date ? 1 : -1)).map((v) => (
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

                {openId === v.id && (
                  <div style={{ borderTop: `1px solid ${C.hair}`, marginTop: 10, paddingTop: 10, display: 'grid', gap: 12 }}>
                    {v.topics.map((t, i) => (
                      <div key={i}>
                        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: RES_C[t.result], border: `1px solid ${RES_C[t.result]}`, padding: '1px 5px', marginRight: 7 }}>
                            {(t.kind || '拿單') === '查證' ? '查' : '單'}·{t.result}
                          </span>
                          {t.title}
                        </div>
                        {t.note && t.note.trim()
                          ? <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.85, marginTop: 5, whiteSpace: 'pre-wrap' }}>{t.note.trim()}</div>
                          : <div style={{ fontSize: 12, color: C.ink3, marginTop: 5 }}>（沒有留下備註）</div>}
                      </div>
                    ))}
                    {v.intel && v.intel.trim() && (
                      <div style={{ background: C.bg, border: `1px solid ${C.hair}`, padding: '10px 12px' }}>
                        <Eyebrow>新情報</Eyebrow>
                        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.85, marginTop: 5, whiteSpace: 'pre-wrap' }}>{v.intel.trim()}</div>
                      </div>
                    )}
                    {v.source && <Num size={10} color={C.ink3}>來源：{v.source}</Num>}
                  </div>
                )}

                <div className="flex items-center" style={{ gap: 14, marginTop: 9 }}>
                  <button onClick={() => setOpenId(openId === v.id ? null : v.id)}
                    style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: openId === v.id ? C.ink2 : C.teal,
                      border: `1px solid ${C.rule}`, padding: '5px 12px', background: C.surf }}>
                    {openId === v.id ? '收合' : '展開閱讀'}
                  </button>
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

/* 排程方塊：標題放「建議拜訪日」（排行程用），方塊放「末單日」（進門講話用）。
   兩者是不同的天數——建議日逾期 38 天，可能實際已 80 天沒下單，別混為一談。 */
function lastInfo(x) {
  const gapDays = Math.round((new Date(TODAY_STR()) - new Date(x.last)) / 86400000);
  const paid = x.lastPaid != null ? x.lastPaid : x.last_batch;
  const gift = x.lastGift || 0;
  const qty = `${paid}${gift ? `+${gift}` : ''}`;
  const avg = x.avg_batch != null ? x.avg_batch : null;
  return { gapDays, qty, avg };
}

function LineChip({ x, dim }) {
  const { gapDays, qty, avg } = lastInfo(x);
  return (
    <span style={{ fontFamily: SANS, fontSize: 12, color: dim ? C.ink3 : C.ink,
      border: `1px ${dim ? 'dashed' : 'solid'} ${C.rule}`, background: dim ? 'transparent' : '#F4F8F9', padding: '3px 8px' }}>
      {x.item}
      <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, marginLeft: 5 }}>
        末單 {String(x.last).slice(5)} · 距今 {gapDays} 天 · {qty} EA{avg ? `（平均每批 ${avg}）` : ''}
      </span>
    </span>
  );
}

function StoreCard({ st, days, fire, compact }) {
  const [open, setOpen] = useState(false);
  const od = days(st.date);
  const full = st.rate === 1;
  const detail = !compact || open;
  return (
    <div style={{ background: C.surf, border: `1px solid ${fire ? C.amber : (full ? C.rule : C.hair)}`, padding: '12px 14px' }}>
      <div className="flex items-baseline flex-wrap" style={{ gap: 9 }}>
        <span style={{ fontFamily: SANS, fontSize: 16, fontWeight: 900, color: C.ink }}>{st.grp}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: full ? C.green : C.ink2 }}>
          一趟收 {st.hit.length}／{st.lines.length} 條
        </span>
        {fire && (
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', background: C.amber, padding: '2px 6px' }}>
            {st.warns.length} 條警訊 · 最高 {st.maxr.toFixed(2)} 倍
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <Num size={10.5} color={C.ink3}>建議 </Num>
          <Num size={13} color={od > 0 ? C.red : C.ink} weight={600}>{st.date}</Num>
          <Num size={10.5} color={C.ink3}>{od > 0 ? `　逾 ${od} 天` : `　還有 ${-od} 天`}</Num>
        </span>
      </div>
      {fire && (
        <div style={{ marginTop: 8, background: C.amberBg, border: `1px solid ${C.amber}`, padding: '8px 10px' }}>
          {st.warns.map((w) => (
            <div key={w.item} style={{ marginBottom: 4 }}>
              {/* 品項與倍數同一行（窄螢幕也不拆開），細節縮到次行 */}
              <div className="flex items-baseline" style={{ gap: 8 }}>
                <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: C.ink }}>{w.item}</span>
                <span style={{ marginLeft: 'auto' }}>
                  <Num size={13} color={C.red} weight={600}>{w.wr.toFixed(2)} 倍</Num>
                </span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.ink2, marginTop: 1 }}>
                末單 {String(w.last).slice(5)} · 訂單平均相隔 {w.avg_int} 天
              </div>
            </div>
          ))}
        </div>
      )}
      {compact && (
        <button onClick={() => setOpen(!open)}
          style={{ fontFamily: SANS, fontSize: 12, color: C.teal, background: 'none', border: 'none', padding: '7px 0 0', display: 'block' }}>
          {open ? '收合明細' : `展開 ${st.lines.length} 條線的末單與批量`}
        </button>
      )}
      {detail && (
      <div className="flex flex-wrap" style={{ gap: 5, marginTop: 9 }}>
        {st.hit.map((x) => <LineChip key={x.item} x={x} />)}
      </div>
      )}
      {detail && st.miss.length > 0 && (
        <div style={{ marginTop: 9, borderTop: `1px dashed ${C.rule}`, paddingTop: 8 }}>
          <div style={{ fontSize: 11.5, color: C.amber, fontWeight: 600 }}>另 {st.miss.length} 條這天還沒熟，不要硬談，要分次去</div>
          <div className="flex flex-wrap" style={{ gap: 5, marginTop: 6 }}>
            {st.miss.map((x) => <LineChip key={x.item} x={x} dim />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Schedule({ entries }) {
  const [help, setHelp] = useState(false);
  const [effMore, setEffMore] = useState(false);
  const [lineList, setLineList] = useState(false);
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
  /* 只有「建議日已過」的線才進排程。原本把未到期的線也算進「一趟收 N 條」，
     使訂得越勤的客戶 rate 越高、排名越前——而訂得勤通常代表這家沒問題。
     結果是健康的大客戶被排在前面，出事的客戶被擠到後面。
     （案例：某客戶八條線倍數全低於 1.2、其中兩條倍數 0.03–0.05 是前一天才下的單，
     卻顯示成「一趟收 6／8 條」的效率之星。2026/09/19 修。） */
  const byStore = {};
  rows.filter((r) => r.d_int <= TODAY_STR()).forEach((r) => { (byStore[r.grp] = byStore[r.grp] || []).push(r); });
  const stores = Object.entries(byStore).map(([grp, lines]) => {
    let best = null;
    lines.forEach((c) => {
      const hit = lines.filter((x) => Math.abs((new Date(x.d_int) - new Date(c.d_int)) / 86400000) <= WIN);
      if (!best || hit.length > best.hit.length || (hit.length === best.hit.length && c.d_int < best.date)) {
        best = { date: c.d_int, hit };
      }
    });
    const miss = lines.filter((x) => !best.hit.includes(x)).sort((a, b) => (a.d_int < b.d_int ? -1 : 1));
    const warns = lines.filter((x) => {
      const gap = (new Date(TODAY_STR()) - new Date(x.last)) / 86400000;
      return x.avg_int && gap / x.avg_int >= 2;
    }).map((x) => ({ ...x, wr: ((new Date(TODAY_STR()) - new Date(x.last)) / 86400000) / x.avg_int }))
      .sort((a, b) => b.wr - a.wr);
    return { grp, lines, date: best.date, hit: best.hit, miss, rate: best.hit.length / lines.length,
             warns, maxr: warns.length ? warns[0].wr : 0 };
  });
  /* 兩區分開排，不混成單一公式——滅火與效率是兩種目的，讓使用者自己決定這週做哪件。 */
  const fireStores = stores.filter((s2) => s2.warns.length)
    .sort((a, b) => (b.warns.length - a.warns.length) || (b.maxr - a.maxr));
  const effStores = stores.filter((s2) => !s2.warns.length)
    .sort((a, b) => (b.rate - a.rate) || (a.date < b.date ? -1 : 1));
  weak.sort((a, b) => (a.grp < b.grp ? -1 : 1));
  const days = (s) => Math.round((TODAY - new Date(s)) / 86400000);

  return (
    <div className="p-4">
      <Eyebrow>Cadence · 於估算庫存見底前一週拜訪</Eyebrow>
      <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 6 }}>拜訪節奏</h2>

      <button onClick={() => setHelp(!help)}
        style={{ width: '100%', textAlign: 'left', background: C.surf, border: `1px solid ${C.hair}`,
          padding: '10px 15px', marginTop: 12, fontFamily: SANS, fontSize: 12.5, color: C.teal }}>
        {help ? '▾ 收起說明' : '▸ 算法與欄位說明（數字的單位、清單怎麼排的）'}
      </button>

      {help && (
      <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '13px 15px', marginTop: 9 }}>
        <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.85 }}>
          兩種算法並列。<b style={{ color: C.ink }}>間隔法</b>取這條線的訂單平均相隔天數，穩但看不見批量變化；
          <b style={{ color: C.ink }}>消化法</b>再乘上「這批 ÷ 平均每批」的倍數，會反映對方這次是進多了還是進少了。
        </div>
        <Rule my={11} />
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink, lineHeight: 1.9 }}>
          間隔法 = 最後訂單日 + 訂單平均相隔 − 7<br />
          消化法 = 最後訂單日 + 訂單平均相隔 × (本批量 ÷ 平均每批) − 7
        </div>
        <Rule my={11} />
        <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.8 }}>
          月均流速改由「平均每批 ÷ 訂單平均相隔」推算，不用「總 EA ÷ 7 個月」——後者對年中才開始或中途停掉的線會嚴重低估流速，
          把消化時間灌成一兩百天。曾有一條線因此被誤判成「剛進大批」，改算法後回到穩定。
        </div>
      </div>

      )}
      {help && (
      <>
      {/* 欄位說明：每個數字的單位與意義。放在算法說明與清單之間，
          免得隔幾週回來看不記得「80天」「35+5」「平均 62.5」各是什麼。 */}
      <div style={{ marginTop: 18, background: C.surf, border: `1px solid ${C.rule}`, padding: '13px 15px' }}>
        <Eyebrow>欄位說明 · 下面每個數字代表什麼</Eyebrow>

        <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: C.ink }}>卡片右上</div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.95, marginTop: 4 }}>
          <b style={{ color: C.ink }}>建議 2026-08-12</b>　該店最早到期那條線的建議拜訪日（間隔法算的）。<br />
          <b style={{ color: C.ink }}>逾 38 天</b>　距離那個<u>建議日</u>過了幾天。
          <span style={{ color: C.amber }}>注意：這不是距離上次下單幾天</span>，那個在方塊裡（「距今 N 天」）。<br />
          <span style={{ color: C.ink3 }}>
            右上角的日期取的是「<b style={{ color: C.ink2 }}>一趟能收最多線</b>」的那天，
            所以它<b style={{ color: C.ink2 }}>未必</b>是警訊那條線的建議日——大多數情況會是同一條，
            但當某條沒有警訊的線能多收一條時，就會改取那天。
            <b style={{ color: C.ink2 }}>右上角回答「哪天去最划算」，琥珀色警訊框回答「去了要處理哪幾條」</b>，兩者各看各的。
          </span>
        </div>

        <div style={{ marginTop: 11, fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: C.ink }}>卡片左上</div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.95, marginTop: 4 }}>
          <b style={{ color: C.ink }}>一趟收 3／5 條</b>　這家共 5 條線到期，其中 3 條落在同一個 ±14 天窗口，
          一趟拜訪談得完；剩下 2 條那天還沒熟，硬談會變成推銷。
        </div>

        <div style={{ marginTop: 11, fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: C.ink }}>品項方塊</div>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink, background: C.bg, border: `1px solid ${C.hair}`, padding: '7px 9px', marginTop: 5 }}>
          Ultra MD　末單 07-01 · 距今 80 天 · 35+5 EA（平均每批 62.5）
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.95, marginTop: 6 }}>
          <b style={{ color: C.ink }}>末單 07-01</b>　這條線最後一次下單的日期（月-日）。<br />
          <b style={{ color: C.ink }}>距今 80 天</b>　從末單那天到今天過了幾天。<u>進門講話用這個</u>，客戶聽得懂。<br />
          <span style={{ color: C.ink3 }}>
            三個容易混的詞：<b style={{ color: C.ink2 }}>距今 N 天</b>＝實際已經過了幾天；
            <b style={{ color: C.ink2 }}>訂單平均相隔</b>＝這條線常態上多久訂一次（兩者都是天，一個是事實、一個是基準，
            相除就是<b>倍數</b>）；<b style={{ color: C.ink2 }}>平均每批</b>＝每次訂多少<b>支／盒</b>，單位不同。
          </span><br />
          <b style={{ color: C.ink }}>35+5 EA</b>　末單的數量：<b style={{ color: C.ink }}>35 支付費</b>
          ＋<b style={{ color: C.ink }}>5 支贈品</b>。沒有搭贈就只寫一個數字。<br />
          <b style={{ color: C.ink }}>（平均每批 62.5）</b>　這條線歷次訂單的平均每次數量，單位是 EA（含贈品），<u>不是天數</u>。<br />
          <span style={{ color: C.ink3 }}>
            拿末單量對平均看：<b style={{ color: C.ink2 }}>明顯少於平均</b>＝這次只訂半批，可能在試水溫或分單，可提早去；
            <b style={{ color: C.ink2 }}>明顯多於平均</b>＝剛吃下大批貨，別急著推，先盯去化。
          </span>
        </div>

        <div style={{ marginTop: 11, borderTop: `1px solid ${C.hair}`, paddingTop: 9 }}>
          <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: C.ink }}>清單怎麼排的</div>
          <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.95, marginTop: 4 }}>
            分兩區，不混在一起排——<b style={{ color: C.ink }}>滅火</b>和<b style={{ color: C.ink }}>效率</b>是兩種目的，
            這週要做哪件由你決定。<br />
            <b style={{ color: C.ink }}>① 先滅火</b>（有斷單警訊的店）：依<b style={{ color: C.ink }}>警訊條數</b>多的優先，
            同條數再比<b style={{ color: C.ink }}>最高倍數</b>。所以「2 條 3.48 倍」會排在「1 條 3.76 倍」前面——
            同一家有多條線同時斷，問題通常比單線更深。<br />
            <b style={{ color: C.ink }}>② 效率排程</b>（無警訊的店）：依<b style={{ color: C.ink }}>一趟收得完的比率</b>高的優先，
            比率相同再比建議日早的。<br />
            <b style={{ color: C.ink }}>倍數</b>＝距末單天數 ÷ 該線訂單平均相隔。達 <b style={{ color: C.ink }}>2 倍</b>即列為斷單警訊。
            用倍數不用天數，因為天數沒有除掉各店本來的訂貨頻率：兩個月訂一次的店逾 131 天只是剛過兩輪，
            半個月訂一次的店逾 60 天等於跳過三次半。
          </div>
        </div>

        <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.85, marginTop: 11, borderTop: `1px solid ${C.hair}`, paddingTop: 9 }}>
          <b>只列建議日已過的線。</b>還沒到期的不算進「一趟收 N 條」——否則訂得越勤的客戶比率越高、排名越前，
          而訂得勤通常代表這家沒問題，反而把出事的客戶擠到後面。<br />
          EA ＝ 支／盒數（來源報表的數量單位），不是金額。
          所有天數都已納入「接單」頁的補登，不只官方 Offtake。
        </div>
      </div>

      </>
      )}

      {/* 摘要列：不捲動就知道全局 */}
      {/* sticky：手機捲到中段仍看得到全局，不必捲回頂部確認 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, marginTop: 14, background: C.ink, padding: '11px 14px' }}>
        <div className="flex items-baseline flex-wrap" style={{ gap: 14 }}>
          <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
            滅火 {fireStores.length} 家
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#C9D6DB', marginLeft: 5 }}>
              {fireStores.reduce((a, x) => a + x.warns.length, 0)} 條線
            </span>
          </span>
          <span style={{ fontFamily: SANS, fontSize: 13.5, color: '#C9D6DB' }}>效率 {effStores.length} 家</span>
          {fireStores.length > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11.5, color: C.amber }}>
              最急 {fireStores[0].grp} · {fireStores[0].warns.length} 條 · {fireStores[0].maxr.toFixed(2)} 倍
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <SecHead n="1" t={`先滅火 · 有斷單警訊 ${fireStores.length} 家`} />
        <div style={{ display: 'grid', gap: 9 }}>
          {fireStores.length === 0 && (
            <div style={{ background: C.surf, border: `1px solid ${C.hair}`, padding: '13px 15px', fontSize: 13, color: C.ink2 }}>
              目前沒有任何線達到斷單門檻（逾期達平均間隔 2 倍）。
            </div>
          )}
          {fireStores.map((st) => (
            <StoreCard key={st.grp} st={st} days={days} fire />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SecHead n="2" t={`效率排程 · 無警訊 ${effStores.length} 家`} />
        <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.75, marginBottom: 8 }}>
          這些店沒有任何線達到斷單門檻（倍數未達 2），但<b style={{ color: C.ink2 }}>建議日已過就代表估計庫存已經見底</b>——
          去了是補單，也是止血。明細預設收起，點開才看。
        </div>
        <div style={{ display: 'grid', gap: 9 }}>
          {(effMore ? effStores : effStores.slice(0, 5)).map((st) => (
            <StoreCard key={st.grp} st={st} days={days} compact />
          ))}
        </div>
        {effStores.length > 5 && (
          <button onClick={() => setEffMore(!effMore)}
            style={{ width: '100%', marginTop: 9, background: C.surf, border: `1px solid ${C.rule}`,
              padding: '10px', fontFamily: SANS, fontSize: 12.5, color: C.teal }}>
            {effMore ? '收起' : `還有 ${effStores.length - 5} 家`}
          </button>
        )}
      </div>

      <div style={{ display: 'none' }}>
        <div style={{ display: 'grid', gap: 9 }}>
          {[].map((st) => {
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
                    <Num size={10.5} color={C.ink3}>建議 </Num>
                    <Num size={13} color={od > 0 ? C.red : C.ink} weight={600}>{st.date}</Num>
                    <Num size={10.5} color={C.ink3}>{od > 0 ? `　逾 ${od} 天` : `　還有 ${-od} 天`}</Num>
                  </span>
                </div>
                <div className="flex flex-wrap" style={{ gap: 5, marginTop: 9 }}>
                  {st.hit.map((x) => <LineChip key={x.item} x={x} />)}
                </div>
                {st.miss.length > 0 && (
                  <div style={{ marginTop: 9, borderTop: `1px dashed ${C.rule}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 11.5, color: C.amber, fontWeight: 600 }}>另 {st.miss.length} 條這天還沒熟，不要硬談，要分次去</div>
                    <div className="flex flex-wrap" style={{ gap: 5, marginTop: 6 }}>
                      {st.miss.map((x) => <LineChip key={x.item} x={x} dim />)}
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
        <SecHead n="3" t={`單條線排程 ${rows.length} 條`} />
        <button onClick={() => setLineList(!lineList)}
          style={{ width: '100%', textAlign: 'left', background: C.surf, border: `1px solid ${C.hair}`,
            padding: '10px 14px', fontFamily: SANS, fontSize: 12.5, color: C.teal }}>
          {lineList ? '▾ 收起逐條清單' : `▸ 展開 ${rows.length} 條線（含消化法日期與兩法差距）`}
        </button>
        <div style={{ fontSize: 11.5, color: C.ink3, lineHeight: 1.75, marginTop: 6 }}>
          上面兩區已按店聚合。這一區是按「線」攤平，多了<b>消化法日期</b>與<b>兩法差距</b>——
          想知道某條線是不是剛進大批、該不該延後去，才需要點開。
        </div>
        {lineList && (
        <div style={{ background: C.surf, border: `1px solid ${C.hair}`, marginTop: 9 }}>
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
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <SecHead n="4" t={`樣本不足 ${weak.length} 條 · 不給日期`} />
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
        倉庫型客戶整組排除，進貨為多點配發，節奏與單店消化無關。
      </div>
    </div>
  );
}


/* ── 畫面六：資料保存 ─────────────────────────────────── */
function DataScreen({ log, onReplace, backups, onRestore, entries, onExported }) {
  const lastExp = rawGet(KEY.exp);
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
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
    try { rawSet(KEY.exp, new Date().toISOString()); } catch {}
    onExported();
    setMsg('已下載備份檔');
  };

  const check = () => {
    try {
      const inc = migrate(JSON.parse(paste));
      if (!inc || !Array.isArray(inc.visits)) throw new Error('找不到 visits 陣列');
      setPreview({
        v: mergePlan(log, inc.visits),
        e: mergePlan(entries, inc.entries),
        srcExportedAt: (inc.exportedAt || '').slice(0, 16).replace('T', ' '),
        srcVersion: inc.appVersion,
      });
      setMsg('');
    } catch (e) { setPreview(null); setMsg(`這段內容讀不出來：${e.message}`); }
  };

  return (
    <div className="p-4" style={{ display: 'grid', gap: 18 }}>
      <div>
        <Eyebrow>Data · 資料是你的，隨時帶得走</Eyebrow>
        <h2 style={{ fontFamily: SANS, fontSize: 24, fontWeight: 900, color: C.ink, marginTop: 6 }}>資料保存</h2>
      </div>

      <div style={{ background: C.amberBg, border: `2px solid ${C.amber}`, padding: '13px 16px' }}>
        <Eyebrow color={C.amber}>置頂 · 以手機為主力，網頁版只當備援</Eyebrow>
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.85, marginTop: 6 }}>
          拜訪當下的紀錄與接單補登，<b>一律在手機上輸入</b>。網頁版只在要匯出、或大量整理時打開，
          <b>用完就別再輸入</b>。
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, marginTop: 7 }}>
          匯入是<b style={{ color: C.ink }}>單向搬移，不是同步</b>：搬完之後兩邊各成一份獨立副本，
          手機新增的網頁版看不到、反之亦然。兩邊都改過同一筆時會跳分歧警告，屆時只能靠你記得哪一邊才是對的。
          固定一個入口寫、另一邊只讀，就不會遇到這個問題。
        </div>
      </div>

      <div>
        <Eyebrow>資料檔 · 分析數字與客戶劇本</Eyebrow>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.8, margin: '6px 0 8px' }}>
          目前：<b style={{ color: C.ink }}>{DATASET || '未匯入'}</b>
          {CUTOFF && <>｜官方截止 <Num size={11}>{CUTOFF}</Num></>}
          ｜客戶群 <Num size={11}>{GROUP_LIST.length}</Num>
        </div>
        <ImportGate compact onDone={() => { try { location.reload(); } catch {} }} />
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
          <br />這組碼是<b style={{ color: C.ink }}>隨機產生的空間標記，不是資料的編碼</b>——匯入只搬拜訪紀錄與補登，
          刻意不搬這組碼。兩台裝置匯入完內容一樣、碼仍不同，屬<b style={{ color: C.ink }}>正常</b>；
          若連碼都一起搬，畫面會顯示相同卻其實各存各的，那才會誤導。
        </div>
      </div>

      <div className="flex flex-wrap" style={{ gap: 22, background: C.surf, border: `1px solid ${C.hair}`, padding: '14px 16px' }}>
        {[['拜訪紀錄', `${log.length} 筆`], ['接單補登', `${(entries || []).length} 筆`], ['資料格式', `schema v${SCHEMA}`], ['分析資料期間', DATASET],
          ['程式版本', `v${APP_VERSION}`], ['建置時間', BUILD_AT], ['自動快照', `${backups.length} 份`],
          ['距上次快照', sinceBackup === null ? '—' : `${sinceBackup} 天`],
          ['上次匯入', lastImp ? lastImp.at : '從未'],
          ['距上次備份', lastExp ? `${Math.floor((Date.now() - new Date(lastExp)) / 86400000)} 天` : '從未備份']].map(([k, v]) => (
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
          <button onClick={() => { navigator.clipboard?.writeText(json); try { rawSet(KEY.exp, new Date().toISOString()); } catch {} onExported(); setMsg('已複製到剪貼簿'); }}
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
        {preview && (() => {
          const { v, e } = preview;
          const diverge = [...v.keepLocal, ...e.keepLocal];
          const nAdd = v.add.length + e.add.length;
          const nUpd = v.update.length + e.update.length;
          return (
            <div style={{ background: C.tealBg, border: `1px solid #CDE2E8`, padding: '12px 14px', marginTop: 10 }}>
              <div style={{ fontSize: 13.5, color: '#0A4A5A', lineHeight: 1.85 }}>
                來源檔匯出於 <b>{preview.srcExportedAt || '未標示'}</b>（v{preview.srcVersion || '?'}）。
                <br />拜訪紀錄：新增 <b>{v.add.length}</b>、更新 <b>{v.update.length}</b>、本機較新保留 <b>{v.keepLocal.length}</b>、相同 {v.same.length}。
                <br />接單補登：新增 <b>{e.add.length}</b>、更新 <b>{e.update.length}</b>、本機較新保留 <b>{e.keepLocal.length}</b>、相同 {e.same.length}。
              </div>
              <div style={{ fontSize: 11.5, color: C.ink2, lineHeight: 1.7, marginTop: 7 }}>
                依每筆紀錄的最後修改時間自動判斷新舊，不需要你手動選擇。
              </div>

              {diverge.length > 0 && (
                <div style={{ background: C.redBg, border: `1px solid ${C.redRule}`, padding: '11px 13px', marginTop: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: C.red }}>兩邊都改過：{diverge.length} 筆</div>
                  <div style={{ fontSize: 12.5, color: '#4A1E1A', lineHeight: 1.8, marginTop: 5 }}>
                    以下紀錄本機的版本比來源檔新，合併後<b>會保留本機版本</b>，來源那邊的修改不會進來。
                    若來源那邊的才是你要的，請先把本機資料匯到那台、在那邊合併完再匯回來。
                  </div>
                  {diverge.slice(0, 6).map((x, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.ink2, marginTop: 6, borderLeft: `2px solid ${C.redRule}`, paddingLeft: 8, lineHeight: 1.6 }}>
                      {x.local.grp}{x.local.item ? ` ${x.local.item}` : ''}{x.local.date ? `｜${x.local.date}` : ''}
                      <br /><span style={{ fontFamily: MONO, fontSize: 10.5, color: C.ink3 }}>
                        本機 {recTime(x.local).slice(0, 16).replace('T', ' ')} ／ 來源 {recTime(x.incoming).slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(nAdd + nUpd) > 0 ? (
                <button onClick={() => {
                    onReplace(applyPlan(log, v), applyPlan(entries, e));
                    const rec = { at: new Date().toISOString().slice(0, 16).replace('T', ' '),
                                  from: preview.srcExportedAt || '未標示', v: preview.srcVersion || '?' };
                    try { rawSet(KEY.imp, rec); } catch {}
                    setLastImp(rec); setPreview(null); setPaste('');
                    setMsg(`已合併：新增 ${nAdd} 筆、更新 ${nUpd} 筆`);
                  }}
                  style={{ background: C.green, color: '#fff', fontFamily: SANS, fontSize: 14, fontWeight: 700, padding: '10px 18px', marginTop: 10 }}>
                  確認合併
                </button>
              ) : (
                <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 10 }}>沒有需要新增或更新的紀錄，兩邊已經一致。</div>
              )}
            </div>
          );
        })()}
      </div>

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
          App 會在每次回到前景時自動檢查新版本，有更新會在頂端跳出橫幅。
          若想立即確認，按下面的按鈕；真的卡住就把 App 從多工卡片滑掉再重開。
        </div>
        <button onClick={() => {
            const u = window.location.pathname + '?v=' + Date.now();
            window.location.replace(u);
          }}
          style={{ background: C.surf, border: `1px solid ${C.rule}`, color: C.teal, fontFamily: SANS, fontSize: 13.5, fontWeight: 700, padding: '10px 18px', marginTop: 9 }}>
          強制重新載入最新版
        </button>
        <div style={{ fontSize: 11.5, color: C.ink3, lineHeight: 1.7, marginTop: 8 }}>
          重新載入不會影響你的拜訪紀錄與補登——那些存在瀏覽器，跟程式碼分開。
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
  const [hour, setHour] = useState(null);

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
  const reset = () => { setLines([{ item: 'Ultra MD', paid: '', gift: '' }]); setNote(''); setEditId(null); setHour(null); };

  const save = () => {
    if (!valid) { setMsg('至少要有一個品項填了數量'); return; }
    if (date <= CUTOFF) { setMsg(`日期必須晚於官方資料截止日 ${CUTOFF}，否則會與官方資料重複計算`); return; }
    const now = new Date().toISOString();
    const keep = lines.filter((l) => (Number(l.paid) || 0) > 0 || (Number(l.gift) || 0) > 0);
    if (editId) {
      const l = keep[0];
      onSave((entries || []).map((e) => (e.id === editId
        ? { ...e, grp, date, hour, item: l.item, paidEA: Number(l.paid) || 0, giftEA: Number(l.gift) || 0, unit: UNIT[l.item], note, updatedAt: now }
        : e)));
      setMsg(`已更新：${grp} ${l.item}`);
    } else {
      const recs = keep.map((l, i) => ({
        id: `e-${Date.now()}-${i}`, grp, date, hour, item: l.item,
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
    setNote(e.note || ''); setHour(e.hour ?? null); setMsg('');
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
          <div className="flex items-baseline flex-wrap" style={{ gap: 8 }}>
            <Eyebrow>下單時間（選填）</Eyebrow>
            <span style={{ fontSize: 11, color: C.ink3 }}>對方下單的時間，不是你輸入的時間</span>
            <button onClick={() => setHour(new Date().getHours())}
              style={{ marginLeft: 'auto', fontFamily: SANS, fontSize: 12, color: C.teal, border: `1px solid ${C.rule}`, padding: '3px 10px', background: C.surf }}>現在</button>
            {hour != null && <button onClick={() => setHour(null)} style={{ fontFamily: SANS, fontSize: 12, color: C.ink3 }}>清除</button>}
          </div>
          {[['上午', HOURS_AM], ['下午', HOURS_PM]].map(([lbl, hs]) => (
            <div key={lbl} className="flex items-center flex-wrap" style={{ gap: 5, marginTop: 7 }}>
              <span style={{ fontFamily: SANS, fontSize: 12, color: C.ink3, width: 30 }}>{lbl}</span>
              {hs.map((h) => (
                <button key={h} onClick={() => setHour(hour === h ? null : h)}
                  style={{ fontFamily: MONO, fontSize: 13, padding: '6px 10px', minWidth: 38,
                    border: `1px solid ${hour === h ? C.ink : C.rule}`,
                    background: hour === h ? C.ink : C.surf, color: hour === h ? '#fff' : C.ink2 }}>
                  {h > 12 ? h - 12 : h}
                </button>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: hour != null ? C.teal : C.ink3, marginTop: 7 }}>
            {hour != null ? `已選：${hourLabel(hour)}` : '沒把握就留空——填錯比不填更糟，會污染之後的時間分析。'}
          </div>
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
                {e.hour != null && <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff', background: C.ink3, padding: '2px 5px' }}>{hourLabel(e.hour)}</span>}
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
        部分品項曾於期中調價，單價以資料檔為準，補登一律套用，不可手動更改。
        贈品 EA 計入總量與贈品率、不計入金額與付費 EA，與 SOP 三口徑一致。
        一張訂單的多個品項會各自存成獨立紀錄（流速是逐條品項線計算的），只有輸入端合併。
      </div>
    </div>
  );
}

/* ── 外殼 ─────────────────────────────────────────────── */
const NAV = [['entry', '🔥接單'], ['prep', '拜訪前'], ['review', '複盤'], ['sched', '排程'], ['data', '資料']];

/* ── 首次啟動：匯入資料檔 ───────────────────────────────────────── */
function applyDataset(text) {
  const p = JSON.parse(text);
  const info = hydrate(p);                       // 先驗證再落地，格式不對不會覆蓋既有資料
  const prev = rawGet(KEY.dataset);
  if (prev) rawSet(KEY.dsbak, prev);             // 保留上一份，可退回（不採用無法復原的覆蓋）
  rawSet(KEY.dataset, p);
  return info;
}

function ImportGate({ onDone, compact }) {
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const take = (text) => {
    setBusy(true); setErr(null);
    try { const info = applyDataset(text); setBusy(false); onDone(info); }
    catch (e) { setBusy(false); setErr(e.message || String(e)); }
  };
  const onFile = (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => take(String(r.result));
    r.onerror = () => setErr('檔案讀取失敗');
    r.readAsText(f);
  };
  const box = { background: C.surf, border: `1px solid ${C.rule}`, padding: '16px 16px' };
  return (
    <div style={compact ? box : { minHeight: '100vh', background: C.bg, padding: '32px 18px' }}>
      {!compact && (
        <>
          <Eyebrow>SETUP · 這台裝置還沒有資料</Eyebrow>
          <h1 style={{ fontFamily: SANS, fontSize: 26, fontWeight: 900, color: C.ink, margin: '6px 0 14px' }}>匯入資料檔</h1>
        </>
      )}
      <div style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.9 }}>
        {compact ? '有新一期 Offtake 時，匯入新的 pharmacy-data.json。' :
          <>App 程式本身<b>不含任何客戶資料</b>。分析數字、客戶劇本與禁區、單價，都在你自己的 <b>pharmacy-data.json</b> 裡。
          匯入一次即可，之後每天開啟直接讀本機，不必再選檔案。</>}
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ display: 'inline-block', fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: '#fff',
          background: C.teal, padding: '11px 20px', cursor: 'pointer' }}>
          選擇資料檔
          <input type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} />
        </label>
        {busy && <span style={{ fontFamily: SANS, fontSize: 12.5, color: C.ink2, marginLeft: 12 }}>讀取中…</span>}
      </div>
      {err && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}`, padding: '10px 12px', marginTop: 12 }}>
          <div style={{ fontSize: 13, color: C.red, lineHeight: 1.8 }}>匯入失敗：{err}</div>
          <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.7, marginTop: 4 }}>既有資料未被更動。</div>
        </div>
      )}
      {!compact && (
        <div style={{ fontSize: 12, color: C.ink3, lineHeight: 1.8, marginTop: 18 }}>
          資料檔只存在這台裝置，不會上傳。App 改版不會清掉它，拜訪紀錄與接單補登也一樣。
          <br />任何能打開這台手機的人都能看到內容——本 App 不設密碼。
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [ds, setDs] = useState(() => loadDataset());
  if (!ds) return <ImportGate onDone={setDs} />;
  return <Main ds={ds} setDs={setDs} />;
}

function Main({ ds, setDs }) {
  const [tab, setTab] = useState('entry');
  const [sel, setSel] = useState(null);
  const [logGrp, setLogGrp] = useState(null);
  const [editing, setEditing] = useState(null);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [backups, setBackups] = useState([]);
  const [entries, setEntries] = useState([]);
  const [lastExp, setLastExp] = useState(() => rawGet(KEY.exp));
  const [newVer, setNewVer] = useState(null);

  /* 版本偵測：iOS 桌面 App 的 HTTP 快取無法手動清除，改由程式主動比對。
     必須在「每次回到前景」都檢查——iOS 從背景恢復 App 時不會重新掛載元件，
     只在載入時檢查一次的話，使用者永遠等不到更新提示。 */
  useEffect(() => {
    if (typeof fetch !== 'function') return;   // 缺少 fetch 的環境直接略過，不得讓版本偵測拖垮整個畫面
    const check = () => {
      try {
        fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((v) => { if (v && v.version && v.version !== APP_VERSION) setNewVer(v); })
          .catch(() => {});
      } catch { /* 版本偵測失敗不影響任何功能 */ }
    };
    check();
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, []);

  useEffect(() => {
    try {
      const { blob, migrated } = loadAll();
      if (!blob) {
        const seeded = saveAll(SEED, []);
        setLog(seeded.visits); setEntries([]);
        setErr(`首次啟動：已自資料檔載入 ${SEED.length} 筆轉錄的拜訪紀錄。請到「資料」頁下載一份 JSON 備份。`);
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
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#8FA8B2', marginTop: 2, letterSpacing: '0.08em' }}>v{APP_VERSION} · SOP v3.9 · 分析 {DATASET} · schema v{SCHEMA}</div>
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

        {(() => {
          const n = log.length + entries.length;
          if (n === 0) return null;
          const days = lastExp ? Math.floor((Date.now() - new Date(lastExp)) / 86400000) : null;
          if (days !== null && days < BACKUP_DUE_DAYS) return null;
          return (
            <div className="px-4 py-3" style={{ background: C.amberBg, borderBottom: `1px solid #E8D9B8` }}>
              <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                <div style={{ flex: '1 1 200px', fontSize: 12.5, color: '#4A3608', lineHeight: 1.7 }}>
                  {days === null
                    ? <>你有 <b>{n}</b> 筆資料，<b>還沒下載過備份</b>。iOS 會清除長期未使用網站的本機資料，下載下來的 JSON 才是安全的那一份。</>
                    : <>距上次備份已 <b>{days}</b> 天，共 <b>{n}</b> 筆資料未備份。</>}
                </div>
                <button onClick={() => setTab('data')}
                  style={{ background: '#4A3608', color: '#fff', fontFamily: SANS, fontSize: 13.5, fontWeight: 700, padding: '9px 16px' }}>
                  去備份
                </button>
              </div>
            </div>
          );
        })()}
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
          <DataScreen log={log} onReplace={persist} backups={backups} onRestore={restore} entries={entries} onExported={() => setLastExp(rawGet(KEY.exp))} />
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
