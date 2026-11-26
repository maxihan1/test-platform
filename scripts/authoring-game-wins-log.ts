// 이긴 판 기록 — 이기는 미션의 작전(조작 도우미 함수와 인자)이 원래 속도로 몇 판을 이겼나. 10판 확인 명령(authoring-game-wins)이 쓰고 미션 줄(authoring-missions)이 읽는다 (도메인/게임 §3.10 「배운 것을 PRD · 테스트로」)
// 디바이스를 부르지 않는다 — 에이전트 프로세스에서도 읽는다
import { createHash } from 'node:crypto';
import { basename, dirname, join, relative } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import { 지금빌드 } from './authoring-learn-prd.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 2026-11-25 사용자가 정한 첫 값 — 10판을 다 이겨도 실제 승률은 72% 까지 낮을 수 있다(95% 구간) */
export const 채울판 = 10;

/** 이기는 작전 — `tests/<폴더>/helpers/<파일>.helper.ts` 의 함수와 인자 */
export interface 작전 {
  파일: string;
  함수: string;
  인자: unknown[];
}
/** 같은 도우미 글 · 같은 빌드에서 이기고 진 판 */
export interface 판수 {
  이김: number;
  짐: number;
  /** 첫 판을 시작할 때의 나아감 — 판마다 같은 출발점이어야 확인이다(레벨처럼 되돌릴 수 없는 게임은 이어서 쉽게 이긴다) */
  출발?: number;
}
type 기록 = Record<string, 판수 & { 지문: string; 빌드: string }>;

const 글상한 = 2_000_000;
const 열쇠 = (폴더: string, x: 작전): string => `${폴더}/${x.파일} ${x.함수} ${JSON.stringify(x.인자)}`;

/** 도우미 파일과 그 파일이 가져오는 tests 안 파일 — tests 기준 경로와 글. 이어받으면 작업 폴더 이름이 바뀌어 절대 경로는 못 쓴다 */
function 작전글들(트리: string, 폴더: string, 파일: string): Map<string, string> {
  const 뿌리 = join(트리, 'tests');
  const 본 = new Map<string, string>();
  const 걷기 = (자리: string): void => {
    const 길 = relative(뿌리, 자리);
    if (본.has(길) || 길.startsWith('..')) return;
    const 글 = 안전히읽기(dirname(자리), basename(자리), 글상한);
    if (글 === null) return;
    본.set(길, 글);
    for (const m of 글.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) 걷기(join(dirname(자리), m[1]!.replace(/\.js$/, '.ts')));
  };
  걷기(join(뿌리, 폴더, 'helpers', `${파일}.helper.ts`));
  return 본;
}

/** 하나라도 고치면 판을 처음부터 센다 */
export const 작전지문 = (트리: string, 폴더: string, 파일: string): string =>
  createHash('sha256').update(JSON.stringify([...작전글들(트리, 폴더, 파일)].sort(([a], [b]) => (a < b ? -1 : 1)))).digest('hex').slice(0, 16);

/** 이번 작성이 안 건드린 작전인가 — 돌린 기록이 하나도 없고 도우미 파일도 기준 그대로다(바뀐 = 기준과 다른 저장소 경로들) */
export const 안건드린작전 = (자료: string, 트리: string, 폴더: string, x: 작전, 바뀐: readonly string[]): boolean =>
  기록읽기(자료)[열쇠(폴더, x)] === undefined && ![...작전글들(트리, 폴더, x.파일).keys()].some((길) => 바뀐.includes(`tests/${길}`));

function 기록읽기(자료: string): 기록 {
  try {
    const 몸 = JSON.parse(안전히읽기(자료, 게임자리.이긴판, 글상한) ?? '{}') as unknown;
    return typeof 몸 === 'object' && 몸 !== null && !Array.isArray(몸) ? (몸 as 기록) : {};
  } catch {
    return {};
  }
}

/** 지금 도우미 글 · 지금 빌드로 센 판. 기록이 없거나 그 뒤 고쳤으면 0판 */
export function 이긴판읽기(자료: string, 트리: string, 폴더: string, x: 작전): 판수 {
  const 앞 = 기록읽기(자료)[열쇠(폴더, x)];
  const 수 = (v: unknown): number => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);
  return 앞 !== undefined && 앞.지문 === 작전지문(트리, 폴더, x.파일) && 앞.빌드 === (지금빌드(자료) ?? '') ? { 이김: 수(앞.이김), 짐: 수(앞.짐), ...(typeof 앞.출발 === 'number' ? { 출발: 앞.출발 } : {}) } : { 이김: 0, 짐: 0 };
}

export function 이긴판적기(자료: string, 트리: string, 폴더: string, x: 작전, 판: 판수): void {
  새로쓰기(join(자료, 게임자리.이긴판), JSON.stringify({ ...기록읽기(자료), [열쇠(폴더, x)]: { ...판, 지문: 작전지문(트리, 폴더, x.파일), 빌드: 지금빌드(자료) ?? '' } }, null, 1));
}

export const 다채웠나 = (판: 판수): boolean => 판.짐 === 0 && 판.이김 >= 채울판;
