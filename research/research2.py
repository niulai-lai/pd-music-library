# -*- coding: utf-8 -*-
"""Research pass 2: IA via curl subprocess + more Commons queries."""
import json, sys, io, subprocess, urllib.request, urllib.parse, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = 'E:/zcode/pd-music-library/research/'
UA = {'User-Agent': 'PDMusicLibrary/1.0 (static site research; contact: local)'}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode('utf-8'))

def curl_get(url):
    r = subprocess.run(['curl', '-s', '-m', '40', '-A', 'Mozilla/5.0 (research)', url],
                       capture_output=True)
    return json.loads(r.stdout.decode('utf-8', errors='replace'))

def commons_search(label, query, limit=12):
    q = urllib.parse.quote(query)
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|UsageTerms|Artist|ImageDescription|LicenseUrl|DateTimeOriginal'
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
        if not (mime.startswith('audio') or mime.startswith('image')):
            continue
        em = ii.get('extmetadata') or {}
        def gv(k):
            v = em.get(k) or {}
            return (v.get('value') or '').strip()
        out.append({
            'title': p.get('title'), 'url': ii.get('url'), 'mime': mime,
            'sizeMB': round((ii.get('size') or 0) / 1e6, 2),
            'license': gv('LicenseShortName'), 'usage': gv('UsageTerms'),
            'desc': (gv('ImageDescription') or '')[:250],
        })
    print(f'--- Commons [{label}] ({len(out)}) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:420])
    return out

def ia_search(label, query, rows=12):
    fl = ['identifier', 'title', 'year', 'rights', 'licenseurl', 'creator', 'date', 'language', 'publisher', 'collection']
    flstr = '&'.join('fl[]=' + f for f in fl)
    url = ('https://archive.org/advancedsearch.php?q=' + urllib.parse.quote(query)
           + '&' + flstr + '&rows=' + str(rows) + '&page=1&output=json')
    try:
        d = curl_get(url)
    except Exception as e:
        print(f'[{label}] ERROR {e}')
        return []
    docs = ((d.get('response') or {}).get('docs')) or []
    print(f'--- IA [{label}] ({len(docs)} items) ---')
    for o in docs:
        print(json.dumps(o, ensure_ascii=False)[:420])
    return docs

results = {}
for label, q in [
    ('musopen-commons', 'filetype:audio musopen'),
    ('vivaldi', 'filetype:audio vivaldi four seasons'),
    ('bach-organ', 'filetype:audio bach organ'),
    ('beethoven-symphony', 'filetype:audio beethoven symphony allegro'),
    ('schubert', 'filetype:audio schubert impromptu'),
    ('grieg', 'filetype:audio grieg Peer Gynt'),
    ('tchaikovsky', 'filetype:audio tchaikovsky Nutcracker'),
    ('beethoven-moonlight-score', 'beethoven sonata quasi una fantasia first edition filetype:bitmap'),
    ('chopin-nocturne-score', 'chopin nocturne op 9 first edition filetype:bitmap'),
    ('gongche', 'gongche notation filetype:bitmap'),
    ('chinese-old-score', 'chinese music score 19th century filetype:bitmap'),
    ('jingju-78', 'filetype:audio beijing opera'),
    ('chinese-78', 'filetype:audio chinese 78 rpm'),
    ('chinese-orchestra', 'filetype:audio chinese traditional instrumental'),
]:
    results['commons:' + label] = commons_search(label, q)
    time.sleep(0.3)

for label, q in [
    ('musopen', 'collection:musopen AND mediatype:audio'),
    ('georgeblood-chinese', 'collection:georgeblood AND language:chinese'),
    ('great78-chinese', 'collection:great78 AND language:chinese'),
    ('peking', 'collection:(georgeblood OR great78) AND title:(peking OR pekin)'),
]:
    results['ia:' + label] = ia_search(label, q)
    time.sleep(0.5)

json.dump(results, open(OUT + 'research2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research2.json')
