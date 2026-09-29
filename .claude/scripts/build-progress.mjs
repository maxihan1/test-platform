#!/usr/bin/env node
// docs/wbs.md 를 읽어 사용자용 진행판(단일 HTML)을 만든다. tpx-merge 가 병합 뒤 이것을 같은 Artifact URL 로 다시 게시한다.
//
// 사용:  npm run progress [-- 출력경로]   (기본 build/progress.html)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseWbs, renderProgress } from './wbs.mjs';

const out = process.argv[2] ?? 'build/progress.html';
const text = readFileSync('docs/wbs.md', 'utf8');
const areas = parseWbs(text);
const tasks = areas.flatMap((a) => a.features.flatMap((f) => f.tasks));

// 자가 검사 — 파서가 흘리면 숫자가 조용히 틀린다. 영역 절 안의 태스크 줄 수와 맞춘다
const raw = text.split(/^## /m).filter((s) => /^[A-Z0-9]+ — /.test(s)).join('').match(/^- \[[ x]\] `/gm) ?? [];
if (raw.length !== tasks.length) throw new Error(`파싱 ${tasks.length} ≠ 원문 ${raw.length}`);

// 사람이 눌러 확인하는 완료 기준 — npm run count:done 과 같은 파일·같은 규칙
const 기준 = readFileSync('docs/spec/공통/7-데모와-완료.md', 'utf8');
const 확인 = (기준.match(/^\s*- \[[xX]\]/gm) ?? []).length;
const 전체기준 = 확인 + (기준.match(/^\s*- \[ \]/gm) ?? []).length;

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const data = {
  areas,
  note: `사람이 눌러 확인하는 완료 기준 — 확인 ${확인} / ${전체기준} (docs/spec/공통/7-데모와-완료.md)`,
  generated: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(),
};
const template = readFileSync(new URL('./progress.template.html', import.meta.url), 'utf8');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, renderProgress(data, template));
console.log(`${out} — 완료 ${tasks.filter((t) => t.done).length} / ${tasks.length}`);
