#!/usr/bin/env node
// SPEC 이 여러 장으로 갈려 있어 절 번호가 유일한 주소다. 가리키는 번호가 실제로 있는지 본다 (spec-review H1)
// 장 수를 여기 적지 않는다 — 장이 늘면 이 주석만 뒤처진다. 세는 일은 아래 `전장` 이 한다
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const 건너뛸폴더 = new Set(['node_modules', '.git', 'dist', 'build', '.claude/worktrees']);
const 볼확장자 = new Set(['.md', '.ts', '.tsx', '.mjs', '.js', '.yaml', '.yml', '.sql', '.json', '.html']);

function 훑기(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (건너뛸폴더.has(f) || path.relative(ROOT, p).startsWith('.claude/worktrees')) return [];
    if (statSync(p).isDirectory()) return 훑기(p);
    return 볼확장자.has(path.extname(p)) ? [p] : [];
  });
}

// 실재하는 절 번호를 모은다. `## 6. 데이터 모델` · `### 5.2 Runner HTTP 계약` 형태
const 있는절 = new Set();
const 장들 = [path.join(ROOT, 'docs/SPEC.md'), ...훑기(path.join(ROOT, 'docs/spec'))];
for (const p of 장들) {
  for (const l of readFileSync(p, 'utf8').split('\n')) {
    const m = l.match(/^#{2,3} (\d+(?:\.\d+)?)[.\s]/);
    if (m) 있는절.add(m[1]);
  }
}
// `§1` 이 있으면 `§1.1` 만 있어도 대절은 가리킬 수 있다
for (const s of [...있는절]) 있는절.add(s.split('.')[0]);

// SPEC 밖에서 절 번호로 가리키는 곳이 몇 군데인지 센다.
// 색인이 이 숫자를 손으로 적고 있었는데 221 → 305 로 조용히 썩었다. 기계가 센다
let 밖참조 = 0;

// 가리키는 번호를 모은다.
// SPEC 안에서는 맨절(`→ §8.8`)로 가리키는 것이 보통이라 `§` 만으로 센다.
// 밖(코드·훅·스킬)에서는 `SPEC §` 만 센다 — 다른 문서의 절 번호를 우리 것으로 오해하지 않으려고.
// CLAUDE.md 의 절은 맨 이름과 링크 두 모양 다 뺀다
const SPEC문서 = new Set(장들.map((p) => path.relative(ROOT, p)));
const 깨진참조 = [];
for (const p of 훑기(ROOT)) {
  const rel = path.relative(ROOT, p);
  const 무늬 = SPEC문서.has(rel) ? /(?<!CLAUDE\.md )(?<!CLAUDE\.md\) )§(\d+(?:\.\d+)?)/g : /SPEC §(\d+(?:\.\d+)?)/g;
  readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
    for (const m of l.matchAll(무늬)) {
      if (!SPEC문서.has(rel)) 밖참조 += 1;
      if (!있는절.has(m[1])) 깨진참조.push(`${rel}:${i + 1}  §${m[1]}`);
    }
  });
}

// 색인과 각 장의 상대 링크가 실제 파일을 가리키는지 본다. 깨진 링크는 세션을 막다른 길로 보낸다
const 깨진링크 = [];
for (const p of 장들) {
  const rel = path.relative(ROOT, p);
  readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
    for (const m of l.matchAll(/\]\(([^)#:]+\.md)(?:#[^)]*)?\)/g)) {
      const 대상 = path.resolve(path.dirname(p), m[1]);
      try { statSync(대상); } catch { 깨진링크.push(`${rel}:${i + 1}  → ${m[1]}`); }
    }
  });
}

