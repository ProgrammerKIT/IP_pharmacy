#!/usr/bin/env python3
"""口徑同步檢查｜硬閘門
SOP 是規則的來源，pipeline.py／app_web.jsx 是實作。兩者若不同步，
分析仍會跑完並產出看似正常的數字——錯誤不會自己浮現。

本檢查比對「SOP 明文寫的值」與「程式實際用的值」，不一致即 exit 1。
用法：python3 check_sync.py <SOP.md>

涵蓋範圍刻意保守：只比對能在 SOP 中以明確字串定位的項目。
比不到的項目會列為「未涵蓋」提示，不當成錯誤——
假警報會使閘門被繞過，寧可少檢查也不要誤報。
"""
import json
import os
import re
import sys


def load(path):
    return open(path, encoding='utf-8').read()


def main():
    if len(sys.argv) < 2:
        cands = [f for f in os.listdir('.') if 'SOP' in f and f.endswith('.md')]
        if not cands:
            print('用法：python3 check_sync.py <SOP.md>')
            sys.exit(2)
        sop_path = sorted(cands)[-1]
    else:
        sop_path = sys.argv[1]
    sop = load(sop_path)
    pl = load('pipeline.py')
    app = load('app_web.jsx')
    roster = json.load(open(os.environ.get('ROSTER_FILE', 'roster_src.json'), encoding='utf-8'))

    bad, skipped, ok = [], [], []

    def chk(name, sop_val, code_val):
        if sop_val is None:
            skipped.append(name)
        elif str(sop_val) != str(code_val):
            bad.append(f'{name}：SOP 寫 {sop_val}，程式用 {code_val}')
        else:
            ok.append(f'{name} = {code_val}')

    # ① 期間口徑
    m = re.search(r'現行官方口徑為 1–(\d+) 月', sop)
    chk('期間口徑（CUTOFF_PERIOD）', m.group(1) if m else None,
        re.search(r'CUTOFF_PERIOD = (\d+)', pl).group(1))

    # ② 客戶群數
    m = re.search(r'(\d+) 個納入計算之原始名稱 → (\d+) 個客戶群', sop)
    chk('鎖定表原始名稱數', m.group(1) if m else None, len(roster['groupMap']))
    chk('客戶群數', m.group(2) if m else None, len(set(roster['groupMap'].values())))

    # ③ 排除客戶數
    m = re.search(r'另 (\d+) 家排除', sop)
    chk('排除客戶數', m.group(1) if m else None, len(roster['excludeCustomers']))

    # ④ 品項數
    m = re.search(r'分析口徑為 \*\*(\d+) 個品項\*\*', sop)
    # ITEM_MAP 有 11 條，其中兩組為同品項異名（Ultra UD 的 UDPF 寫法、TNF 新舊品名，
    # 裁定 2）。要比對的是「去重後的品項數」，不是條目數。
    _blk = re.search(r'ITEM_MAP = \{(.*?)\n\}', pl, re.S).group(1)
    _items = {v for _, v in re.findall(r"'([^']+)':\s*'([^']+)'", _blk)}
    chk('品項數（異名去重後）', m.group(1) if m else None, len(_items))

    # ⑤ 分層門檻
    sop_growth = '**成長**：≥ +10%' in sop
    chk('分層門檻 +10%', '0.10' if sop_growth else None,
        str(re.search(r'TIER_BANDS = \[\((0\.\d+)', pl).group(1)))
    sop_bad = '**嚴重衰退**：≤ −30%' in sop
    chk('分層門檻 −30%', '-0.30' if sop_bad else None,
        str(re.search(r"\((-0\.\d+), '衰退'\)", pl).group(1)))

    # ⑥ 斷單規則 F（裁定 25）
    m = re.search(r'倍數 ≥ ?1\.5 且 ?超過估計見底 ≥ ?(\d+) 天', sop.replace('**', ''))
    chk('斷單門檻 倍數', '1.5' if m else None,
        re.search(r'const WARN_RATIO = ([\d.]+);', app).group(1))
    chk('斷單門檻 超過見底天數', m.group(1) if m else None,
        re.search(r'const WARN_PAST_DAYS = (\d+);', app).group(1))

    # ⑦ 單價鎖定（裁定 18）
    sop_units = dict(re.findall(r'(Ultra MD|X3|Ultra UD|HAUD|HAMD|C|TN|TNF|DT) ([\d.]+)／[\d.]+', sop))
    app_units = dict(re.findall(r"'([\w ]+)': ([\d.]+)", re.search(r'unit: \{(.*?)\}', load('play_src.js'), re.S).group(1))) \
        if os.path.exists('play_src.js') else {}
    if sop_units and app_units:
        for k, v in sop_units.items():
            if k in app_units and app_units[k] != v:
                bad.append(f'單價 {k}：SOP 寫 {v}，資料檔用 {app_units[k]}')
        ok.append(f'單價鎖定表 {len(sop_units)} 項')
    else:
        skipped.append('單價鎖定表')

    print(f'口徑同步檢查｜SOP：{sop_path}')
    for x in ok:
        print(f'   ✓ {x}')
    if skipped:
        print(f'   － 未涵蓋（SOP 中定位不到，不視為錯誤）：{"、".join(skipped)}')
    if bad:
        print(f'\n❌ 口徑不同步，發現 {len(bad)} 項：')
        for b in bad:
            print(f'   · {b}')
        print('\n   SOP 與程式必須同時更新（建置工具鏈章「規則同步紀律」）。')
        print('   改完再跑；在此之前不產出可部署檔案。')
        sys.exit(1)
    print(f'✅ 口徑同步（比對 {len(ok)} 項，不同步 0 項）')


if __name__ == '__main__':
    main()
