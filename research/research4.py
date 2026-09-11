# -*- coding: utf-8 -*-
"""Research pass 4: PDP-CH Chinese 78s, red songs, folk; test FMA/OMA reachability."""
import json, sys, io, subprocess, urllib.request, urllib.parse, time

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

def head_ok(url):
    r = subprocess.run(['curl', '-s', '-I', '-m', '20', '-A', 'Mozilla/5.0', url],
                       capture_output=True)
    out = r.stdout.decode('utf-8', errors='replace')
    code = out.split('\n')[0].strip() if out else 'NO RESPONSE'
    allow = [l for l in out.split('\n') if 'access-control-allow-origin' in l.lower()]
    return code, (allow[0].strip() if allow else '')

def commons_search(label, query, limit=10, kinds=('audio',)):
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
                    'license': gv('LicenseShortName'), 'desc': (gv('ImageDescription') or '')[:200]})
    print(f'--- Commons [{label}] ({len(out)}) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:380])
    time.sleep(2.5)
    return out

print('===== reachability =====')
for site in ['https://freemusicarchive.org/', 'https://files.freemusicarchive.org/',
             'https://openmusicarchive.org/', 'https://musopen.org/']:
    print(site, head_ok(site))

results = {}
queries = [
    ('intitle-chinese', 'intitle:chinese filetype:audio'),
    ('pdp-odeon', 'PDP-CH Odeon'),
    ('pdp-pathe', 'PDP-CH Pathe'),
    ('cantonese', 'filetype:audio cantonese'),
    ('east-red', 'filetype:audio "east is red"'),
    ('chinese-folk', 'filetype:audio chinese folk song'),
    ('kunqu', 'filetype:audio kunqu'),
    ('erhu-classic', 'filetype:audio erhu traditional'),
    ('guqin', 'filetype:audio guqin'),
    ('zheng', 'filetype:audio guzheng'),
]
for label, q in queries:
    results[label] = commons_search(label, q)

json.dump(results, open(OUT + 'research4.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research4.json')
