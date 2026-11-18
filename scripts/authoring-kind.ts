// 작성 요청의 애플리케이션 종류를 정하고 그 종류의 입구 스킬을 고른다 (도메인/작성 §3.6 「종류별 작성 AI」)

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type 작성종류 = 'web' | 'app' | 'api' | 'game';

const 종류표 = new Map<string, 작성종류>([
  ['SCREEN', 'web'],
  ['APP', 'app'],
  ['API', 'api'],
  ['GAME', 'game'],
]);

/** 프롬프트 머리의 종류 줄에 적는 말 */
export const 종류이름: Record<작성종류, string> = { web: '웹', app: 'Android 앱', api: 'API', game: '게임' };

/** 종류를 안 받은 자식이 타는 입구이자 공통 절차 스킬 */
export const 옛입구 = 'tpx-author';

/** 프롬프트 머리에 실을 입구. `종류` 가 없으면 옛 입구이고 종류 줄도 안 적는다 */
export interface 입구 {
  스킬: string;
  종류?: 작성종류;
}

/**
 * 종류는 `/api/auth/me` 의 kind 하나로 정한다. 가져간 요청의 칸(API 칸 · 앱 화면)으로 가르면
 * 표준 기획서 반영처럼 API 칸 없이 오는 API 애플리케이션 요청이 다른 입구로 간다. 못 읽으면 null
 */
export function 작성종류(kind: string | undefined): 작성종류 | null {
  return 종류표.get(kind ?? '') ?? null;
}

/**
 * 작업 폴더에 그 종류의 입구 스킬이 있을 때만 고른다. 멈춘 작성을 이어받으면 보관해 둔 옛 작업 폴더를 그대로 써서
 * 입구가 없을 수 있다 — 없는 스킬 이름으로 띄우면 자식이 지침 없이 돈다. 종류 하나만 되돌릴 때도 main 에서 그 폴더만 지우면 된다
 */
export function 스킬고르기(트리: string, 종류: 작성종류 | null): 입구 {
  if (종류 === null) return { 스킬: 옛입구 };
  const 스킬 = `${옛입구}-${종류}`;
  return existsSync(join(트리, '.claude', 'skills', 스킬, 'SKILL.md')) ? { 스킬, 종류 } : { 스킬: 옛입구 };
}

/** 프롬프트가 부른다. 작업 폴더를 안 받았으면 옛 입구이고, 종류를 못 읽으면 종류 없이 띄우고 로그에 남긴다 */
export function 입구고르기(트리: string | undefined, kind: string | undefined, 알림: (글: string) => void): 입구 {
  if (트리 === undefined) return { 스킬: 옛입구 };
  const 종류 = 작성종류(kind);
  if (종류 === null) 알림(`애플리케이션 종류를 못 읽었다(kind=${JSON.stringify(kind ?? null)}) — 종류 없이 ${옛입구} 로 띄운다`);
  return 스킬고르기(트리, 종류);
}
