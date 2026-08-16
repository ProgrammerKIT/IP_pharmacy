#!/bin/bash
# 完整建置：資料 → 打包 → 測試。測試未過不產出可部署檔案。
set -e
cd "$(dirname "$0")"
XLSX="${1:?用法：./build.sh <Offtake.xlsx>}"

echo "── 1/5 資料管線 ──"
python3 pipeline.py "$XLSX"

echo "── 2/5 指紋對帳 ──"
if [ -f baseline_prev.json ]; then python3 verify_baseline.py baseline.json baseline_prev.json
else echo "   （無上期指紋，略過；本期 baseline.json 將成為下期基準）"; fi

echo "── 3/5 組版 ──"
BUILD_AT=$(TZ=Asia/Taipei date '+%Y-%m-%d %H:%M')
python3 - "$BUILD_AT" << 'PY'
import sys
d=open('data.json',encoding='utf-8').read()
s=open('app_web.jsx',encoding='utf-8').read()
open('build_src.jsx','w',encoding='utf-8').write(s.replace('__BUILD_AT__',sys.argv[1]).replace('__DATA__',d))
print('   build_at =', sys.argv[1])
PY
npx --yes esbuild@0.21.5 build_src.jsx --loader:.jsx=jsx --bundle --minify --charset=utf8 \
  --format=iife --global-name=PharmApp --alias:react=./shim-react.js --outfile=bundle.js
python3 mkhtml.py
python3 mkver.py

echo "── 4/5 測試（五分頁巡檢 ＋ 客戶卡）──"
node test_ui.js

echo "── 5/5 完成 ──"
echo "   產出：IP_index.html / version.json / data.json / baseline.json"
echo "   部署： GH_TOKEN=xxx python3 deploy.py \"版本說明\""