// 색인이 적어 둔 분량이 실제와 맞는지 본다. 어긋나면 세션이 "4장 537줄"을 믿고 계획을 세운다
const 틀린분량 = [];
{
  const 줄수 = (rel) => readFileSync(path.join(ROOT, 'docs', rel), 'utf8').split('\n').length - 1;
  // 「N장 전부」처럼 경로 대신 말로 적은 행이 있다. 경로가 있는 행만 세면 그 행은
  // 구조적으로 검사를 빠져나가고, 실제로 39줄 틀린 채 통과하고 있었다 (2026-09-19)
  const 전장 = 장들.filter((p) => p !== path.join(ROOT, 'docs/SPEC.md'));
  const 전장합 = 전장.reduce((n, p) => n + readFileSync(p, 'utf8').split('\n').length - 1, 0);
  readFileSync(path.join(ROOT, 'docs/SPEC.md'), 'utf8').split('\n').forEach((l, i) => {
    // 같은 병이 두 번째다. 이번엔 그 행을 「12장 전부」라는 **글자**로 찾고 있었다 —
    // 장이 하나 늘어 「13장 전부」로 적는 순간 행이 통째로 검사를 빠져나간다.
    // 2026-09-22 에 글자만 바꿔 9999줄을 넣었더니 그대로 통과했다(EXIT=0).
    // 그래서 값이 아니라 키로 가른다 — 「읽을 장」 칸이 경로면 그 경로들을, 「N장 전부」면 전 장을 센다.
    // N 도 사람이 적는 숫자라 같이 대조한다 (CLAUDE.md §2.7 ⑤ — 세는 일은 기계가 한다).
    // 칸이 둘 중 어느 것도 아니면 건드리지 않는다. 넓게 잡으면 남의 행을 전장합과 대조해
    // 터지면서 오류 문구가 원인을 안 가리킨다
    const 갈래 = l.startsWith('| **') && l.match(/^\|[^|]+\|([^|]+)\|\s*(\d+)줄\s*\|/);
    const 읽을장 = 갈래 ? 갈래[1].trim() : '';
    const 전부 = 갈래 && 읽을장.match(/^(\d+)장 전부$/);
    if (갈래 && 읽을장.includes('`spec/')) {
      const 합 = [...읽을장.matchAll(/`([^`]+)`/g)].reduce((n, m) => n + 줄수(`${m[1]}.md`), 0);
      if (합 !== Number(갈래[2])) 틀린분량.push(`docs/SPEC.md:${i + 1}  적힌 ${갈래[2]}줄 · 실제 ${합}줄`);
    } else if (전부) {
      if (Number(전부[1]) !== 전장.length) 틀린분량.push(`docs/SPEC.md:${i + 1}  적힌 ${전부[1]}장 · 실제 ${전장.length}장`);
      if (전장합 !== Number(갈래[2])) 틀린분량.push(`docs/SPEC.md:${i + 1}  적힌 ${갈래[2]}줄 · 실제 ${전장합}줄`);
    }
    const 장 = l.match(/^\| \[[^\]]+\]\((spec\/[^)]+\.md)\).*\| (\d+) \|/);
    if (장 && 줄수(장[1]) !== Number(장[2])) {
      틀린분량.push(`docs/SPEC.md:${i + 1}  ${장[1]} 적힌 ${장[2]}줄 · 실제 ${줄수(장[1])}줄`);
    }
  });
}

// 이미 반영이 끝난 제안이 「아직 안 했다」로 읽히면, CLAUDE.md §1.2 가 명세를 여는 세션마다
// 강제 정지를 건다. 2026-09-20 에 그런 블록이 넷 쌓여 있었다. 블록마다 상태 줄을 강제한다.
//
// 마크다운으로 파싱하지 않고 줄 그대로 훑는다 — 블록 하나가 ```sql 펜스 안에 있어서,
// 코드 블록을 건너뛰는 식으로 짜면 상태 줄도 블록도 같이 안 보여 **우연히 초록**이 난다
const 상태값 = /^상태:\s+(대기|철회됨|반영 완료 \(\d{4}-\d{2}-\d{2}, .+\))$/;
const 상태없음 = [];
let 계약블록 = 0;
for (const p of 장들) {
  const rel = path.relative(ROOT, p);
  const 줄 = readFileSync(p, 'utf8').split('\n');
  줄.forEach((l, i) => {
    if (l.trim() !== '[계약 변경 필요]') return;
    계약블록 += 1;
    // 블록은 빈 줄이나 펜스에서 끝난다. 끝을 넓게 잡으면 뒤에 오는 남의 상태 줄을 제 것으로 센다
    let 끝 = i + 1;
    while (끝 < 줄.length && 줄[끝].trim() !== '' && !줄[끝].trimStart().startsWith('```')) 끝 += 1;
    const 상태 = 줄.slice(i + 1, 끝).filter((x) => x.trimStart().startsWith('상태:'));
    if (상태.length !== 1 || !상태값.test(상태[0].trim())) {
      상태없음.push(`${rel}:${i + 1}  상태: 대기 | 반영 완료 (YYYY-MM-DD, 어디에) | 철회됨 중 하나가 블록 안에 하나 있어야 한다`);
    }
  });
}

// 2026-09-18 — 킥오프 앵커 검사를 걷어냈다.
// `docs/orchestration.yaml` 의 `kickoff:` 이름이 WORKSTREAMS 에 실재하는지 대조하던 것인데,
// 그 파일이 사라져 **대조할 상대가 없다.**
//
// **검사 능력이 하나 줄었다.** WORKSTREAMS 킥오프 절 제목은 여전히 중요하다 — `tpx-plan` 의
// 작업 원천이다. 없어진 것은 그 제목을 기계가 대조할 근거이지 제목의 중요성이 아니다.
// 지금은 사람이 본다. 다시 기계에 맡길 상대가 생기면 여기에 되살린다.

console.log(`실재하는 절 ${[...있는절].sort().join(' · ')}`);
console.log(`절 번호로 이 문서를 가리키는 곳 — SPEC 밖에 ${밖참조}군데`);
console.log(`[계약 변경 필요] 블록 ${계약블록}건 · 상태 줄이 없거나 모양이 틀린 것 ${상태없음.length}건`);
if (깨진참조.length || 깨진링크.length || 틀린분량.length || 상태없음.length || 계약블록 === 0) {
  if (깨진참조.length) console.error(`\n없는 절을 가리키는 곳 ${깨진참조.length}건\n${깨진참조.join('\n')}`);
  if (깨진링크.length) console.error(`\n깨진 링크 ${깨진링크.length}건\n${깨진링크.join('\n')}`);
  if (틀린분량.length) console.error(`\n색인 분량이 실제와 다른 곳 ${틀린분량.length}건\n${틀린분량.join('\n')}`);
  if (상태없음.length) console.error(`\n[계약 변경 필요] 블록에 상태 줄이 없는 곳 ${상태없음.length}건\n${상태없음.join('\n')}`);
  // 블록이 하나도 없으면 이 검사는 아무것도 안 지키면서 초록만 낸다. 조용히 무의미해지지 않게 터뜨린다
  if (계약블록 === 0) console.error('\n[계약 변경 필요] 블록이 하나도 없다 — 검사를 지울 때가 됐는지 보라');
  process.exit(1);
}
console.log('통과 — 없는 절 0건 · 깨진 링크 0건 · 틀린 분량 0건 · 상태 줄 없는 블록 0건');
