// 원장 껍데기 — 자식을 띄우기 전에 자료 글자본을 읽어 원장을 만들고 사본을 쓴다. 판단은 authoring-ledger 의 순수 함수에 있다
// authoring-run.ts 가 300줄에 닿아 이리로 뗐다 (2026-09-30)

import { lstatSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { 읽을자료 } from './authoring-assets.js';
import { type 원장, 원장만들기 } from './authoring-ledger.js';
import type { 원장입력 } from './authoring-prompt.js';

export const 원장사본이름 = 'ledger.json';

/** 링크 · 특수 파일은 안 읽는다 — 자료 폴더는 자식 uid 것이고 이어받은 폴더는 앞 자식이 만졌다. 못 읽으면 null */
function 안전히읽기(경로: string): string | null {
  const 정보 = lstatSync(경로, { throwIfNoEntry: false });
  return 정보?.isFile() === true ? readFileSync(경로, 'utf8') : null;
}

/**
 * **root 가 자식 폴더에 쓴다** — 자식이 심은 링크(`ledger.json` → root 파일)를 따라가지 않게 먼저 지우고 새로 만든다(`wx` — 있으면 실패).
 * 쓰는 동안 자식은 떠 있지 않다(띄우기 전 · 거둔 뒤) — 사이에 다시 심을 프로세스가 없다 (2026-09-30 보안 검토)
 */
function 새로쓰기(경로: string, 글: string): boolean {
  try {
    rmSync(경로, { force: true, recursive: true });
    writeFileSync(경로, 글, { mode: 0o644, flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 원장을 만들어 **메모리에 든다**(`원장` — 올리기 판정이 이것을 쓴다). 자식에게는 사본 경로만 준다(`입력`).
 * 자식이 사본을 고쳐도 판정은 안 흔들린다. 사본을 못 쓰면 원장 없음으로 돈다 — 자식이 모르는 원장으로 거절하지 않는다
 */
export function 원장준비(계획: 읽을자료[], 자료폴더: string): { 원장: 원장 | { 없음: string }; 입력: 원장입력 } {
  const r = 원장만들기(계획, 안전히읽기);
  if (!('원장' in r)) return { 원장: r, 입력: r };
  const 사본 = join(자료폴더, 원장사본이름);
  if (!새로쓰기(사본, JSON.stringify(r, null, 2))) {
    const 없음 = { 없음: '원장 사본을 자료 폴더에 못 썼다' };
    return { 원장: 없음, 입력: 없음 };
  }
  const 가족 = Object.entries(r.원장.가족).map(([k, n]) => `${k} ${String(n)}`).join(' · ');
  const 요약 = `요구 ${String(r.원장.항목.length)}${가족 === '' ? ' · 문단 모드' : ` · 번호 가족 ${가족}`}${r.원장.빠진자료.length > 0 ? ` · 원장에 못 넣은 자료 ${r.원장.빠진자료.join(' · ')}` : ''}`;
  return { 원장: r.원장, 입력: { 사본, 요약 } };
}

/**
 * git 이 추적하는 파일 목록에서 그 서비스 케이스 파일(하위 폴더 포함)만 골라 글을 읽는다 — 폴더를 직접 훑으면
 * 커밋에 안 들어가는 파일(무시 목록 · 링크 폴더 밑)로 대조를 넘을 수 있다 (2026-09-30 보안 검토). `읽기` 는 모양 검사 붙은 손이다
 */
export function 케이스글들(추적파일: string[], 폴더: string, 읽기: (상대경로: string) => string): string[] {
  return 추적파일.filter((f) => f.startsWith(`tests/${폴더}/`) && f.endsWith('.spec.ts')).map(읽기);
}
