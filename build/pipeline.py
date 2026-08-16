#!/usr/bin/env python3
"""
獨立藥局拜訪作戰台｜資料管線
xlsx (Offtake) → data.json (App 資料) + baseline.json (指紋，供下期對帳)

用法：
    python3 pipeline.py /path/to/YTD_xxx.xlsx

所有口徑規則來自 SOP，修改前務必先讀 SOP 對應裁定條號（見各處註解）。
"""
import sys, json, hashlib
import pandas as pd, numpy as np

# ─────────────────────────────────────────────────────────────
# 口徑規則（對應 SOP 裁定，改這裡之前先改 SOP）
# ─────────────────────────────────────────────────────────────
CUTOFF_PERIOD = 7          # 官方 YoY 比較期間：兩年皆 1–7 月（裁定 1、17）

DROP_MATERIALS = [         # 完全剔除，不進任何計算（裁定 3）
    'SYSTANE HA UD 5X0.7ML 2',
    'ALCON SYSTANE COMBO PACK',
]

EXCLUDE_CUSTOMERS = [      # 排除客戶，資料照常回報但不進統計（裁定 8）
    '北一藥師藥局', '建芳', '天一', '新廣生', '慧安',
]

ITEM_MAP = {               # 品項合併與簡寫（裁定 2、5）
    'SYSTANE ULTRA 10ML-  TPE': 'Ultra MD',
    'SYSTANE ULTRA 10ML X3': 'X3',
    'SYSTANE ULTRA UD 24X0.5ML-TPE': 'Ultra UD',
    'SYSTANE ULTRA UDPF 24 X 0.5ML - TPE': 'Ultra UD',   # 同一產品異名，非新款
    'SYSTANE HA UD 30X0.7ML-TPE': 'HAUD',
    'SYSTANE HA MULTI-DOSE 10ML- TPE': 'HAMD',
    'SYSTANE COMPLETE 5ML -  TPE': 'C',
    'TEARS NATURALE 15ML W/POLY-TPE': 'TN',
    'TEARS NATURALE FREE 0.8ML 32S -TPE': 'TNF',
    'TEARS NATURALE FREE 32 X 0.8ML - TPE': 'TNF',
    'DURATEARS OINTMENT 3.5G-TPE': 'DT',
}

ITEM_ORDER = ['Ultra MD', 'X3', 'Ultra UD', 'HAUD', 'HAMD', 'C', 'TN', 'TNF', 'DT']
P1_ITEMS = set(ITEM_ORDER[:6])   # P2 僅 TN／TNF／DT（裁定 7）

# 客戶合併鎖定表 v1.3（34 個原始名稱 → 22 客戶群）
GROUP_MAP = {}
for n in ['天康醫藥生技股份有限公司-倉庫', '天康大藥局', '天康八里藥局',
          '天康醫藥生技股份有限公司-天康大藥局', '天文大藥局', '天文大藥局-學府店',
          '天康大藥局-學府店']:
    GROUP_MAP[n] = '天康＋天文體系'
for n in ['彬利藥品股份有限公司', '彬利藥品股份有限公司-倉庫']:
    GROUP_MAP[n] = '彬利藥品'          # 同址兩代號，合併（裁定 15）
for n in ['康宏安藥局', '康宏安藥局_倉庫']:
    GROUP_MAP[n] = '康宏安'            # 一般門市，非倉庫型（裁定 12）
for n in ['婕登藥局', '婕登藥局－長庚店']:
    GROUP_MAP[n] = '婕登體系'
for n in ['建祥藥局', '建祥三和藥局']:
    GROUP_MAP[n] = '建祥體系'
for n in ['青年宏越藥局', '宏越藥局－倉庫']:
    GROUP_MAP[n] = '宏越體系'
for n in ['順儷宜安藥局', '順儷健康事業股份有限公司']:
    GROUP_MAP[n] = '順儷體系'
