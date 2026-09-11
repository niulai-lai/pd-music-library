# -*- coding: utf-8 -*-
"""从 music.json 提取搜索字段汉字（标题/作者/表演者/标签/流派/乐器/年代），输出缺字清单。"""
import json, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ROOT = 'E:/zcode/pd-music-library'
data = json.load(open(f'{ROOT}/data/music.json', encoding='utf-8'))

chars = set()
def collect(s):
    if isinstance(s, str):
        for ch in s:
            if '\u4e00' <= ch <= '\u9fff':
                chars.add(ch)

for t in data['tracks']:
    for k in ['title', 'titleEn', 'composer', 'performer', 'era', 'category', 'instrument', 'genre']:
        collect(t.get(k, ''))
    for tag in t.get('tags', []): collect(tag)
for a in data['albums']:
    collect(a.get('title', ''))
# 常见搜索词与场景词
collect('纪录片有声书白噪音视频剪辑直播怀旧氛围贝多芬莫扎特肖邦音乐钢琴二胡古筝琵琶京剧民歌')

# 基础映射：已确认字符
P = {
'公':'gong','有':'you','域':'yu','音':'yin','乐':'yue','图':'tu','书':'shu','馆':'guan',
'首':'shou','页':'ye','分':'fen','类':'lei','浏':'liu','览':'lan','场':'chang','景':'jing',
'资':'zi','源':'yuan','纪':'ji','录':'lu','片':'pian','白':'bai','噪':'zao','视':'shi','频':'pin',
'剪':'jian','辑':'ji','习':'xi','直':'zhi','播':'bo','怀':'huai','旧':'jiu','氛':'fen','围':'wei',
'古':'gu','典':'dian','民':'min','国':'guo','老':'lao','唱':'chang','戏':'xi','曲':'qu','红':'hong',
'色':'se','间':'jian','谱':'pu','库':'ku','贝':'bei','多':'duo','芬':'fen','莫':'mo','扎':'zha',
'特':'te','肖':'xiao','邦':'bang','萨':'sa','蒂':'di','德':'de','彪':'biao','西':'xi','格':'ge',
'里':'li','斯':'si','美':'mei','塔':'ta','那':'na','柴':'chai','可':'ke','夫':'fu','基':'ji',
'帕':'pa','赫':'he','柏':'bai','尔':'er','伊':'yi','降':'jiang','升':'sheng','调':'diao',
'小':'xiao','大':'da','第':'di','号':'hao','交':'jiao','响':'xiang','前':'qian','奏':'zou',
'咏':'yong','叹':'tan','组':'zu','幕':'mu','进':'jin','行':'xing','钢':'gang','琴':'qin',
'管':'guan','弦':'xian','长':'chang','笛':'di','铜':'tong','吉':'ji','他':'ta','二':'er',
'胡':'hu','古2':'gu','筝':'zheng','琵':'pi','琶':'pa','京':'jing','剧':'ju','歌':'ge',
'超':'chao','序':'xu','卡':'ka','农':'nong','午':'wu','夜':'ye','晨':'chen','山':'shan',
'魔':'mo','王':'wang','宫':'gong','殿':'dian','沃':'wo','瓦':'wa','河':'he','我':'wo',
'祖':'zu','培':'pei','金':'jin','裸':'luo','体':'ti','舞':'wu',
'卵':'luan','石':'shi','足':'zu','艺':'yi','五':'wu','族':'zu','共':'gong','和':'he',
'卿':'qing','云':'yun','雄':'xiong','立':'li','宇':'yu','宙':'zhou','严':'yan','复':'fu',
'溥':'pu','侗':'dong','巩':'gong','瓯':'ou','工':'gong','尺':'che','聂':'nie','耳':'er2',
'冼':'xian','星':'xing','海2':'hai','田':'tian','汉':'han','张':'zhang','寒':'han2','晖':'hui',
'麦':'mai','黎':'li','锦':'jin','陈':'chen','歌2':'ge','辛':'xin','词':'ci','曲2':'qu2',
'原':'yuan','版':'ban','图2':'tu2','档':'dang','案':'an','无':'wu','声':'sheng',
'元':'yuan2','帅':'shuai','进行':'jinxing','史':'shi','诗':'shi','最':'zui','早':'zao',
'女':'nv','班':'ban','戏2':'xi2','班2':'ban','少':'shao','女2':'nv','团':'tuan',
'合':'he','演':'yan','双':'shuang','机':'ji','时':'shi2','同':'tong','录2':'lu2',
'制':'zhi','乐':'yue2','队':'dui','满':'man','编':'bian','完':'wan','整':'zheng',
'锣':'luo','鼓':'gu','丝':'si','弦2':'xian','相':'xiang','和2':'he2','市':'shi',
'井':'jing','流2':'liu','行2':'xing','残':'can','段':'duan','时调':'shidiao',
'考':'kao','证2':'zheng','待':'dai','佚':'yi','名':'ming','同2':'tong','统':'tong',
'传':'chuan','整2':'zheng','理':'li','不':'bu','详':'xiang','当':'dang','代':'dai',
'南':'nan','昂':'ang','彝':'yi','汉2':'han','共2':'gong2','雾':'wu','零':'ling',
'奉':'feng','献':'xian','口':'kou','耳2':'er','相2':'xiang2','玛':'ma','格2':'ge',
'丽':'li','莲':'lian','亨':'heng','威':'wei','廉':'lian','巴':'ba','罗':'luo',
'记':'ji2','月':'yue','楽':'le','刊':'kan','本':'ben2','中':'zhong','新':'xin2',
'六':'liu','约':'yue2','克':'ke2','选2':'xuan2','春':'chun','秋':'qiu','冬':'dong',
'夏':'xia','雪':'xue','风':'feng','花':'hua','草':'cao','浪':'lang','漫':'man',
'主':'zhu','义2':'yi','现':'xian2','代2':'dai2','近':'jin2','印':'yin2','象':'xiang2',
'巴2':'ba','洛':'luo','克2':'ke','岁':'sui','月2':'yue2','国立':'guoli',
'英':'ying','伦':'lun','敦':'dun','费':'fei','城':'cheng','捷':'jie','克3':'ke',
'斯2':'si','美2':'mei','塔3':'ta','那2':'na','挪':'nuo','威2':'wei','拿':'na2',
'波':'bo','希':'xi','米':'mi','亚':'ya','捷2':'jie','意':'yi','大':'da2','利':'li2',
'奥':'ao','地':'di2','利3':'li','俄':'e2','罗2':'luo','俄罗斯':'eluosi',
'皮':'pi','黄':'huang','腔':'qiang','乱':'luan','弹2':'tan','梆':'bang','昆':'kun',
'越':'yue2','粤':'yue3','评':'ping','弹3':'tan2','鼓2':'gu2','相3':'xiang3',
'声2':'sheng2','快3':'kuai','板':'ban','时3':'shi3','调2':'diao2','香2':'xiang2',
'港':'gang','台2':'tai','湾':'wan','福':'fu','建':'jian','川':'chuan','陕':'shan',
'蒙':'meng','维':'wei2','吾':'wu2','苗':'miao','瑶':'yao','壮':'zhuang','傣':'dai',
'茶':'cha','叶2':'ye','兴':'xing2','教':'jiao','堂':'tang','堂2':'tang','寺':'si',
'庙':'miao','观':'guan2','音2':'yin2','弥':'mi2','勒':'le2','佛':'fo','诵':'song2',
'经2':'jing2','咒':'zhou','梵':'fan','呗':'bai2','唱2':'chang2','赞':'zan2',
'呗2':'bai3','音3':'yin3','乐3':'yue3','唐':'tang2','朝':'chao','宋':'song2',
'元2':'yuan3','明':'ming','清':'qing2','宣':'xuan2','统':'tong2','光':'guang2',
'绪':'xu','光2':'guang','绪2':'xu2','咸':'xian2','丰':'feng2','同3':'tong3',
'治':'zhi2','顺':'shun','康':'kang','熙':'xi2','乾':'qian2','隆':'long2',
}
# 数据集全部搜索字段用字补齐
P.update({
'一':'yi','三':'san','上':'shang','与':'yu','为':'wei','义':'yi','之':'zhi','争':'zheng','亡':'wang',
'人':'ren','什':'shi','优':'you','伴':'ban','作':'zuo','兰':'lan','内':'nei','军':'jun','冥':'ming',
'凤':'feng','凯':'kai','列':'lie','加':'jia','勇':'yong','十':'shi','历':'li','厚':'hou','后':'hou',
'命':'ming','品':'pin','喜':'xi','器':'qi','四':'si','因':'yin','在':'zai','夹':'jia','婚':'hun',
'子':'zi','安':'an','室':'shi','家':'jia','尼':'ni','布':'bu','帧':'zhen','平':'ping','年':'nian',
'弘':'hong','强':'qiang','循':'xun','快':'kuai','思':'si','性':'xing','恢':'hui','悠':'you',
'悲':'bei','想':'xiang','战':'zhan','手':'shou','托':'tuo','抄':'chao','抗':'kang','拉':'la',
'指':'zhi','挥':'hui','提':'ti','救':'jiu','斗':'dou','旁':'pang','旋':'xuan','末':'mo',
'条':'tiao','柔':'rou','桃':'tao','桌':'zhuo','梅':'mei','梦':'meng','步':'bu','江':'jiang',
'沉':'chen','派':'pai','流':'liu','海':'hai','渐':'jian','游':'you','滴':'di','牧':'mu',
'独':'du','环':'huan','百':'bai','的':'de','目':'mu','礼':'li','神':'shen','科':'ke','秘':'mi',
'稳':'wen','稿':'gao','空':'kong','章':'zhang','等':'deng','策':'ce','纽':'niu','线':'xian',
'缓':'huan','者':'zhe','耶':'ye','舒':'shu','艾':'ai','芦':'lu','茉':'mo','莉':'li','莱':'lai',
'葫':'hu','袁':'yuan','诺':'nuo','转':'zhuan','运':'yun','远':'yuan','迪':'di','选':'xuan',
'道':'dao','遗':'yi','部':'bu','重':'zhong','阿':'a','雅':'ya','雨':'yu','静':'jing','顾':'gu',
'颂':'song','题':'ti','飞':'fei','香':'xiang','鸣':'ming','鹤':'he','龙':'long',
})

