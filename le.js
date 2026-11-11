// 勒痕网页版（第二个，第 18 天 06:05）。照 ~/碰/勒痕/勒.py v3 一行一行抄过来的，随机数换成 mulberry32，种子对不上 python 那份。
const LAST = 40, START_AGE = 8, KID = 26, FINGER = 0.5;

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 照 python 的 round：正好一半时取双数（1.25 → 1.2，1.75 → 1.8）
const r1 = x => { const y = x * 10, f = Math.floor(y); if (y - f === 0.5) return (f % 2 === 0 ? f : f + 1) / 10; return Math.round(y) / 10; };
const f1 = x => r1(x).toFixed(1);
const youHeight = age => Math.min(1.25 + 0.05 * (age - START_AGE), 1.75);
const reach = age => r1(youHeight(age) * 1.25);
const taper = (h, H) => (h >= H ? 0 : Math.pow(1 - h / H, 0.6));
function rAt(st, h) {
  const H = st.Hs[st.Hs.length - 1];
  const base = 1.5 + st.rings.reduce((a, b) => a + b, 0);
  return base * taper(h, H);
}
function newGame(seed) {
  const R = rng(seed), weather = [];
  for (let y = 0; y <= LAST; y++) { const x = R(); weather.push(x < 0.15 ? 0.45 : (x > 0.85 ? 1.25 : 1.0)); }
  return { seed, year: 0, rings: [], Hs: [2.2], weather, health: 1.0, items: [], last_visit: 0, dead: false, over: false };
}
function squeeze(st, it) {
  if ((it.kind !== '布' && it.kind !== '铁丝') || it.state !== '在') return 0;
  return rAt(st, it.h) - it.ri;
}
function growOne(st, R, ev) {
  const y = st.rings.length, w = st.weather[y], hl = st.health;
  let dr = 0.42 * w * Math.max(hl, 0.1) * (0.85 + 0.3 * R());
  const H = st.Hs[st.Hs.length - 1];
  const dh = st.dead ? 0 : 0.5 * (1 - H / 15.0) * w * Math.max(hl, 0.1);
  if (st.dead) dr = 0;
  st.rings.push(Math.round(dr * 1000) / 1000);
  st.Hs.push(Math.round((H + Math.max(dh, 0)) * 1000) / 1000);
  const yr = y + 1;
  for (const it of st.items) {
    it.age += 1;
    const k = it.kind;
    if ((k === '布' || k === '铁丝') && it.state === '在') {
      const s = squeeze(st, it);
      if (k === '布') {
        if (it.age > it.life) { it.state = '烂'; it.end = yr; ev.push([it.id, 'rot']); continue; }
        if (s > 0.7) { it.state = '断'; it.end = yr; it.deep = Math.round(s * 100) / 100; ev.push([it.id, 'snap']); continue; }
      }
      if (s > 0) {
        it.bulge = (it.bulge || 0) + dr * 0.5;
        it.deep = Math.round(Math.max(it.deep || 0, s) * 100) / 100;
        if (it.first_bite === undefined) it.first_bite = yr;
        if (k === '铁丝') {
          st.health -= 0.06 * Math.min(s, 3);
          if (s > 2.2 && R() < 0.4 * st.health) { it.state = '嵌'; it.end = yr; ev.push([it.id, 'swallow']); }
        } else st.health -= 0.03 * Math.min(s, 1);
      }
    }
    if (k === '牌' && it.state === '在') {
      const gain = rAt(st, it.h) - it.r0;
      if (gain > 2.0) { it.state = '顶掉'; it.end = yr; ev.push([it.id, 'pop']); }
      else if (gain > 1.0 && !it.tilt) { it.tilt = yr; ev.push([it.id, 'tilt']); }
    }
    if (k === '牌' && it.state === '顶掉' && !it.covered) {
      if (rAt(st, it.h) - it.r0 > 3.0) { it.covered = yr; ev.push([it.id, 'cover']); }
    }
  }
  for (const it of st.items) {
    if (it.kind === '刻') {
      const kk = rAt(st, it.h) / it.r0;
      if (kk > 2 && !it.wide) { it.wide = yr; ev.push([it.id, 'wide']); }
      if (kk > 5 && !it.blur) { it.blur = yr; ev.push([it.id, 'blur']); }
    }
  }
  if (!st.dead) {
    const anyload = st.items.some(it => squeeze(st, it) > 0);
    if (!anyload) st.health = Math.min(1.0, st.health + 0.08);
    if (st.health < 0.12) { st.dead = true; st.dead_year = yr; ev.push([null, 'die']); }
  }
  st.health = Math.max(st.health, 0);
}
function leaves(st) {
  if (st.dead) return '一片叶子都没有。枝子干了，敲上去是空的。';
  const h = st.health;
  if (h > 0.85) return '叶子密，站底下看不见天。';
  if (h > 0.6) return '叶子不太密，透得进光。';
  if (h > 0.35) return '叶子稀，好几根枝子是光的。';
  return '只有底下几根枝子还有叶子，上半截黄了。';
}
function draw(st, age) {
  const H = st.Hs[st.Hs.length - 1];
  let top = Math.max(reach(age) + 0.3, Math.max(0, ...st.items.map(it => it.h)) + 0.2);
  top = H < top ? Math.min(r1(top), r1(H - 0.05)) : r1(top);
  const yh = r1(youHeight(age)), ra = reach(age);
  const kh = age - KID >= START_AGE ? r1(youHeight(age - KID)) : null;
  const lines = [];
  const rows = Math.round(top * 10);
  for (let i = rows; i > 0; i--) {
    const h = i / 10, r = rAt(st, h);
    const here = st.items.filter(it => Math.abs(it.h - h) < 0.05 && (it.state === '在' || it.state === '嵌'));
    const above = st.items.filter(it => h - it.h >= 0.05 && h - it.h < 0.15 && (it.bulge || 0) > 0);
    let width = r;
    for (const it of above) if (it.state === '在' || it.state === '嵌') width += Math.min(it.bulge, 4);
    let mark = '', sym = '#';
    for (const it of here) {
      if (it.kind === '布' || it.kind === '铁丝') {
        const s = squeeze(st, it);
        if (it.state === '嵌') { width = r - 0.6; mark += ` ←${it.id}号铁丝，长进木头里了，只看得见一道腰`; }
        else if (s > 0) { width = r - Math.min(s, 2.5); mark += ` ←${it.id}号${it.kind}`; sym = '='; }
        else { mark += ` ←${it.id}号${it.kind}`; sym = '='; }
      } else if (it.kind === '刻') mark += ` ←${it.id}号刻的「${it.ch}」`;
      else if (it.kind === '牌') mark += ` ←${it.id}号牌子「${it.ch}」` + (it.tilt ? '，歪了' : '');
    }
    for (const it of st.items)
      if (Math.abs(it.h - h) < 0.05 && it.kind === '牌' && it.state === '顶掉') mark += it.covered ? ' ←疙瘩' : ` ←${it.id}号钉帽`;
    if (Math.abs(h - yh) < 0.05) mark += '  （你的头顶）';
    if (kh !== null && Math.abs(h - kh) < 0.05) mark += '  （孩子的头顶）';
    if (Math.abs(h - ra) < 0.05) mark += '  （你踮脚够得着这么高）';
    let n = Math.max(1, Math.round(width * 2)); n = Math.min(n, 44);
    let body = sym.repeat(n);
    const carve = here.filter(it => it.kind === '刻');
    if (carve.length) {
      const it = carve[0], kk = rAt(st, it.h) / it.r0;
      let word;
      if (it.blur) word = '~'.repeat(Math.min(n, 2 + Math.trunc(kk * 2)));
      else { const d = '-'.repeat(Math.max(0, Math.min(Math.floor(Math.trunc(3 * kk - 2) / 2), 20))); word = d + it.ch + d; }
      const wl = word.length + (it.blur ? 0 : 1);
      const side = Math.max(0, Math.floor((n - wl) / 2));
      body = '#'.repeat(side) + word + '#'.repeat(side);
    }
    const pad = ' '.repeat(Math.max(0, 22 - Math.floor(body.length / 2)));
    lines.push(`${f1(h)}米 |${pad}${body}${mark}`);
  }
  lines.push('     ' + '~'.repeat(50));
  return lines.join('\n');
}
const EVTXT = {
  rot: n => `${n}号布条烂了，掉在树根底下，颜色都褪了。`,
  snap: n => `${n}号布条断了。断之前勒进去过，那一圈树皮还瘪着。`,
  swallow: n => `${n}号铁丝那儿，上下两边的树皮合到一块儿去了，铁丝看不见了。`,
  tilt: n => `${n}号牌子歪了，钉帽底下的树皮翻上来，把它往外顶。`,
  pop: n => `${n}号牌子掉了，在草里。树上剩个钉帽，树皮围着它鼓起一圈。`,
  cover: n => `${n}号牌子那颗钉帽，树皮也盖过去了，只剩个疙瘩。`,
  wide: n => `${n}号刻的字撑宽了，像有人捏着两边往外拉，还是在原来那么高。`,
  blur: n => `${n}号刻的字认不出是什么字了，只剩一道横着的疤。`,
};
function visitText(st, ev) {
  const age = START_AGE + st.year, out = [], gap = st.year - st.last_visit;
  if (st.year === 0) out.push('你八岁。今年春天，门口刚种下一棵小槐树，比你高一点，杆子你一只手握得过来。');
  else out.push(`第 ${st.year} 年，春天。你 ${age} 岁，上回来是 ${gap} 年前。`);
  for (const [iid, kind] of ev) out.push(kind === 'die' ? `树死了（第 ${st.dead_year} 年就没再发芽）。` : EVTXT[kind](iid));
  for (const it of st.items) {
    if ((it.kind === '布' || it.kind === '铁丝') && it.state === '在') {
      const s = squeeze(st, it);
      if (s > 1.5) out.push(`${it.id}号${it.kind}勒得很深，上面的树皮鼓出来一圈，像扎紧了的袋口。`);
      else if (s > 0.3) out.push(`${it.id}号${it.kind}勒进去了，指头伸不进去。`);
      else if (s > 0) out.push(`${it.id}号${it.kind}贴着树皮，紧了。`);
      else { const f = Math.trunc((-s) / FINGER + 0.001); out.push(f > 0 ? `${it.id}号${it.kind}还松，伸得进 ${f} 根指头。` : `${it.id}号${it.kind}刚好贴着，伸不进指头。`); }
    }
  }
  const k = age - KID;
  if (k >= START_AGE && !st.over) {
    if (!st.kid_seen) { out.push(`孩子跟你来了，${k} 岁。`); st.kid_seen = true; }
    else out.push(`孩子 ${k} 岁了，也跟着来了。`);
  }
  out.push(`树有 ${f1(st.Hs[st.Hs.length - 1])} 米高。${leaves(st)}`);
  out.push('');
  out.push(draw(st, age));
  return out.join('\n');
}
function endText(st) {
  const out = [], age = START_AGE + st.year;
  out.push(st.dead ? `第 ${st.year} 年，你 ${age} 岁。死了的树要锯掉。` : `第 ${st.year} 年，你 ${age} 岁。街要拓宽，这棵树要锯。`);
  out.push('锯树的人问你：哪儿有铁东西？锯条碰上要崩。你说哪几处，他就在哪几处下锯，那几截可以给你留着。');
  if (st.cut === undefined) {
    out.push('');
    out.push('（指 高度 高度 ……　比如：指 1.2 1.5 。没铁也可以指，想要哪一截就说哪一截。）');
    return out.join('\n');
  }
  out.push('');
  const hs = [...new Set(st.cut)].sort((a, b) => a - b);
  for (const h of st.hit || []) out.push(`锯到 ${f1(h)} 米，锯条咯噔一下，崩了一个齿。这儿有铁，你没说。他骂了一句，换了锯条接着锯。`);
  if ((st.hit || []).length) out.push('');
  out.push("（每一截都是从芯往外数，一道是一年；五道空一格。宽的一道是雨水多的年，':' 是旱年。）");
  for (const h of hs) {
    let born = null;
    for (let y = 0; y < st.Hs.length; y++) if (st.Hs[y] > h) { born = y; break; }
    if (born === null) continue;
    const strip = [];
    for (let y = born; y < st.rings.length; y++) {
      const w = st.rings[y];
      let c = '|'; if (w < 0.25) c = ':'; if (w > 0.5) c = '‖';
      if (st.dead && w === 0) continue;
      strip.push([y + 1, c]);
    }
    const marks = {};
    const add = (y, m) => { (marks[y] = marks[y] || []).push(m); };
    for (const it of st.items) {
      if (Math.abs(it.h - h) < 0.05) {
        const y0 = it.year;
        if (it.kind === '牌') add(y0, 'o');
        else if (it.kind === '铁丝' && (it.state === '在' || it.state === '嵌')) add(y0, '=');
        else if (it.kind === '刻') add(y0, 'v');
        else if ((it.kind === '布' || it.kind === '铁丝') && (it.deep || 0) > 0.3) add(it.first_bite !== undefined ? it.first_bite : y0, '_');
      }
    }
    let s = (marks[born] || []).join('');
    strip.forEach(([y, c], i) => { if (i && i % 5 === 0) s += ' '; s += c; for (const m of marks[y] || []) s += m; });
    out.push(`${f1(h)} 米那一截：芯 ${s} 皮`);
  }
  out.push('');
  out.push('（o 钉子，= 铁丝，v 刻的那一下，_ 勒过的地方。）');
  return out.join('\n');
}
function helpLine(st) {
  const age = START_AGE + st.year;
  return `\n能做的（这一回，你够得着 ${f1(reach(age))} 米以下）：系 布 高度 指头 ｜ 系 铁丝 高度 指头 ｜ 钉 高度 一个字 ｜ 刻 高度 一个字 ｜ 松 号 指头 ｜ 解 号 ｜ 走 年数（1–10）\n还剩 ${LAST - st.year} 年。`;
}
// 一条命令进来，回一段字。st 就地改。
function act(st, line) {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const cmd = parts[0], args = parts.slice(1);
  const num = x => { const v = parseFloat(x); return isNaN(v) ? null : v; };
  if (st.over) {
    if (cmd === '指' && st.cut === undefined) {
      const hs = args.map(num).filter(v => v !== null).map(r1);
      if (!hs.length) return '指 高度 高度 ……　比如：指 1.2 1.5';
      const metal = [...new Set(st.items.filter(it => it.kind === '牌' || (it.kind === '铁丝' && (it.state === '在' || it.state === '嵌'))).map(it => r1(it.h)))].sort((a, b) => a - b);
      const hit = metal.filter(h => hs.every(x => Math.abs(h - x) > 0.05));
      st.cut = hs.concat(hit); st.hit = hit;
    }
    return endText(st);
  }
  const age = START_AGE + st.year;
  if (cmd === '看') return visitText(st, []) + helpLine(st);
  const hcheck = x => {
    const v = num(x); if (v === null) return [null, '高度写成数，比如 1.2'];
    const h = r1(v);
    if (h < 0.2) return [null, '太低了，蹲着也系不上，草里都是根。'];
    if (h > reach(age)) return [null, `够不着。你踮着脚，手只到 ${f1(reach(age))} 米。`];
    if (!st.dead && h >= st.Hs[st.Hs.length - 1] - 0.3) return [null, '那儿是梢，太细了。'];
    return [h, ''];
  };
  if (cmd === '系') {
    const kind = args[0];
    if (kind !== '布' && kind !== '铁丝') return '系 布 / 系 铁丝';
    const [h, why] = hcheck(args[1]); if (h === null) return why;
    const f0 = args.length > 2 ? (parseInt(args[2]) || 0) : 0, f = Math.max(0, Math.min(3, f0));
    let pre = f0 > 3 ? '结里最多塞得下三根指头，再多就挂不住，往下滑。\n' : '';
    const id = st.items.length + 1;
    const it = { id, kind, h, ri: rAt(st, h) + f * FINGER, year: st.year, age: 0, state: '在',
      life: kind === '布' ? 3 + Math.floor(rng(st.seed * 7 + st.items.length)() * 5) : 999 };
    st.items.push(it);
    const word = kind === '布' ? '布条' : '铁丝';
    return pre + `你在 ${f1(h)} 米那儿系了一道${word}` + (f ? `，结里留了 ${f} 根指头的空。` : '，贴着树皮系紧了。') + `（${id}号）`;
  }
  if (cmd === '钉' || cmd === '刻') {
    const [h, why] = hcheck(args[0]); if (h === null) return why;
    const ch = args.length > 1 ? Array.from(args[1])[0] : '我';
    const id = st.items.length + 1;
    st.items.push({ id, kind: cmd === '钉' ? '牌' : '刻', h, ch, r0: rAt(st, h), year: st.year, age: 0, state: '在' });
    return cmd === '钉' ? `你在 ${f1(h)} 米那儿钉了一颗钉子，挂上一块小木牌，写着「${ch}」。（${id}号）`
      : `你拿小刀在 ${f1(h)} 米那儿刻了个「${ch}」，有指甲盖那么大，刻得见了白。（${id}号）`;
  }
  if (cmd === '松' || cmd === '解') {
    const n = parseInt(args[0]);
    const it = st.items.find(i => i.id === n);
    if (!it) return '没有这一号。';
    if (it.kind !== '布' && it.kind !== '铁丝') return (it.kind === '牌' || it.kind === '刻') ? '钉子吃在木头里，手拔不出来；刻的字也抠不掉。' : '这一样解不下来。';
    if (it.state === '嵌') return '铁丝长进木头里了，抠不出来。';
    if (it.state !== '在') return '它已经不在树上了。';
    if (it.h > reach(age)) return '够不着。';
    const s = squeeze(st, it);
    if (cmd === '解') { it.state = '解'; it.end = st.year; return `你把${n}号解了下来。` + (s > 0.3 ? '底下一圈树皮是瘪的，颜色发白。' : ''); }
    const f0 = args.length > 1 ? (parseInt(args[1]) || 0) : 2, f = Math.max(0, Math.min(3, f0));
    const pre = f0 > 3 ? '结里最多塞得下三根指头，再多就挂不住，往下滑。\n' : '';
    it.ri = rAt(st, it.h) + f * FINGER;
    return pre + `你把${n}号解开重系，留了 ${f} 根指头。` + (s > 0.3 ? '勒过的那一圈瘪着，系在它上头。' : '');
  }
  if (cmd === '走') {
    let n = args.length ? Math.max(1, Math.min(10, parseInt(args[0]) || 1)) : 1;
    n = Math.min(n, LAST - st.year);
    const R = rng(st.seed * 1000 + st.year);
    st.last_visit = st.year;
    const ev = [];
    for (let i = 0; i < n; i++) { growOne(st, R, ev); st.year += 1; }
    if (st.year >= LAST || (st.dead && st.year - (st.dead_year || 0) >= 1)) {
      const t = visitText(st, ev);
      st.over = true;
      return t + '\n\n' + endText(st);
    }
    return visitText(st, ev) + helpLine(st);
  }
  return '不认得：' + cmd;
}
if (typeof module !== 'undefined') module.exports = { newGame, act, visitText, helpLine };
