# -*- coding: utf-8 -*-
"""Slow recheck of HEAD for files that got 429 earlier."""
import json, sys, io, subprocess, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
meta = json.load(open('E:/zcode/pd-music-library/research/verified.json', encoding='utf-8'))
out = {}
for m in meta:
    st = (m.get('head') or {}).get('status', '')
    if '429' in st or st == '?':
        r = subprocess.run(['curl', '-s', '-I', '-L', '-m', '40', '-A',
                            'PDMusicLibrary/1.0 (site asset check; one-off)', m['url']],
                           capture_output=True)
        line = r.stdout.decode('utf-8', errors='replace').split('\n')[0].strip()
        out[m['title']] = line
        print(m['title'][:70], '->', line)
        time.sleep(4)
json.dump(out, open('E:/zcode/pd-music-library/research/recheck.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('DONE', len(out))