GROUP_MAP.update({
    '永誠藥局': '永誠', '康之友藥局': '康之友', '益全生技藥品有限公司': '益全生技',
    '大田大藥局': '大田', '聖英藥局': '聖英', '長虹藥局': '長虹', '弘光藥局': '弘光',
    '皇佳大藥局': '皇佳', '皇安生技股份有限公司': '皇安', '安佑藥局－博揚藥局': '安佑－博揚',
    '全華藥品股份有限公司': '全華', '王中興藥局': '王中興',
    '博昱明峰大藥局－博昱大藥局': '博昱',
    '日森人文藥局': '日森本店', '日森人文藥局淡海店': '日森淡海',   # 兩店分開（裁定 v2.2）
})

TIER_BANDS = [(0.10, '成長'), (-0.10, '平穩'), (-0.30, '衰退')]   # 其餘為嚴重衰退


def tier_of(a, b):
    if a == 0 and b > 0: return '新客'
    if a > 0 and b == 0: return '流失'
    if a == 0: return '-'
    r = b / a - 1
    for th, name in TIER_BANDS:
        if r >= th: return name
    return '嚴重衰退'


def item_status(a, b):
    if a == 0 and b > 0: return '新進'
    if a > 0 and b == 0: return '歸零'
    if a == 0 and b == 0: return '-'
    r = b / a - 1
    for th, name in TIER_BANDS:
        if r >= th: return name
    return '嚴重衰退'


def load(path):
    """讀取並清理。回傳 (清理後 df, 對帳明細 dict)"""
    sheets = pd.read_excel(path, sheet_name=None, dtype=str)
    raw = pd.concat(sheets.values(), ignore_index=True)
    raw.columns = ['Year', 'Period', 'Date', 'Cust', 'Street', 'Prio', 'Mat', 'EA', 'Sales']
    raw['EA'] = pd.to_numeric(raw['EA']); raw['Sales'] = pd.to_numeric(raw['Sales'])
    raw['Year'] = raw['Year'].astype(int); raw['Period'] = raw['Period'].astype(int)

    audit = {'sheets': list(sheets), 'raw_rows': len(raw), 'raw_sales': float(raw.Sales.sum())}

    blank = raw['Cust'].isna() | raw['Cust'].astype(str).str.strip().isin(['', 'nan'])
    audit['blank_rows'] = int(blank.sum()); audit['blank_sales'] = float(raw[blank].Sales.sum())
    df = raw[~blank]

    dropped = df['Mat'].isin(DROP_MATERIALS)
    audit['dropped_item_rows'] = int(dropped.sum()); audit['dropped_item_sales'] = float(df[dropped].Sales.sum())
    df = df[~dropped]

    excl = df['Cust'].apply(lambda c: any(e in c for e in EXCLUDE_CUSTOMERS))
    audit['excluded_cust_rows'] = int(excl.sum()); audit['excluded_cust_sales'] = float(df[excl].Sales.sum())
    df = df[~excl].copy()

    audit['included_rows'] = len(df); audit['included_sales'] = float(df.Sales.sum())
    audit['reconciles'] = abs(audit['raw_sales'] - audit['blank_sales'] - audit['dropped_item_sales']
                              - audit['excluded_cust_sales'] - audit['included_sales']) < 0.01

    df['Item'] = df['Mat'].map(ITEM_MAP)
    df['Grp'] = df['Cust'].map(GROUP_MAP)
    unknown_items = sorted(df[df.Item.isna()]['Mat'].unique())
    unknown_custs = sorted(df[df.Grp.isna()]['Cust'].unique())
    if unknown_items: raise SystemExit(f'未登錄品項，須先確認：{unknown_items}')
    if unknown_custs: raise SystemExit(f'未登錄客戶名稱，須先報 Kit 裁定歸群：{unknown_custs}')

    df['P'] = np.where(df.Item.isin(P1_ITEMS), 'P1', 'P2')
    df['D'] = pd.to_datetime(df['Date'], format='%d.%m.%Y')
    df['Paid'] = np.where(df.Sales > 0, df.EA, 0)      # 三口徑（第一步）
    df['Gift'] = np.where(df.Sales == 0, df.EA, 0)
    return df, audit


