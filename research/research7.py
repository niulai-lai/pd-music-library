# -*- coding: utf-8 -*-
"""Research pass 7: more Laufer recordings + classical staples + score scans."""
import json, sys, io, urllib.request, urllib.parse, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = 'E:/zcode/pd-music-library/research/'
UA = {'User-Agent': 'PDMusicLibrary/1.0 (static site research; contact: local)'}

def get_json(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.loads(r.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                print('  429, waiting 25s...')
                time.sleep(25)
                continue
            raise
    raise RuntimeError('unreachable')

def commons_search(label, query, limit=25, kinds=('audio', 'image')):
    q = urllib.parse.quote(query)
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|UsageTerms|Artist|ImageDescription|DateTimeOriginal'
           '&generator=search&gsrsearch=' + q + '&gsrlimit=' + str(limit) + '&gsrnamespace=6')
    try:
        d = get_json(url)
    except Exception as e:
        print(f'[{label}] ERROR {e}')
        return []
    pages = (d.get('query') or {}).get('pages') or {}
    out = []
    for p in pages.values():
        ii = (p.get('imageinfo') or [{}])[0]
        mime = str(ii.get('mime', ''))
        if not any(mime.startswith(k) for k in kinds):
            continue
        em = ii.get('extmetadata') or {}
        def gv(k):
            v = em.get(k) or {}
            return (v.get('value') or '').strip()
        out.append({'title': p.get('title'), 'url': ii.get('url'), 'mime': mime,
                    'sizeMB': round((ii.get('size') or 0) / 1e6, 2),
                    'license': gv('LicenseShortName'), 'desc': (gv('ImageDescription') or '')[:160]})
    print(f'--- Commons [{label}] ({len(out)}) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:360])
    time.sleep(2.5)
    return out

results = {}
for label, q in [
    ('laufer', 'filetype:audio Laufer'),
    ('schiff-exp', 'filetype:audio Schiff expedition chinese'),
    ('vivaldi-spring', 'filetype:audio Vivaldi Spring (Musopen)'),
    ('furelise', 'filetype:audio Fur Elise'),
    ('turkish-march', 'filetype:audio Rondo alla turca'),
    ('bach-air', 'filetype:audio Bach Air'),
    ('pachelbel', 'filetype:audio Pachelbel canon'),
    ('chopin-prelude', 'filetype:audio Chopin prelude (Musopen)'),
    ('beethoven-fifth-musopen', 'filetype:audio Beethoven symphony (Musopen)'),
    ('moonlight-score', 'moonlight sonata first edition score'),
    ('chopin-score-scan', 'chopin nocturne op 9 score scan'),
    ('bach-cello-score', 'bach cello suite manuscript scan'),
]:
    results[label] = commons_search(label, q)

json.dump(results, open(OUT + 'research7.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research7.json')
