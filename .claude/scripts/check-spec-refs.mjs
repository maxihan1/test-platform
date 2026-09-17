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

// 가리키는 번호를 모은다.
// SPEC 안에서는 맨절(`→ §8.8`)로 가리키는 것이 보통이라 `§` 만으로 센다.
// 밖(코드·훅·스킬)에서는 `SPEC §` 만 센다 — 다른 문서의 절 번호를 우리 것으로 오해하지 않으려고
const SPEC문서 = new Set(장들.map((p) => path.relative(ROOT, p)));
const 깨진참조 = [];
for (const p of 훑기(ROOT)) {
  const rel = path.relative(ROOT, p);
  const 무늬 = SPEC문서.has(rel) ? /(?<!CLAUDE\.md )§(\d+(?:\.\d+)?)/g : /SPEC §(\d+(?:\.\d+)?)/g;
  readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
    for (const m of l.matchAll(무늬)) {
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

console.log(`실재하는 절 ${[...있는절].sort().join(' · ')}`);
if (깨진참조.length || 깨진링크.length) {
  if (깨진참조.length) console.error(`\n없는 절을 가리키는 곳 ${깨진참조.length}건\n${깨진참조.join('\n')}`);
  if (깨진링크.length) console.error(`\n깨진 링크 ${깨진링크.length}건\n${깨진링크.join('\n')}`);
  process.exit(1);
}
console.log('통과 — 없는 절 0건 · 깨진 링크 0건');