def build(df):
    years = sorted(df.Year.unique())
    prev, curr = years[0], years[-1]
    a = df[(df.Year == prev) & (df.Period <= CUTOFF_PERIOD)]     # 去年同期
    b = df[(df.Year == curr) & (df.Period <= CUTOFF_PERIOD)]     # 今年
    y_prev_full = df[df.Year == prev]                            # 去年全年（同日累計基準用）

    out = {}
    for g in sorted(df.Grp.unique()):
        ga, gb = a[a.Grp == g], b[b.Grp == g]
        s25, s26 = float(ga.Sales.sum()), float(gb.Sales.sum())
        p1a = float(ga[ga.P == 'P1'].Sales.sum()); p1b = float(gb[gb.P == 'P1'].Sales.sum())
        ea_a, ea_b = float(ga.EA.sum()), float(gb.EA.sum())

        items = []
        for it in ITEM_ORDER:
            ia, ib = ga[ga.Item == it], gb[gb.Item == it]
            items.append(dict(item=it, p='P1' if it in P1_ITEMS else 'P2',
                              s25=int(ia.Sales.sum()), s26=int(ib.Sales.sum()),
                              e25=int(ia.EA.sum()), e26=int(ib.EA.sum()),
                              st=item_status(ia.Sales.sum(), ib.Sales.sum())))

        # 2026 逐筆訂單（節奏計算用，前端會再併入補登）
        orders = {}
        for it, s in gb.groupby('Item'):
            ser = s.groupby('D')['EA'].sum().sort_index()
            ser = ser[ser != 0]
            if len(ser): orders[it] = [[str(k.date()), float(v)] for k, v in ser.items()]

        # 歸零線：以去年【全年】判定，才看得到下半年才斷的線（裁定 17）
        zero = []
        gfull = y_prev_full[y_prev_full.Grp == g]
        for it, s in gfull.groupby('Item'):
            if s.Sales.sum() <= 0: continue
            if gb[gb.Item == it].Sales.sum() > 0: continue
            last = s[s.Sales > 0].D.max()
            zero.append(dict(item=it, s25=int(s.Sales.sum()), e25=int(s.EA.sum()),
                             last=str(last.date()),
                             h2=bool(last > pd.Timestamp(f'{prev}-07-31'))))
        zero.sort(key=lambda x: -x['s25'])

        inner = df[df.Grp == g].pivot_table(index='Cust', columns='Year', values='Sales', aggfunc='sum').fillna(0)
        innr = [dict(name=k, s25=int(v.get(prev, 0)), s26=int(v.get(curr, 0)))
                for k, v in inner.iterrows()] if len(inner) > 1 else []

        daily = gfull.groupby('D')['Sales'].sum().sort_index()
        mfull = gfull.groupby('Period')['Sales'].sum()

        out[g] = dict(
            grp=g, s25=int(s25), s26=int(s26), diff=int(s26 - s25),
            gr=round(s26 / s25 - 1, 4) if s25 else None, tier=tier_of(s25, s26),
            p1sh25=round(p1a / s25, 4) if s25 else None, p1sh26=round(p1b / s26, 4) if s26 else None,
            p1_25=int(p1a), p1_26=int(p1b),
            gift25=round(float(ga.Gift.sum()) / ea_a, 4) if ea_a else None,
            gift26=round(float(gb.Gift.sum()) / ea_b, 4) if ea_b else None,
            sku25=int(ga[ga.Sales != 0].Item.nunique()), sku26=int(gb[gb.Sales != 0].Item.nunique()),
            items=items,
            m25=[int(ga[ga.Period == m].Sales.sum()) for m in range(1, CUTOFF_PERIOD + 1)],
            m26=[int(gb[gb.Period == m].Sales.sum()) for m in range(1, CUTOFF_PERIOD + 1)],
            orders=orders, zero=zero, inner=innr,
            d25=[[str(k.date())[5:], round(float(v), 1)] for k, v in daily.items() if v != 0],
            y25full=int(gfull.Sales.sum()),
            m25full=[int(mfull.get(m, 0)) for m in range(1, 13)],
            i25full={k: int(v) for k, v in gfull.groupby('Item').Sales.sum().items() if v != 0},
        )

    ch_daily = y_prev_full.groupby('D')['Sales'].sum().sort_index()
    out['__CH__'] = dict(
        d25=[[str(k.date())[5:], round(float(v), 1)] for k, v in ch_daily.items() if v != 0],
        y25full=int(y_prev_full.Sales.sum()),
        m25full=[int(y_prev_full[y_prev_full.Period == m].Sales.sum()) for m in range(1, 13)],
        s26=int(b.Sales.sum()), s25_17=int(a.Sales.sum()),
    )
    return out, prev, curr, a, b


