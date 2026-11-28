// 판 함수를 순서대로 하기에 잇는 입구 — 이어 붙일 기록 만들기 · 판 함수가 돌려준 손동작 검사 · 조작 도우미가 부를 함수 (도메인/게임 §3.10 「순서대로 하기」 · follow.ts 가 300줄을 넘어 떼어 냈다)
import type { 규칙 } from './simInput.js';
import { type 손, type 따라간기록, type 따라갈, 따라가기 } from './follow.js';

const 함수인가 = (v: unknown): boolean => typeof v === 'function';
const 둥 = (v: number): number => Math.round(v * 100) / 100;

/** 새 기록 — 앞판을 주면(멈춰 둔 판을 이어 부를 때의 가장 새 판 기록) 그 판이 안 끝났을 때 이어 붙인다 */
export function 새기록(앞판?: { 이름: string; 따라감?: unknown }): 따라간기록 {
  const 앞 = (typeof 앞판?.따라감 === 'object' && 앞판.따라감 !== null ? 앞판.따라감 : {}) as Partial<따라간기록>;
  if (앞판 === undefined || !Array.isArray(앞.행동기록) || 앞.끝 !== undefined) return { 행동기록: [], 다시계산: [] };
  const 쓴개수 = { ...(앞.쓴개수 ?? {}) };
  for (const x of 앞.행동기록) if (x.행동 === '아이템' && x.됨 === true && x.대상 !== undefined) 쓴개수[x.대상] = (쓴개수[x.대상] ?? 0) + 1;
  const 갔던 = (Array.isArray(앞.다시계산) ? 앞.다시계산 : []).at(-1)?.웨이브;
  // 못 닿은 놓기(닿음: false)는 땅이 막은 것이 아니라 안 넘긴다. 맞추기 판을 이어 부르면 그대로 맞추기 판이다
  const 못놓음 = [...(앞.못놓음 ?? []), ...앞.행동기록.flatMap((x) => (x.행동 === '놓기' && x.됨 === false && x.닿음 !== false && x.자리 !== undefined ? [x.자리] : []))];
  return { 행동기록: [], 다시계산: [], 이어: 앞판.이름, 시작초: 둥((앞.시작초 ?? 0) + (앞.걸린초 ?? 0)), ...(갔던 === undefined ? {} : { 이어웨이브: 갔던 }), ...(Object.keys(쓴개수).length === 0 ? {} : { 쓴개수 }), ...(못놓음.length === 0 ? {} : { 못놓음 }), ...(typeof 앞.맞추기판 === 'string' ? { 맞추기판: 앞.맞추기판 } : {}) };
}

/** 판 함수가 돌려준 것이 손동작인가 — 읽기 셋과 걷기, 그리고 순서가 쓰는 행동마다 함수가 있어야 한다. 아니면 무엇이 빠졌나 */
export function 손읽기(v: unknown, 정책들: readonly 규칙[][]): 손 | string {
  const x = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
  const 쓰는 = new Set(정책들.flat().map((r) => r.행동.무엇 as string).filter((k) => k !== '이동'));
  // 적() 은 늘 있어야 한다 — 웨이브 중 다시 계산이 읽은 적 자리에서 잇는다. 없으면 남은 적이 길 처음에서 새로 나온다고 쳐 늘 낙관적이다(16105)
  const 빠진 = ['상태', '설치물', '떨어진', '적', '걷기', ...쓰는].filter((k) => !함수인가(x[k]));
  return 빠진.length === 0 ? (x as unknown as 손) : `판 함수가 손동작을 다 안 돌려줬다(빠진 것: ${빠진.join(' · ')}) — { 상태, 설치물, 떨어진, 적, 걷기, 놓기, 키우기, 먹이, 줍기, 공격, 아이템, 회복 } 가운데 순서가 쓰는 것을 함수로 돌려준다(지침 「게임플레이」 손동작)`;
}

/** 조작 도우미가 부를 함수 — 판 함수가 돌려준 손동작으로 순서대로 한다. 판에 못 들어갔다고 돌려주면({ 못들어감 }) 그대로 넘긴다(행동기록이 비어 판으로 안 센다) */
export const 순서대로함수 = (판함수: (game: unknown) => unknown, 갈: 따라갈, 기록: 따라간기록) => async (game: unknown): Promise<unknown> => {
  const 준 = await 판함수(game);
  if (typeof 준 === 'object' && 준 !== null && '못들어감' in 준) return 준;
  const 손 = 손읽기(준, [갈.정책, ...갈.버금]);
  if (typeof 손 === 'string') throw new Error(손);
  return 따라가기(손, 갈, 기록);
};