missing = sorted(c for c in chars if c not in P)
print('unique chars (search fields):', len(chars))
if missing:
    print('count missing:', len(missing))
    print('missing:', ''.join(missing))
else:
    # 生成 pinyin.js
    items = ',\n    '.join(f"'{c}':'{p}'" for c, p in sorted(P.items()) if len(c) == 1 and c in chars)
    js = f"""/* =========================================================
 * pinyin.js — 拼音检索支持
 * 字典由 research/gen-pinyin.py 从 data/music.json 自动生成，
 * 覆盖馆藏全部搜索字段用字；导入新数据含生僻字时按同样格式补充。
 * 命名空间：window.PY
 * ========================================================= */
(function () {{
  'use strict';

  const DICT = {{
    {items}
  }};

  const cache = Object.create(null);

  /* 单字转拼音；字典未收录返回 '' */
  const PY_char = function (ch) {{
    if (cache[ch] !== undefined) return cache[ch];
    const p = DICT[ch] || '';
    cache[ch] = p;
    return p;
  }};

  /* 字符串转拼音串（忽略非汉字） */
  const PY_of = function (str) {{
    let out = '';
    for (const ch of String(str || '')) out += PY_char(ch);
    return out.toLowerCase();
  }};

  /* 字符串转拼音首字母串 */
  const PY_initials = function (str) {{
    let out = '';
    for (const ch of String(str || '')) {{
      const p = PY_char(ch);
      out += p ? p[0] : '';
    }}
    return out.toLowerCase();
  }};

  window.PY = {{
    char: PY_char,
    of: PY_of,
    initials: PY_initials,
    hasHan: str => /[\\u4e00-\\u9fff]/.test(String(str || ''))
  }};
}})();
"""
    with open(f'{ROOT}/assets/js/pinyin.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print('pinyin.js written with', sum(1 for c in chars), '+chars dict entries:', sum(1 for c,p in P.items() if len(c)==1))
