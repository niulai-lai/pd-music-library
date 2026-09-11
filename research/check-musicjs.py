# -*- coding: utf-8 -*-
"""校验 data/music.js 与 music.json 内容一致且语法有效。"""
import json, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = 'E:/zcode/pd-music-library'
j = json.load(open(f'{ROOT}/data/music.json', encoding='utf-8'))
js = io.open(f'{ROOT}/data/music.js', encoding='utf-8').read()
prefix = 'window.PDML_DATA = '
ok_prefix = js.startswith('/*')
body_start = js.index(prefix) + len(prefix)
body_end = js.rindex(';')
data = json.loads(js[body_start:body_end])
print('music.json tracks:', len(j['tracks']), '| music.js tracks:', len(data['tracks']))
print('identical:', json.dumps(j, sort_keys=True, ensure_ascii=False) == json.dumps(data, sort_keys=True, ensure_ascii=False))
print('js prefix comment:', ok_prefix)
# 字段完整性抽查
need = ['id', 'title', 'category', 'source', 'background']
bad = [t['id'] for t in j['tracks'] if any(not t.get(k) for k in need)]
print('tracks missing core fields:', bad or 'none')
no_src = [t['id'] for t in j['tracks'] if not (t.get('audio') or t.get('scores'))]
print('tracks without audio&score:', no_src or 'none')
lens = sorted(len(t['background']) for t in j['tracks'])
print('background length min/max:', lens[0], '/', lens[-1])
