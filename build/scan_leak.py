#!/usr/bin/env python3
"""洩漏掃描｜硬閘門
程式檔（IP_index.html、app_web.jsx、build kit）不得含任何客戶識別資訊。
掃到任何一處即 exit 1，build.sh 因 set -e 直接中止，產不出可部署檔案。

為什麼要做成閘門而不是提示：
2026/09/20 掃描已回報「建祥 1 處」，但部署指令仍接續跑完才被察覺——
那一處是 v2.5.0 的變更紀錄誤寫客戶名與 409 價格條件，在公開 repo 掛了約 12 小時。
提示會被看漏，閘門不會。

關鍵字來源＝roster_src.json 的實際客戶名單（不是手打清單，避免新增客戶後漏掃），
加上單價鎖定表與已知敏感字串。
"""
import json
import os
import re
import sys

ROSTER = os.environ.get('ROSTER_FILE', 'roster_src.json')
TARGETS = ['IP_index.html', 'app_web.jsx', 'pipeline.py', 'verify_baseline.py',
           'build.sh', 'test_ui.js', 'mkhtml.py', 'mkver.py', 'deploy.py',
           'shim-react.js', 'README.md', '.gitignore']

# 壓縮後的 React／字型參數會誤中純數字，故單價以「小數點形式」為主，避免 409/400 之類誤判
PRICE = ['428.5', '169.5', '333.35', '333.38', '238.1', '95.25', '58.62', '281', '460']
EXTRA = ['寧夏', '愛三路', '麥金', '三和路', '溪尾街', '保福路', '永安街', '樂業街', 'Pantanol']


def keywords():
    ks = set(EXTRA)
    if os.path.exists(ROSTER):
        r = json.load(open(ROSTER, encoding='utf-8'))
        for name in list(r.get('groupMap', {}).keys()) + list(r.get('groupMap', {}).values()):
            ks.add(name)
            # 去掉常見後綴，讓「建祥藥局」也能以「建祥」比對到
            short = re.sub(r'(股份有限公司|有限公司|大藥局|藥局|體系|生技|藥品|－.*|-.*|_.*)', '', name).strip()
            if len(short) >= 2:
                ks.add(short)
        for x in r.get('excludeCustomers', []):
            ks.add(x)
    else:
        print(f'⚠ 找不到 {ROSTER}，僅以內建關鍵字掃描（涵蓋不完整）')
    return sorted(ks, key=len, reverse=True)


def main():
    ks = keywords()
    hits = []
    for f in TARGETS:
        if not os.path.exists(f):
            continue
        txt = open(f, encoding='utf-8', errors='ignore').read()
        for k in ks:
            # 詞界：客戶名前後不得緊鄰中文字，否則「天一」會命中「平均 N 天一訂」這類句子。
            # 閘門一旦有假警報就會被繞過，寧可嚴格定義比對條件。
            pat = r'(?<![\u4e00-\u9fff])' + re.escape(k) + r'(?![\u4e00-\u9fff])'
            ms = list(re.finditer(pat, txt))
            if ms:
                hits.append((f, k, len(ms), txt[max(0, ms[0].start() - 45):ms[0].start() + 45]))
        for p in PRICE:
            # 單價需前後非數字，避免 4096 之類誤中
            for m in re.finditer(r'(?<![\d.])' + re.escape(p) + r'(?![\d])', txt):
                hits.append((f, f'單價 {p}', 1, txt[max(0, m.start() - 45):m.start() + 45]))
                break
    if hits:
        print(f'❌ 洩漏掃描未通過：程式檔中發現 {len(hits)} 處客戶識別資訊')
        for f, k, c, ctx in hits[:12]:
            print(f'   · {f}｜{k}（{c} 處）')
            print(f'     …{ctx.strip()[:90]}…')
        print('\n   程式檔會推上公開 repo，不得含客戶名稱、地址或單價。')
        print('   常見來源：變更紀錄（CHANGELOG）寫了案例、測試腳本寫死客戶名、說明文字舉例。')
        print('   修掉之後重跑建置；在此之前不產出可部署檔案。')
        sys.exit(1)
    print(f'✅ 洩漏掃描通過（{len(ks)} 個關鍵字 × {len([f for f in TARGETS if os.path.exists(f)])} 個檔案，0 處）')


if __name__ == '__main__':
    main()
