// 작성 관문의 타입 검사 범위 — 저장소 전체 대신 맡은 경로(앱 테스트 폴더 · 맡은 파일)만 보는 임시 tsconfig 를 만든다

import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 맡은 경로만 타입 검사하는 `npx` 인자. 맡은 파일이 가져다 쓰는 것(kit · 자기 도우미 · Page Object)은 tsc 가 따라가 같이 본다.
 * tsconfig 는 새로 만든 폴더 안에 쓴다 — 자리가 자식 uid 의 임시 폴더여도 미리 심은 링크를 따라 쓰지 않고, 같은 pid 끼리 겹치지 않는다
 */
export function tsc인자(트리: string, 자리: string, 경로들: readonly string[]): string[] {
  mkdirSync(자리, { recursive: true });
  const 폴더 = mkdtempSync(join(자리, 'tsc-'));
  // mkdtemp 는 0700 이다 — 반영 · 고치기 관문은 에이전트가 만들고 자식 uid 가 tsc 를 돌려 못 읽었다(TS5058, 2026-11-14 MTW 반영). 읽기만 연다
  chmodSync(폴더, 0o755);
  const 길 = join(폴더, 'tsconfig.json');
  writeFileSync(길, JSON.stringify({ extends: join(트리, 'tsconfig.json'), include: 경로들.map((f) => resolve(트리, f)) }), { flag: 'wx' });
  return ['tsc', '--noEmit', '-p', 길];
}

/**
 * 그 앱 테스트 폴더만 보는 `npx` 인자. 케이스 PR 은 tests/<폴더> · docs/cases 만 바꾸고(cases-only.mjs) 앱 테스트는 kit 과
 * 자기 폴더만 가져다 쓴다 — 남의 앱 · 플랫폼 코드를 다시 볼 까닭이 없다. 저장소 전체는 테스트가 쌓여 2.47GB 가 됐고
 * 작성 서버 node 힙 한도(2240MB)를 넘어 반영이 종료 134 로 멈췄다(2026-11-14 MTW). 앱 하나는 0.4GB · 3초다.
 * kit 입구를 같이 담는다 — 마지막 케이스를 지워 폴더가 비어도 「입력 없음」(TS18003)으로 실패하지 않게
 */
export function 앱tsc인자(트리: string, 자리: string, 폴더: string): string[] {
  return tsc인자(트리, 자리, [join('tests', 폴더), join('packages', 'kit', 'src', 'index.ts')]);
}
