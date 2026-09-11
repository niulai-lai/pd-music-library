# -*- coding: utf-8 -*-
"""Research pass 6: full metadata for the 'scy' Chinese 78 series on Commons."""
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

def full_info(titles):
    """titles: list of File:xxx names"""
    out = []
    for i in range(0, len(titles), 5):
        batch = titles[i:i + 5]
        url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
               '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|UsageTerms|Artist|Credit|ImageDescription|DateTimeOriginal|LicenseUrl'
               '&titles=' + urllib.parse.quote('|'.join(batch)))
        d = get_json(url)
        for p in (d.get('query') or {}).get('pages', {}).values():
            ii = (p.get('imageinfo') or [{}])[0]
            em = ii.get('extmetadata') or {}
            def gv(k):
                v = em.get(k) or {}
                return (v.get('value') or '').strip()
            out.append({
                'title': p.get('title'), 'url': ii.get('url'),
                'sizeMB': round((ii.get('size') or 0) / 1e6, 2),
                'license': gv('LicenseShortName'), 'usage': gv('UsageTerms'),
                'artist': gv('Artist').replace('\n', ' ')[:160],
                'date': gv('DateTimeOriginal')[:60],
                'desc': gv('ImageDescription').replace('\n', ' ')[:600],
            })
        time.sleep(2)
    return out

def search_titles(query, limit=50):
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           '&list=search&srlimit=' + str(limit) + '&srnamespace=6&srsearch=' + urllib.parse.quote(query))
    d = get_json(url)
    return [x['title'] for x in (d.get('query') or {}).get('search', [])]

results = {}
# 1) enumerate the scy series
try:
    titles = search_titles('intitle:scy filetype:audio', 50)
    print('scy audio files found:', len(titles))
    for t in titles[:50]:
        print(' ', t)
    results['scy_titles'] = titles
except Exception as e:
    print('scy enumerate ERROR', e)
time.sleep(2)

# 2) full metadata of the known Chinese record files
known = [
    'File:Shanghainese popular song, possibly Part Three of Five, 127-127a (scy 2921-2922).mp3',
    'File:大香山 = Ta hsiang shan (Great Fragrant Mountain), Part Ten of Ten, 72-72a (scy 2829-2830).mp3',
    'File:遊龍戲鳳 = Yu lung hsi fêng (Wandering Dragon Plays with Phoenix), Part One of Twelve, 41-41a (scy 2768-2769).mp3',
    'File:Chinese flute Hulusi.wav',
]
try:
    info = full_info(known)
    results['known_info'] = info
    print('=== FULL METADATA ===')
    for o in info:
        print(json.dumps(o, ensure_ascii=False)[:900])
except Exception as e:
    print('known_info ERROR', e)

json.dump(results, open(OUT + 'research6.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research6.json')