def fingerprint(path, audit, data, a, b, prev, curr):
    """指紋檔：下期重跑時先跟這份對帳，去年數字不該變"""
    src = open(path, 'rb').read()
    groups = {g: d['s26'] for g, d in data.items() if g != '__CH__'}
    return {
        'generated_at': pd.Timestamp.now(tz='Asia/Taipei').strftime('%Y-%m-%d %H:%M'),
        'source_file': path.split('/')[-1],
        'source_md5': hashlib.md5(src).hexdigest(),
        'source_bytes': len(src),
        'compare_period': f'1-{CUTOFF_PERIOD} 月',
        'years': [int(prev), int(curr)],
        'reconciliation': audit,
        'totals': {
            f'{prev}_1_{CUTOFF_PERIOD}': int(a.Sales.sum()),
            f'{curr}_1_{CUTOFF_PERIOD}': int(b.Sales.sum()),
            f'{prev}_full_year': data['__CH__']['y25full'],
            'yoy': round(b.Sales.sum() / a.Sales.sum() - 1, 4),
            'P1_prev': int(a[a.P == 'P1'].Sales.sum()), 'P1_curr': int(b[b.P == 'P1'].Sales.sum()),
            'P2_prev': int(a[a.P == 'P2'].Sales.sum()), 'P2_curr': int(b[b.P == 'P2'].Sales.sum()),
            'EA_prev': int(a.EA.sum()), 'EA_curr': int(b.EA.sum()),
        },
        'group_count': len(groups),
        'group_totals_curr': groups,
        'item_totals_curr': {it: int(b[b.Item == it].Sales.sum()) for it in ITEM_ORDER},
        'item_totals_prev': {it: int(a[a.Item == it].Sales.sum()) for it in ITEM_ORDER},
    }


def main():
    if len(sys.argv) < 2:
        raise SystemExit('用法：python3 pipeline.py <Offtake.xlsx>')
    path = sys.argv[1]
    df, audit = load(path)
    if not audit['reconciles']:
        raise SystemExit('❌ 逐層扣除對帳不平，停止。請檢查來源檔。')
    data, prev, curr, a, b = build(df)
    json.dump(data, open('data.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=0, separators=(',', ':'))
    fp = fingerprint(path, audit, data, a, b, prev, curr)
    json.dump(fp, open('baseline.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print(f"✅ 客戶群 {fp['group_count']} 家｜納入計算 {audit['included_rows']} 列")
    print(f"   {prev} 1-{CUTOFF_PERIOD}月 {fp['totals'][f'{prev}_1_{CUTOFF_PERIOD}']:,}"
          f" → {curr} {fp['totals'][f'{curr}_1_{CUTOFF_PERIOD}']:,}"
          f"（{fp['totals']['yoy']*100:+.1f}%）")
    print(f"   {prev} 全年 {fp['totals'][f'{prev}_full_year']:,}")
    print('   data.json / baseline.json 已產出')


if __name__ == '__main__':
    main()
