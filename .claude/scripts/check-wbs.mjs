#!/usr/bin/env node
// docs/wbs.md 와 docs/WORKSTREAMS.md 가 완료 표시에서 어긋나면 실패한다 — 한쪽만 갱신되는 것을 CI 에서 잡는다.
import { readFileSync } from 'node:fs';
import { checkSync, parseWbs } from './wbs.mjs';

// WORKSTREAMS 가 번호 붙은 묶음(✅ · 반영 완료)으로 진척을 적는 영역. 묶음 절이 새로 서면 그 영역 키를 더한다
export const TRACKED = ['REV', 'E2E', 'ACL'];

const wbs = readFileSync('docs/wbs.md', 'utf8');
const errs = checkSync(wbs, readFileSync('docs/WORKSTREAMS.md', 'utf8'), TRACKED);
const tasks = parseWbs(wbs).flatMap((a) => a.features.flatMap((f) => f.tasks));
console.log(`[check:wbs] 태스크 ${tasks.length}개 · 완료 ${tasks.filter((t) => t.done).length}개 · 어긋남 ${errs.length}건`);
for (const e of errs) console.log(`  ✗ ${e}`);
process.exit(errs.length ? 1 : 0);
