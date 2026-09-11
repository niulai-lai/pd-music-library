import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
for f in ['E:/zcode/pd-music-library/research/_ping.json', 'E:/zcode/pd-music-library/research/_ia_ping.json']:
    try:
        d = json.load(open(f, encoding='utf-8'))
        print(f, '-> OK', str(d)[:150])
    except Exception as e:
        print(f, '-> FAIL', repr(e))
