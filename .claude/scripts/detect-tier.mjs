#!/usr/bin/env node
// 바뀐 파일 경로를 받아 등급을 판정해 찍는다. 인자로 주거나 stdin 으로 파이프한다.
//   node .claude/scripts/detect-tier.mjs docs/SETUP.md
//   git diff --name-only origin/main...HEAD | node .claude/scripts/detect-tier.mjs
import { readFileSync } from 'node:fs';
import { detectTier } from './surfaces.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--json');
const json = process.argv.includes('--json');

let paths = args;
if (!paths.length) {
  // stdin 이 비어 있으면 0건으로 퉁치지 않는다 — 조용히 1등급이 나오면 판정이 거짓말을 한다
  let raw = '';
  try { raw = readFileSync(0, 'utf8'); } catch { /* 파이프가 없다 */ }
  paths = raw.split('\n').map((s) => s.trim()).filter(Boolean);
}

if (!paths.length) {
  console.error('판정할 경로가 없다. 인자로 주거나 git diff --name-only 를 파이프해라.');
  process.exit(3);
}

const v = detectTier(paths);

if (json) {
  console.log(JSON.stringify(v, null, 2));
} else {
  console.log(`등급: ${v.tier}`);
  console.log(`표면: ${v.surfaces.join(', ') || '없음'}`);
  if (v.unmapped.length) {
    // 조용히 통과시키지 않는다. 게이트 2 요약에 이 줄이 그대로 실린다
    for (const p of v.unmapped) console.log(`미분류: ${p}`);
  }
}
