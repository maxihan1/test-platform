#!/usr/bin/env node
// SPEC 이 12장으로 갈려 있어 절 번호가 유일한 주소다. 가리키는 번호가 실제로 있는지 본다 (spec-review H1)
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
  readFileSync(path.join(ROOT, 'docs/SPEC.md'), 'utf8').split('\n').forEach((l, i) => {
    const 갈래 = l.startsWith('| **') && l.includes('`spec/') && l.match(/\| (\d+)줄 \|/);
    if (갈래) {
      const 합 = [...l.matchAll(/`([^`]+)`/g)].reduce((n, m) => n + 줄수(`${m[1]}.md`), 0);
      if (합 !== Number(갈래[1])) 틀린분량.push(`docs/SPEC.md:${i + 1}  적힌 ${갈래[1]}줄 · 실제 ${합}줄`);
    }
    const 장 = l.match(/^\| \[[^\]]+\]\((spec\/[^)]+\.md)\).*\| (\d+) \|/);
    if (장 && 줄수(장[1]) !== Number(장[2])) {
      틀린분량.push(`docs/SPEC.md:${i + 1}  ${장[1]} 적힌 ${장[2]}줄 · 실제 ${줄수(장[1])}줄`);
    }
  });
}

console.log(`실재하는 절 ${[...있는절].sort().join(' · ')}`);
console.log(`절 번호로 이 문서를 가리키는 곳 — SPEC 밖에 ${밖참조}군데`);
if (깨진참조.length || 깨진링크.length || 틀린분량.length) {
  if (깨진참조.length) console.error(`\n없는 절을 가리키는 곳 ${깨진참조.length}건\n${깨진참조.join('\n')}`);
  if (깨진링크.length) console.error(`\n깨진 링크 ${깨진링크.length}건\n${깨진링크.join('\n')}`);
  if (틀린분량.length) console.error(`\n색인 분량이 실제와 다른 곳 ${틀린분량.length}건\n${틀린분량.join('\n')}`);
  process.exit(1);
}
console.log('통과 — 없는 절 0건 · 깨진 링크 0건 · 틀린 분량 0건');
