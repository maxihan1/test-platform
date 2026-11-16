// 케이스가 상대 import 로 닿는 파일 따라가기 — 이번 작성이 바꾼 파일에 닿는 케이스 고르기(웹 3번 · 폰 돌려 보기 · 끝 검사)와 폰 표본 고르기가 같이 쓴다 (SPEC 도메인/작성 §3.6)
// authoring-gate3 에서 떼어 냈다 — 그 파일이 300줄을 넘었다

import { dirname, join, normalize } from 'node:path';

import type { 파일글 } from './authoring-quality.js';

/**
 * 마지막 전체 돌려 보기로 볼 케이스 파일마다, 그 파일과 그것이 가져다 쓰는 Page Object · Component · 도우미 가운데 가장 늦은 수정 시각.
 * 이번 작성이 바꾼 파일(`바뀐` — 기준과의 차이, testDir 기준 경로)에 닿는 케이스만 본다. 안 건드린 케이스는 앞 작성에서 3회를 통과했다 —
 * 반영 · 화면이 맞음 · 바뀐 화면 고치기가 케이스 1~4건을 고치고 폴더 전체 472 파일을 돌아 15~17분을 썼다(PRD-F9-13). 첫 작성은 다 바뀐 것이라 전체다
 */
export function 살필케이스(파일들: (파일글 & { 때: number })[], 바뀐: ReadonlySet<string>): Record<string, number> {
  const 표 = new Map(파일들.map((f) => [f.경로, f]));
  const 닿음 = 닿는파일(파일들);
  return Object.fromEntries(
    파일들
      .filter((f) => f.경로.endsWith('.spec.ts'))
      .flatMap((f) => {
        const 닿은 = 닿음(f.경로);
        return 닿은.some((p) => 바뀐.has(p)) ? [[f.경로, Math.max(...닿은.map((p) => 표.get(p)?.때 ?? 0))] as const] : [];
      }),
  );
}

/** 케이스(또는 파일)에서 시작해 상대 import 로 닿는 파일들(자기 포함) — 살필케이스와 폰 돌려 보기의 표본 고르기가 같은 길로 따라간다 */
export function 닿는파일(파일들: readonly 파일글[]): (시작: string) => string[] {
  const 표 = new Map(파일들.map((f) => [f.경로, f]));
  // 케이스마다 새로 따라간다 — 나눠 쓰는 메모는 import 가 돌면 덜 찬 집합을 남긴다(code-review).
  // 폴더 밖 파일(tests/<다른 폴더>)도 담는다 — 글을 못 읽어 그 너머는 못 따라가도 그 파일이 바뀌었으면 케이스를 본다
  return (시작: string): string[] => {
    const 본 = new Set<string>();
    const 갈곳 = [시작];
    for (let 경로 = 갈곳.pop(); 경로 !== undefined; 경로 = 갈곳.pop()) {
      if (본.has(경로)) continue;
      본.add(경로);
      for (const m of 표.get(경로)?.글.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g) ?? []) {
        const p = normalize(join(dirname(경로), m[1]!)).replace(/\.js$/, '');
        갈곳.push(p.endsWith('.ts') ? p : `${p}.ts`);
      }
    }
    return [...본];
  };
}

/** 파일이 바로(한 단계) 가져다 쓰는 파일들 — 폰 표본이 「케이스가 직접 쓰는 화면」을 볼 때 쓴다(도우미가 가져다 쓰는 화면까지 세면 모든 케이스가 모든 화면을 지난다) */
export function 바로닿는파일(파일들: readonly 파일글[]): (경로: string) => string[] {
  const 표 = new Map(파일들.map((f) => [f.경로, f]));
  return (경로: string) =>
    [...(표.get(경로)?.글.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g) ?? [])].map((m) => {
      const p = normalize(join(dirname(경로), m[1]!)).replace(/\.js$/, '');
      return p.endsWith('.ts') ? p : `${p}.ts`;
    });
}
