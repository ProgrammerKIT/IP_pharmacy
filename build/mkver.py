#!/usr/bin/env python3
"""從 app_web.jsx 抽版號、從 IP_index.html 抽建置時間，產生 version.json"""
import re, json
src = open('app_web.jsx', encoding='utf-8').read()
m = re.search(r"APP_VERSION\s*=\s*['\"](\d+\.\d+\.\d+)['\"]", src)
if not m:
    raise SystemExit('❌ app_web.jsx 抓不到 APP_VERSION')
h = open('IP_index.html', encoding='utf-8').read()
b = re.search(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2})', h)
out = {'version': m.group(1), 'buildAt': b.group(1) if b else '',
       'note': 'App 啟動時比對此檔，版本不同即提示更新'}
json.dump(out, open('version.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('   version.json →', out['version'], out['buildAt'])
