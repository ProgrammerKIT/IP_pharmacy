#!/usr/bin/env python3
"""假設帳對帳（SOP 裁定 30、交接必查點第 8 項）
新一期官方檔進來時，逐筆列出假設帳中每筆假設訂單在官方資料中的對應情形。
只列事實（日期、數量、金額），不判定、不改寫假設帳；結論由 Kit 決定。

用法：python3 reconcile_scenarios.py <Offtake.xlsx> [scenario.json]
口徑規則一律取自 pipeline.py（不得另寫一套）。
"""
import json
import sys

import pandas as pd

from pipeline import load


def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    xlsx = sys.argv[1]
    sc_path = sys.argv[2] if len(sys.argv) > 2 else 'scenario.json'
    df, _ = load(xlsx)
    cutoff = df.D.max()
    sc = json.load(open(sc_path, encoding='utf-8'))
    print(f'假設帳對帳｜官方資料截止 {cutoff:%Y-%m-%d}｜{sc_path}')
    for e in sc['entries']:
        if e.get('status') != '待核對':
            continue
        prior = pd.Timestamp(e['prior_cutoff'])
        rows = df[(df.Grp == e['grp']) & (df.Item == e['item']) & (df.D > prior)].sort_values('D')
        print(f"\n{e['id']}｜{e['grp']} {e['item']} 假設 {e['qty_ea']} EA／估 {e['amount_est']:,}"
              f"（{e['order_date'] or '未給日期'}）")
        if cutoff <= prior:
            print('   官方資料尚未超過上次截止日，無法核對'); continue
        if rows.empty:
            print(f"   {e['prior_cutoff']} 之後官方資料中無此客戶此品項之訂單 → 未入帳")
            continue
        for _, r in rows.iterrows():
            kind = '贈品' if r.Sales == 0 else '付費'
            print(f'   {r.D:%Y-%m-%d}  {int(r.EA)} EA  {int(r.Sales):,}  （{kind}）')
        paid = rows[rows.Sales > 0]
        ea, amt = int(paid.EA.sum()), int(paid.Sales.sum())
        same = '數量相同' if ea == e['qty_ea'] else f"數量不同（官方付費 {ea} EA）"
        print(f'   小計付費 {ea} EA／{amt:,}；{same}；金額差 {amt - e["amount_est"]:+,}')
    print('\n以上僅列事實；是否影響已交付之簡報結論，由 Kit 決定。')


if __name__ == '__main__':
    main()
