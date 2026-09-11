# -*- coding: utf-8 -*-
"""Research pass 8 (final): Great-78 gbia Chinese records + red songs + category browse."""
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

def commons_search(label, query, limit=25, kinds=('audio',)):
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
                    'license': gv('LicenseShortName'), 'desc': (gv('ImageDescription') or '')[:150]})
    print(f'--- Commons [{label}] ({len(out)}) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:350])
    time.sleep(2.5)
    return out

def subcats(cat):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers'
           '&cmtitle=' + urllib.parse.quote(cat) + '&cmtype=subcat&cmlimit=100')
    d = get_json(url)
    return [m['title'] for m in ((d.get('query') or {}).get('categorymembers') or [])]

results = {}
print('=== IA-contributed subcats ===')
try:
    subs = subcats('Category:Media contributed by the Internet Archive')
    interesting = [s for s in subs if any(k in s.lower() for k in ['78', 'audio', 'record', 'music', 'great'])]
    print(json.dumps(interesting, ensure_ascii=False, indent=1))
    results['ia_subcats'] = subs
except Exception as e:
    print('subcats ERROR', e)
time.sleep(2)

for label, q in [
    ('gbia-chinese', 'gbia chinese'),
    ('78-chinese', '78 chinese record'),
    ('78-peking', '78 peking'),
    ('78-canton', '78 canton'),
    ('march-volunteers2', '"March of the Volunteers" audio'),
    ('dongfanghong', '东方红 OR Dongfanghong OR "The East Is Red"'),
    ('chinese-78s', 'chinese 78 rpm shellac'),
]:
    results[label] = commons_search(label, q)

json.dump(results, open(OUT + 'research8.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research8.json')
