# -*- coding: utf-8 -*-
"""Research pass 1: query Commons & IA APIs for PD audio + score candidates."""
import json, sys, io, urllib.request, urllib.parse, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = 'E:/zcode/pd-music-library/research/'
UA = {'User-Agent': 'PDMusicLibrary/1.0 (static site research; contact: local)'}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))

def commons_search(label, query, limit=12):
    """Search Commons audio files, return candidates w/ license metadata."""
    q = urllib.parse.quote(query)
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|UsageTerms|Artist|ImageDescription|LicenseUrl'
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
        if not str(ii.get('mime', '')).startswith('audio'):
            continue
        em = ii.get('extmetadata') or {}
        def gv(k):
            v = em.get(k) or {}
            return (v.get('value') or '').strip()
        out.append({
            'title': p.get('title'),
            'url': ii.get('url'),
            'sizeMB': round((ii.get('size') or 0) / 1e6, 2),
            'license': gv('LicenseShortName'),
            'usage': gv('UsageTerms'),
            'desc': (gv('ImageDescription') or '')[:200],
        })
    print(f'--- Commons [{label}] ({len(out)} audio) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:400])
    return out

def ia_search(label, query, rows=12, extra_fl=None):
    fl = ['identifier', 'title', 'year', 'rights', 'licenseurl', 'creator', 'date', 'language', 'publisher']
    flstr = '&'.join('fl[]=' + f for f in fl + (extra_fl or []))
    url = ('https://archive.org/advancedsearch.php?q=' + urllib.parse.quote(query)
           + '&' + flstr + '&rows=' + str(rows) + '&page=1&output=json')
    try:
        d = get(url)
    except Exception as e:
        print(f'[{label}] ERROR {e}')
        return []
    docs = ((d.get('response') or {}).get('docs')) or []
    print(f'--- IA [{label}] ({len(docs)} items) ---')
    for o in docs:
        print(json.dumps(o, ensure_ascii=False)[:400])
    return docs

results = {}
print('=' * 30, 'COMMONS AUDIO', '=' * 30)
commons_queries = [
    ('beethoven-sonata', 'filetype:audio beethoven sonata historical recording'),
    ('chopin', 'filetype:audio chopin nocturne'),
    ('debussy', 'filetype:audio debussy clair de lune'),
    ('satie', 'filetype:audio satie gymnopedie'),
    ('bach', 'filetype:audio bach cello suite historical'),
    ('mozart-piano', 'filetype:audio mozart sonata fortepiano'),
    ('march-volunteers', 'filetype:audio march of the volunteers'),
    ('chinese-opera', 'filetype:audio peking opera recording'),
    ('erhu', 'filetype:audio erhu'),
    ('rachmaninoff', 'filetype:audio rachmaninoff recording'),
]
for label, q in commons_queries:
    results['commons:' + label] = commons_search(label, q)
    time.sleep(0.4)

print('=' * 30, 'IA ITEMS', '=' * 30)
ia_queries = [
    ('musopen', 'collection:musopen AND mediatype:audio'),
    ('musopen2', 'musopen beethoven'),
    ('georgeblood-chinese', 'collection:georgeblood AND language:chinese'),
    ('great78-chinese', 'collection:great78 AND chinese'),
    ('peking-opera-78', '78rpm peking opera'),
    ('china-78rpm', 'collection:(georgeblood OR great78) AND title:(pekin* OR chinese OR shanghai)'),
]
for label, q in ia_queries:
    results['ia:' + label] = ia_search(label, q)
    time.sleep(0.4)

json.dump(results, open(OUT + 'research1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research1.json')
