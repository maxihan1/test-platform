// 원장 껍데기 — 자식을 띄우기 전에 자료 글자본을 읽어 원장을 만들고 사본을 쓴다. 판단은 authoring-ledger 의 순수 함수에 있다
// authoring-run.ts 가 300줄에 닿아 이리로 뗐다 (2026-09-30)

import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 원장만들기 } from './authoring-ledger.js';
import type { 원장입력 } from './authoring-prompt.js';

export const 원장사본이름 = 'ledger.json';
export const 빠짐파일이름 = 'ledger-missing.json';

/** 링크 · 특수 파일은 안 읽는다 — 자료 폴더는 자식 uid 것이다. 자식이 뜨기 전이지만 이어받은 폴더는 앞 자식이 만졌다 */
function 안전히읽기(경로: string): string {
  const 정보 = lstatSync(경로, { throwIfNoEntry: false });
  return 정보?.isFile() === true ? readFileSync(경로, 'utf8') : '';
}

/**
 * 원장을 만들어 **메모리에 든다**(`원장` — 올리기 판정이 이것을 쓴다). 자식에게는 사본 경로만 준다(`입력`).
 * 자식이 사본을 고쳐도 판정은 안 흔들린다
 */
export function 원장준비(계획: 읽을자료[], 자료폴더: string): { 원장: 원장 | { 없음: string }; 입력: 원장입력 } {
  const r = 원장만들기(계획, 안전히읽기);
  if (!('원장' in r)) return { 원장: r, 입력: r };
  const 사본 = join(자료폴더, 원장사본이름);
  writeFileSync(사본, JSON.stringify(r, null, 2), { mode: 0o644 });
  const 가족 = Object.entries(r.원장.가족).map(([k, n]) => `${k} ${String(n)}`).join(' · ');
  const 요약 = `요구 ${String(r.원장.항목.length)}${가족 === '' ? ' · 문단 모드' : ` · 번호 가족 ${가족}`}${r.원장.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${r.원장.빠진자료.join(' · ')}` : ''}`;
  // 이어받은 폴더에 앞 실행이 남긴 빠짐 목록이 있으면 자식이 그것부터 채운다 (§7 「이어하기」)
  const 빠짐 = join(자료폴더, 빠짐파일이름);
  return { 원장: r.원장, 입력: { 사본, 요약, ...(existsSync(빠짐) ? { 빠짐파일: 빠짐 } : {}) } };
}

/** 올릴 트리의 케이스 폴더에서 tcId 재료(파일 글)를 모은다. `읽기` 는 올리기가 쓰는 모양 검사 붙은 손이다 */
export function 케이스글들(트리: string, 폴더: string, 읽기: (상대경로: string) => string): string[] {
  const 자리 = join(트리, 'tests', 폴더);
  if (!existsSync(자리)) return [];
  return readdirSync(자리)
    .filter((f) => f.endsWith('.spec.ts'))
    .map((f) => 읽기(join('tests', 폴더, f)));
}

/**
 * 빠짐 목록을 자료 폴더에 쓴다 — 이어받는 자식이 읽는다. **root 가 자식 폴더에 쓰는 것이라** 자식이 심은 링크를 따라가지 않게
 * 먼저 지우고 새로 만든다(`wx` — 있으면 실패). 자식은 이미 거둬져 그 사이에 다시 심을 프로세스가 없다
 */
export function 빠짐목록쓰기(자료폴더: string, 글: string): void {
  const 경로 = join(자료폴더, 빠짐파일이름);
  rmSync(경로, { force: true });
  writeFileSync(경로, 글, { mode: 0o644, flag: 'wx' });
}
