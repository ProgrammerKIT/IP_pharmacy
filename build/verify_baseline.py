#!/usr/bin/env python3
"""
指紋對帳｜把新產生的 baseline.json 跟上一期已提交的比對。
去年的數字不該變。一旦變了，就是重跑時邏輯跑掉了，必須先查清楚才能繼續。

用法： python3 verify_baseline.py baseline.json baseline_prev.json
"""
import sys, json

def main():
    if len(sys.argv) < 3:
        raise SystemExit('用法：python3 verify_baseline.py <新 baseline.json> <舊 baseline.json>')
    new = json.load(open(sys.argv[1], encoding='utf-8'))
    old = json.load(open(sys.argv[2], encoding='utf-8'))
    bad = []

    py = str(old['years'][0])
    for k in [f'{py}_1_{old["compare_period"].split("-")[1].replace(" 月","")}', f'{py}_full_year',
              'P1_prev', 'P2_prev', 'EA_prev']:
        if k in old['totals'] and k in new['totals'] and old['totals'][k] != new['totals'][k]:
            bad.append(f"去年總計 {k}: {old['totals'][k]:,} → {new['totals'][k]:,}")

    for it, v in old.get('item_totals_prev', {}).items():
        nv = new.get('item_totals_prev', {}).get(it)
        if nv is not None and nv != v:
            bad.append(f'去年品項 {it}: {v:,} → {nv:,}')

    if old['group_count'] != new['group_count']:
        bad.append(f"客戶群數：{old['group_count']} → {new['group_count']}（新增客戶須先經 Kit 裁定歸群）")

    if not new['reconciliation']['reconciles']:
        bad.append('逐層扣除對帳不平')

    if bad:
        print('❌ 指紋對帳未通過，先查清楚再繼續：')
        for b in bad: print('   ·', b)
        raise SystemExit(1)
    print('✅ 指紋對帳通過：去年數字未變動、客戶群數一致、逐層扣除平衡')
    print(f"   上期來源：{old['source_file']}（{old['generated_at']}）")
    print(f"   本期來源：{new['source_file']}（{new['generated_at']}）")

if __name__ == '__main__':
    main()
