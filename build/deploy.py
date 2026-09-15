#!/usr/bin/env python3
"""用 GitHub Contents API 直接 commit 檔案到 repo。
用法：
    GH_TOKEN=xxx python3 deploy.py "commit 訊息"                 # 部署 IP_index.html
    GH_TOKEN=xxx python3 deploy.py --file version.json "訊息"    # 部署指定檔案
"""
import base64, json, os, subprocess, sys, tempfile, hashlib

REPO = 'ProgrammerKIT/IP_pharmacy'
TOK = os.environ.get('GH_TOKEN') or sys.exit('❌ 請設定環境變數 GH_TOKEN')
H = ['-H', f'Authorization: Bearer {TOK}', '-H', 'Accept: application/vnd.github+json']

args = sys.argv[1:]
path = 'IP_index.html'
if args and args[0] == '--file':
    path = args[1]; args = args[2:]
msg = args[0] if args else 'update'
remote = path if '/' not in path else path

cur = json.loads(subprocess.run(['curl', '-s', *H,
    f'https://api.github.com/repos/{REPO}/contents/{remote}'], capture_output=True, text=True).stdout)
data = open(path, 'rb').read()
body = {'message': msg, 'content': base64.b64encode(data).decode(), 'branch': 'main'}
if cur.get('sha'): body['sha'] = cur['sha']

with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
    json.dump(body, f); tmp = f.name          # 檔案大，不能塞進 argv
r = json.loads(subprocess.run(['curl', '-s', '-X', 'PUT', *H, '--data-binary', f'@{tmp}',
    f'https://api.github.com/repos/{REPO}/contents/{remote}'], capture_output=True, text=True).stdout)
os.unlink(tmp)

if 'commit' in r:
    print(f"✅ {remote} → commit {r['commit']['sha'][:7]}｜{msg}")
    print(f"   {len(data):,} bytes｜md5 {hashlib.md5(data).hexdigest()[:12]}")
else:
    sys.exit(f"❌ {json.dumps(r, ensure_ascii=False)[:300]}")
