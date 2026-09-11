# -*- coding: utf-8 -*-
"""Research pass 3: Chinese records & red songs on Commons, with anti-429 pacing."""
import json, sys, io, urllib.request, urllib.parse, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = 'E:/zcode/pd-music-library/research/'
UA = {'User-Agent': 'PDMusicLibrary/1.0 (static site research; contact: local)'}

def get(url, tries=3):
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

def commons_search(label, query, limit=10, kinds=('audio', 'image')):
    q = urllib.parse.quote(query)
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|UsageTerms|Artist|ImageDescription|DateTimeOriginal'
           '&generator=search&gsrsearch=' + q + '&gsrlimit=' + str(limit) + '&gsrnamespace=6')
    try:
        d = get(url)
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
                    'license': gv('LicenseShortName'), 'desc': (gv('ImageDescription') or '')[:220]})
    print(f'--- Commons [{label}] ({len(out)}) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:430])
    time.sleep(3)
    return out

results = {}
queries = [
    ('pdp-ch-china', 'PDP-CH china'),
    ('pdp-ch-chinese', 'PDP-CH chinese'),
    ('peking-78', 'Peking 78rpm'),
    ('volunteers', 'intitle:"March of the Volunteers"'),
    ('yiyongjun', '义勇军'),
    ('jasmine', 'filetype:audio jasmine flower chinese'),
    ('moli', 'Mo Li Hua'),
    ('chinese-anthem', 'filetype:audio chinese anthem historical'),
    ('guofeng', '国歌'),
    ('beethoven-op27-score', 'Beethoven Sonata quasi fantasia op 27 score'),
    ('mozart-40-score', 'Mozart Symphony 40 manuscript score'),
    ('lute-old-china', 'filetype:audio pipa OR guqin chinese'),
    ('shanghai-old', 'Shanghai 78 rpm record'),
]
for label, q in queries:
    results[label] = commons_search(label, q)

json.dump(results, open(OUT + 'research3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research3.json')
