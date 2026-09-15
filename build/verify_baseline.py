#!/usr/bin/env python3
"""
指紋對帳｜把新產生的 baseline.json 跟上一期已提交的比對。
去年的數字不該變。一旦變了，就是重跑時邏輯跑掉了，必須先查清楚才能繼續。

用法： python3 verify_baseline.py baseline.json baseline_prev.json
       python3 verify_baseline.py baseline.json baseline_prev.json --period-change <同期驗證檔>

期間變更時（裁定 23），去年同期數字本來就會變，直接比對必然失敗。
但**不得因此跳過檢查**——否則真正的靜默錯誤會一起被放過。
故要求先在「舊期間」下跑一次同期驗證並保留其 baseline，通過後才以 --period-change 帶入該檔續行；
續行時仍會檢查期間不變的三項：2025 全年總額、客戶群數、逐層扣除平衡。
"""
import sys, json

def main():
    if len(sys.argv) < 3:
        raise SystemExit('用法：python3 verify_baseline.py <新 baseline.json> <舊 baseline.json>')
    new = json.load(open(sys.argv[1], encoding='utf-8'))
    old = json.load(open(sys.argv[2], encoding='utf-8'))
    bad = []

    pc = None
    if '--period-change' in sys.argv:
        i = sys.argv.index('--period-change')
        if i + 1 >= len(sys.argv):
            raise SystemExit('❌ --period-change 須帶入「舊期間下之同期驗證 baseline 檔」路徑')
        pc = json.load(open(sys.argv[i + 1], encoding='utf-8'))
        if pc['compare_period'] != old['compare_period']:
            raise SystemExit(f"❌ 同期驗證檔期間為 {pc['compare_period']}，與上期 {old['compare_period']} 不符，無法作為佐證")
        if pc['source_file'] != new['source_file']:
            raise SystemExit('❌ 同期驗證檔之來源檔與本期不同，無法作為佐證')

    if old['compare_period'] != new['compare_period'] and pc is None:
        print(f"❌ 期間口徑已變更（{old['compare_period']} → {new['compare_period']}），指紋失去比對基礎。")
        print('   依裁定 23，須先於舊期間下跑一次同期驗證，通過後以下列方式續行：')
        print('   python3 verify_baseline.py baseline.json baseline_prev.json --period-change <同期驗證檔>')
        raise SystemExit(1)

    py = str(old['years'][0])
    if pc is not None:
        # 期間已變更：以同期驗證檔對上期指紋，證明來源檔無回溯調整
        for k in [f'{py}_1_{old["compare_period"].split("-")[1].replace(" 月","")}', f'{py}_full_year',
                  'P1_prev', 'P2_prev', 'EA_prev']:
            if k in old['totals'] and k in pc['totals'] and old['totals'][k] != pc['totals'][k]:
                bad.append(f"[同期驗證] 去年總計 {k}: {old['totals'][k]:,} → {pc['totals'][k]:,}")
        for it, v in old.get('item_totals_prev', {}).items():
            nv = pc.get('item_totals_prev', {}).get(it)
            if nv is not None and nv != v:
                bad.append(f'[同期驗證] 去年品項 {it}: {v:,} → {nv:,}')
        # 本期只檢查期間不變之項目
        if old['totals'].get(f'{py}_full_year') != new['totals'].get(f'{py}_full_year'):
            bad.append(f"去年全年總額變動：{old['totals'].get(f'{py}_full_year'):,} → {new['totals'].get(f'{py}_full_year'):,}")
        if old['group_count'] != new['group_count']:
            bad.append(f"客戶群數：{old['group_count']} → {new['group_count']}（新增客戶須先經 Kit 裁定歸群）")
        if not new['reconciliation']['reconciles']:
            bad.append('逐層扣除對帳不平')
        if bad:
            print('❌ 指紋對帳未通過，先查清楚再繼續：')
            for b in bad: print('   ·', b)
            raise SystemExit(1)
        print(f"✅ 指紋對帳通過（期間變更模式：{old['compare_period']} → {new['compare_period']}）")
        print(f"   同期驗證：於 {old['compare_period']} 口徑下比對上期指紋，去年數字未變動")
        print(f"   本期檢查：去年全年總額、客戶群數、逐層扣除平衡，三項均通過")
        print(f"   上期來源：{old['source_file']}（{old['generated_at']}）")
        print(f"   本期來源：{new['source_file']}（{new['generated_at']}）")
        return

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
