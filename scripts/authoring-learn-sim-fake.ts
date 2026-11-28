// 게임플레이 진행 조건 테스트가 같이 쓰는 준비 — 임시 자료 폴더(테스트마다 새로) · 시뮬 입력 본보기 · 지도 줄 · 계산 줄 · 판 기록 쓰기
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach } from 'vitest';

import { 시뮬, 줄초안 } from './authoring-game-calc.js';
import { 시뮬막기 } from './authoring-learn-sim.js';

/** 테스트마다 새로 만드는 자료 폴더 — 가져간 쪽에서도 바뀐 값이 보인다 */
export let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-sim-'));
  mkdirSync(join(자료, 'game-calc'));
  mkdirSync(join(자료, 'game-play'));
  writeFileSync(join(자료, 'game-build-data.json'), JSON.stringify({ PlaceData: { Radius: 0.5 } }));
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

export const 곳 = 'stage:시험';
export const 웨 = (보스 = false) => ({ ...(보스 ? { 보스: true } : {}), 쉬는초: 1, 출현: [{ 종류: '슬라임', 수: 1, 간격: 0, 길: '가' }] });
export const 입력 = (덧: Record<string, unknown> = {}): Record<string, unknown> => ({
  계산: '시뮬', 곳,
  지킬것: { 체력: 5, 자리: [10, 0] },
  길: { 가: [[0, 0], [10, 0]] },
  적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }],
  웨이브: [웨(), 웨(), 웨(true)],
  설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }],
  설치물둘레: { 반경: 0.5, 근거: '빌드 데이터:PlaceData' },
  자리후보: [[5, 1]],
  캐릭터: { 자리: [5, 1], 걷기속도: 1 },
  재화: { 시작: 0 },
  볼값연결: { 웨이브: '웨이브', 지킬것: '세계수' },
  정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }],
  ...덧,
});
export type 줄 = { kind: string; key: string; learned: { text: string; belief: string; data: Record<string, unknown> } | null };
export const 줄 = (kind: string, key: string, data: Record<string, unknown>): 줄 => ({ kind, key, learned: { text: 'ㄱ', belief: 'GUESS', data } });
export const 곳줄 = (data: Record<string, unknown> = {}) => 줄('STAGE', 곳, { 맵: { 적: { 주소: '/s', 값: [[0, 0]], 본때: 'a' } }, ...data });
export const 계획줄 = 줄('TRIAL', 'trial:가', { 곳 });

/** 입력 파일을 쓰고 계산기로 돌려 지도에 적을 CALC 줄을 만든다 */
export function 계산줄(이름: string, x: Record<string, unknown>): 줄 {
  const 경로 = join(자료, 'game-calc', `${이름}.json`);
  const 글 = JSON.stringify(x);
  writeFileSync(경로, 글);
  const r = 시뮬(x, { 경로, 글 });
  if ('틀림' in r) throw new Error(r.틀림);
  return 줄초안({ ...r, 이름 }, x) as unknown as 줄;
}
export const 지도쓰기 = (들: 줄[]): void => {
  writeFileSync(join(자료, 'game-map.txt'), '');
  writeFileSync(join(자료, 'game-learned.json'), JSON.stringify({ elements: 들.map((x) => ({ ...x, name: x.key })) }));
};
export const 계획 = { 곳, 쓸것: ['calc:가'], 볼값: [{ 이름: '웨이브', 주소: '/w' }, { 이름: '세계수', 주소: '/t' }] };
export const 정책 = (c: 줄): unknown => (c.learned!.data.결과 as { 정책: unknown }).정책;
export const 판쓰기 = (이름: string, 행동기록: unknown[], 계산: Record<string, string>, 어긋남: unknown = null, 웨이브 = 3, 때: unknown[] = [{ 초: 0, 값: { 웨이브: 1 } }, { 초: 2, 값: { 웨이브 } }]): void =>
  writeFileSync(join(자료, 'game-play', `${이름}.json`), JSON.stringify({ 값: { 이김: false }, 따라감: { 행동기록, 다시계산: [], 걸린초: Math.max(0, ...(때 as { 초: number }[]).map((t) => t.초)) }, 값기록: { 계획: 'trial:가', 볼값: [], 간격ms: 2000, 때, 어긋남, 화면다름: [], 계산 } }));
export const 막기 = (계: typeof 계획, 들: 줄[], 자: string, 기: Parameters<typeof 시뮬막기>[3]) => 시뮬막기(계, 들 as never, 자, 기);
// 재현 시뮬은 7.5초에 놓은 탑이 슬라임을 한 번만 때려 10초쯤 세계수 5 를 다 잃고 진다
export const 늦게놓음 = [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 도착초: 6, 끝초: 7.5 }];
export const 세계수때 = (끝초: number, 진초: number) => Array.from({ length: 끝초 / 2 + 1 }, (_, i) => ({ 초: i * 2, 값: { 웨이브: 1, 세계수: i * 2 >= 진초 ? 0 : 5 } }));
export const 기록들 = async () => (await import('./authoring-learn-check.js')).판기록들(자료);
