#!/usr/bin/env node
// 바뀐 파일이 「테스트만」(기존 폴더의 spec · 케이스 문서)인지 판정한다. pre-push 훅과 CI 가 가벼운 길을 고를 때 쓴다.
//
// 쓰는 법: git -c core.quotePath=false diff --name-only <base>...HEAD | node cases-only.mjs <base>
//   종료 0 = 테스트만(가벼운 길) · 1 = 그 밖(무거운 길). 판정을 못 해도 1 이다 — 틀리면 코드가 검사 없이 들어간다.
//   core.quotePath=false 를 빼면 한글 파일명이 따옴표로 싸여 와서 늘 무거운 길이 된다(안전하지만 느리다).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * 파일 목록이 전부 `tests/<기존폴더>/*.spec.ts` 또는 `docs/cases/*.md` 인가.
 * 새 폴더는 CI 실행 단계에 없어 다음 무거운 PR 을 빨갛게 만들므로 무거운 길로 보낸다.
 */
export function 테스트만인가(파일들, 기존폴더) {
  if (파일들.length === 0) return false;
  return 파일들.every((f) => {
    if (f.split('/').includes('..')) return false;
    if (/^docs\/cases\/[^/]+\.md$/.test(f)) return true;
    const m = /^tests\/([^/]+)\/[^/]+\.spec\.ts$/.exec(f);
    return m !== null && 기존폴더.includes(m[1]);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.argv[2];
  if (!base) {
    console.error('[cases-only] base ref 를 인자로 줘라');
    process.exit(1);
  }
  let 폴더목록;
  try {
    폴더목록 = execFileSync('git', ['-c', 'core.quotePath=false', 'ls-tree', '-d', '--name-only', base, 'tests/'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    console.error(`[cases-only] ${base} 의 tests/ 폴더 목록을 못 읽었다 — 무거운 길로 간다: ${e.message}`);
    process.exit(1);
  }
  const 기존폴더 = 폴더목록.split('\n').filter(Boolean).map((p) => p.replace(/^tests\//, ''));
  const 파일들 = readFileSync(0, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  process.exit(테스트만인가(파일들, 기존폴더) ? 0 : 1);
}
