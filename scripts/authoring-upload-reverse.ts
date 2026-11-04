// 자식이 산출물 폴더에 쓴 파일을 root 가 안전하게 읽는다 — 차이 목록 · 표준 기획서 결과 · 훑은 화면(다 덮였나 · 바뀐 화면)
// authoring-upload.ts 가 300줄에 닿아 뗐다 (2026-09-30)

import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import type { 사본 } from './authoring-copy.js';
import { 바뀐틀들 } from './authoring-covered.js';
import { 게임모두덮음, 게임바뀐창 } from './authoring-game.js';
import { 크롤모두덮음, 크롤목록 } from './authoring-screens-keep-io.js';

/** 화면만인데 자식이 아무것도 안 썼을 때 — 찾은 화면이 전부 테스트가 이미 확인한 화면이면 그 장수. 웹 · 앱은 크롤 목록, 게임은 훑기 폴더의 창으로 센다 (작성 §3.6 「앱 · 게임 역방향」) */
export const 화면만다덮음 = (자료: string, 게임: boolean): number | null => (게임 ? 게임모두덮음 : 크롤모두덮음)(자료);

/** 저장본과 달라진 화면의 같은 틀 — PR 머리 「바뀐 화면」 줄의 재료. 웹 · 앱은 크롤 목록, 게임은 견주기 명령의 표시로 본다. 훑은 목록이 없으면 null (작성 §3.6 「앱 · 게임 역방향」 11) */
export function 바뀐틀읽기(자료: string, 게임: boolean): Set<string> | null {
  if (게임) return 게임바뀐창(자료);
  const 글 = 크롤목록(자료);
  return 글 === null ? null : 바뀐틀들(글);
}

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
