# -*- coding: utf-8 -*-
"""Research pass 5: Chinese instruments via Chinese keywords + OMA audio links."""
import json, sys, io, subprocess, urllib.request, urllib.parse, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
OUT = 'E:/zcode/pd-music-library/research/'
UA = {'User-Agent': 'PDMusicLibrary/1.0 (static site research; contact: local)'}

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:
                print('  429, waiting 25s...')
                time.sleep(25)
                continue
            raise
    raise RuntimeError('unreachable')

def get_json(url, tries=3):
    return json.loads(get(url, tries).decode('utf-8'))

def commons_search(label, query, limit=10, kinds=('audio',)):
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
                    'license': gv('LicenseShortName'), 'desc': (gv('ImageDescription') or '')[:200]})
    print(f'--- Commons [{label}] ({len(out)}) ---')
    for o in out:
        print(json.dumps(o, ensure_ascii=False)[:380])
    time.sleep(2.5)
    return out

results = {}
for label, q in [
    ('abing', 'filetype:audio 阿炳 OR 二泉映月'),
    ('chunjiang', 'filetype:audio 春江花月夜'),
    ('guqin-cn', 'filetype:audio 古琴'),
    ('meilanfang', 'filetype:audio 梅兰芳'),
    ('jingju-cn', 'filetype:audio 京剧'),
    ('caiyun', 'filetype:audio 彩云追月'),
    ('yuzhou', 'filetype:audio 渔舟唱晚'),
    ('chinese-trad-audio', 'filetype:audio chinese traditional music'),
    ('jiangnan-sizhu', 'filetype:audio jiangnan sizhu'),
]:
    results[label] = commons_search(label, q)

print('===== Open Music Archive audio links =====')
try:
    html = get('https://openmusicarchive.org/').decode('utf-8', errors='replace')
    import re
    links = re.findall(r'href="([^"]*\.(?:mp3|ogg|wav))"', html, re.I)
    print('homepage audio links:', links[:20])
    # find artist/track pages
    pages = re.findall(r'href="([^"]*(?:artist|track|music)[^"]*)"', html, re.I)
    print('pages:', list(dict.fromkeys(pages))[:20])
except Exception as e:
    print('OMA ERROR', e)

json.dump(results, open(OUT + 'research5.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('SAVED research5.json')
