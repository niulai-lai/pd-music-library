# -*- coding: utf-8 -*-
"""GitHub Pages 全自动部署：建仓库 → Contents API 逐文件上传 → 开启 Pages → 输出公网网址。
用法：python deploy-gh.py [仓库名]  （需先完成 gh auth login）
"""
import json, base64, os, subprocess, sys, io, time, mimetypes

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
GH = r'C:\Program Files\GitHub CLI\gh.exe'
ROOT = r'E:\zcode\pd-music-library'
REPO = sys.argv[1] if len(sys.argv) > 1 else 'pd-music-library'
DESC = '公有领域音乐图书馆 - Public Domain Music Library（纯静态站）'
EXCLUDE_DIRS = {'research\\__pycache__'}
EXCLUDE_FILES = {'research\\gh-code.txt'}

def run(args, input_bytes=None, ok_fail=False):
    p = subprocess.run(args, input=input_bytes, capture_output=True)
    out = p.stdout.decode('utf-8', errors='replace')
    err = p.stderr.decode('utf-8', errors='replace')
    if p.returncode != 0 and not ok_fail:
        print('命令失败:', ' '.join(args)[:120])
        print(err[:500] or out[:500])
    return p.returncode, out, err

# 1. 当前用户
rc, out, _ = run([GH, 'api', 'user', '--jq', '.login'])
if rc != 0:
    print('未登录 GitHub。请先完成 gh auth login。')
    sys.exit(1)
OWNER = out.strip()
print('GitHub 用户:', OWNER)

# 2. 创建仓库（已存在则复用）
rc, out, err = run([GH, 'repo', 'create', REPO, '--public', '--description', DESC])
if rc != 0:
    if 'already exists' in (err or '').lower():
        print('仓库已存在，继续。')
    else:
        print('创建仓库失败'); sys.exit(1)
else:
    print('仓库已创建:', out.strip())

# 3. 收集文件
files = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d != '__pycache__']
    for fn in filenames:
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT).replace('\\', '/')
        if rel in {f.replace('\\', '/') for f in EXCLUDE_FILES}: continue
        if full.endswith('.tmp'): continue
        files.append((rel, full))
files.sort()
print('待上传文件数:', len(files))

# 4. 逐文件 Contents API 上传（存在则先取 sha 更新）
sha_cache = {}
for rel, full in files:
    data = open(full, 'rb').read()
    payload = {
        'message': f'chore: add {rel}',
        'content': base64.b64encode(data).decode(),
    }
    key = rel
    if key not in sha_cache:
        rc, out, _ = run([GH, 'api', f'repos/{OWNER}/{REPO}/contents/{rel}',
                          '--jq', '.sha'], ok_fail=True)
        sha_cache[key] = (out.strip() or None) if rc == 0 else None
    if sha_cache[key]:
        payload['sha'] = sha_cache[key]
    body = json.dumps(payload).encode('utf-8')
    for attempt in range(4):
        rc, out, err = run([GH, 'api', f'repos/{OWNER}/{REPO}/contents/{rel}',
                            '--method', 'PUT', '--input', '-'],
                           input_bytes=body, ok_fail=True)
        if rc == 0:
            break
        time.sleep(1.5 * (attempt + 1))
    else:
        print('!! 上传失败:', rel, (err or out)[:200]); sys.exit(1)
    print(f'  已上传 {rel} ({len(data)//1024}KB)')

# 5. 开启 Pages（main 分支根目录）
body = json.dumps({'build_type': 'legacy', 'source': {'branch': 'main', 'path': '/'}}).encode()
rc, out, err = run([GH, 'api', f'repos/{OWNER}/{REPO}/pages', '-X', 'POST', '--input', '-'],
                   input_bytes=body, ok_fail=True)
if rc == 0:
    print('Pages 开启请求已提交')
elif 'already' in (err or '').lower():
    print('Pages 已开启')
else:
    print('Pages 开启失败(可能稍后自动可用):', (err or out)[:300])

# 6. 轮询构建状态
html = f'https://{OWNER.lower()}.github.io/{REPO}/'
for _ in range(40):
    rc, out, _ = run([GH, 'api', f'repos/{OWNER}/{REPO}/pages', '--jq',
                      '(.status // "built") + "|" + (.html_url // "")'], ok_fail=True)
    if rc == 0 and out.strip():
        status, _, url = out.strip().partition('|')
        if url: html = url
        print(f'Pages 状态: {status}')
        if status in ('built', 'deployment_reserved', 'verification', 'built?'):
            break
        if status == 'error':
            print('构建出错，请到仓库 Settings→Pages 查看'); break
    time.sleep(4)

print('LIVE_URL=' + html)
