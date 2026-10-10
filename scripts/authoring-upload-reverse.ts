// 자식이 산출물 폴더에 쓴 파일을 root 가 안전하게 읽는다 — 차이 목록 · 표준 기획서 결과
// authoring-upload.ts 가 300줄에 닿아 뗐다 (2026-09-30)

import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import type { 사본 } from './authoring-copy.js';

/**
 * 자식이 `<자료>/out/` 에 쓴 산출물 하나를 읽는다. 없으면 `몸: null`.
 * **root 가 읽는다** — 링크·하드링크(`nlink`)·`out` 폴더 바꿔치기(실제 경로 대조)를 거부해야 자식이 가리킨
 * 남의 파일(토큰·환경)이 PR·서버로 나가지 않는다. 자식은 이미 거둬져 읽는 사이에 바꿀 프로세스가 없다
 */
export function 산출물읽기(자리: 사본, 이름: string, 상한: number): { 몸: Buffer | null } | { 사유: string } {
  const 파일 = join(자리.자료, 'out', 이름);
  let 정보;
  try {
    정보 = lstatSync(파일);
  } catch {
    return { 몸: null };
  }
  if (!정보.isFile() || 정보.nlink !== 1 || realpathSync(파일) !== join(realpathSync(자리.자료), 'out', 이름)) {
    return { 사유: `산출물 ${이름} 이 일반 파일이 아니거나 산출물 폴더 밖을 가리킨다 — 올리지 않는다` };
  }
  if (정보.size > 상한) return { 사유: `산출물 ${이름} 이 너무 크다 — 올리지 않는다` };
  return { 몸: readFileSync(파일) };
}
