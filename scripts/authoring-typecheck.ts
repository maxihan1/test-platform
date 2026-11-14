// 작성 관문의 타입 검사 범위 — 저장소 전체 대신 맡은 경로(앱 테스트 폴더 · 맡은 파일)만 보는 임시 tsconfig 를 만든다

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 맡은 경로만 타입 검사하는 임시 tsconfig. 맡은 파일이 가져다 쓰는 것(kit · 자기 도우미 · Page Object)은 tsc 가 따라가 같이 본다.
 * 자리는 작업마다 따로라 이름이 겹치지 않는다
 */
export function 맡은tsconfig(트리: string, 자리: string, 경로들: readonly string[]): string {
  mkdirSync(자리, { recursive: true });
  const 길 = join(자리, `tsconfig-${process.pid}.json`);
  writeFileSync(길, JSON.stringify({ extends: join(트리, 'tsconfig.json'), include: 경로들.map((f) => resolve(트리, f)) }));
  return 길;
}

/**
 * 그 앱 테스트 폴더만 보는 `npx` 인자. 케이스 PR 은 tests/<폴더> · docs/cases 만 바꾸고(cases-only.mjs) 앱 테스트는 kit 과
 * 자기 폴더만 가져다 쓴다 — 남의 앱 · 플랫폼 코드를 다시 볼 까닭이 없다. 저장소 전체는 테스트가 쌓여 2.47GB 가 됐고
 * 작성 서버 node 힙 한도(2240MB)를 넘어 반영이 종료 134 로 멈췄다(2026-11-14 MTW). 앱 하나는 0.4GB · 3초다
 */
export function 앱tsc인자(트리: string, 자리: string, 폴더: string): string[] {
  return ['tsc', '--noEmit', '-p', 맡은tsconfig(트리, 자리, [join('tests', 폴더)])];
}
