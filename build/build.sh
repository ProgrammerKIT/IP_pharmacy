#!/bin/bash
# 完整建置：資料 → 打包 → 測試。測試未過不產出可部署檔案。
set -e
cd "$(dirname "$0")"
XLSX="${1:?用法：./build.sh <Offtake.xlsx>}"

echo "── 1/6 資料管線 ──"
python3 pipeline.py "$XLSX"

echo "── 2/6 指紋對帳 ──"
if [ -f baseline_prev.json ]; then python3 verify_baseline.py baseline.json baseline_prev.json ${VERIFY_EXTRA:-}
else echo "   （無上期指紋，略過；本期 baseline.json 將成為下期基準）"; fi

echo "── 3/6 洩漏掃描（硬閘門）──"
python3 scan_leak.py

echo "── 4/6 組版 ──"
BUILD_AT=$(TZ=Asia/Taipei date '+%Y-%m-%d %H:%M')
python3 - "$BUILD_AT" << 'PY'
import sys
s=open('app_web.jsx',encoding='utf-8').read()
open('build_src.jsx','w',encoding='utf-8').write(s.replace('__BUILD_AT__',sys.argv[1]))
print('   build_at =', sys.argv[1], '（程式檔不含客戶資料）')
PY
npx --yes esbuild@0.21.5 build_src.jsx --loader:.jsx=jsx --bundle --minify --charset=utf8 \
  --format=iife --global-name=PharmApp --alias:react=./shim-react.js --outfile=bundle.js
python3 mkhtml.py
python3 mkver.py

echo "── 4.5/6 產出資料檔（客戶資料，不進 repo）──"
node -e "const fs=require('fs');
const src=require('./play_src.js');
const meta=src.__meta||{};
const EXTRA=['priority','exempt','grpKey','topicKind','seed','haPitch'];
const out={kind:'pharmacy-dataset',schema:1,buildAt:process.argv[1],
  dataset:meta.dataset||'',cutoff:meta.cutoff||'',unit:meta.unit||{}};
EXTRA.forEach(k=>{out[k]=src[k];});
const play={};
Object.keys(src).forEach(k=>{ if(k!=='__meta'&&!EXTRA.includes(k)) play[k]=src[k]; });
out.play=play;
out.data=JSON.parse(fs.readFileSync('data.json','utf8'));
fs.writeFileSync('pharmacy-data.json',JSON.stringify(out));
console.log('   pharmacy-data.json',JSON.stringify(out).length,'bytes | 劇本',Object.keys(play).length,'組 | 豁免',out.exempt.length,'條 | 優先序',out.priority.length,'家');
" "$BUILD_AT"

echo "── 5/6 測試（五分頁巡檢 ＋ 客戶卡）──"
node test_ui.js

echo "── 6/6 完成 ──"
echo "   程式：IP_index.html / version.json（可公開）\n   資料：pharmacy-data.json（客戶資料，只給 Kit，不得推上 repo）"
echo "   部署： GH_TOKEN=xxx python3 deploy.py \"版本說明\""
