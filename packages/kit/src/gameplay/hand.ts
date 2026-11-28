// 손 재기 — 판 행동기록에서 행동 하나에 드는 초와 걷는 속도를 재서 시뮬 모델에 넣는다 (도메인/게임 §3.10 「게임 정보 먼저 쌓기」 ④)
// 순서대로 하기가 판 도중 웨이브마다 다시 재고, 계산기 · 게이트가 판 기록에서 잰다. 파일을 안 읽는다
import { type 모델, type 행동종류, 행동종류들 } from './simInput.js';
import type { 행동 } from './sim.js';

/** 잰 판이 하나도 없을 때 행동 하나에 드는 초 — 첫 판 첫 웨이브만 이 값으로 돈다(순서대로 하기가 웨이브마다 잰 값으로 바꾼다) */
export const 행동초첫값 = 0.5;
/** 한 종류의 손 시간을 따로 재려면 그 종류 행동이 이만큼은 있어야 한다 */
const 종류표본 = 3;

export interface 잰손 { 행동초: number; 종류별?: Partial<Record<행동종류, number>>; 걷기속도?: number; 기록?: string }
const 수 = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const 가운데 = (들: number[]): number => Math.round([...들].sort((a, b) => a - b)[Math.floor(들.length / 2)]! * 100) / 100;

/**
 * 행동기록에서 손을 잰다 — 행동 하나에 든 초는 고르고 읽는 데 든 시간(초 → 시작초)과 도착해서 끝낼 때까지(도착초 → 끝초)의 합이고, 가운데 값을 쓴다.
 * 종류별은 그 종류가 셋 이상일 때만, 걷는 속도는 걸은 시간이 3초 이상일 때만 낸다. 잴 것이 없으면 null.
 * 안 된 행동(됨: false)은 안 잰다 — 시뮬에서는 안 된 행동이 없어 판이 실패를 기다린 시간이 손으로 잡힌다(16104 놓기 16.22초로 깬 맵이 「0 이김」)
 */
export function 손셈(모든: readonly 행동[]): Omit<잰손, '기록'> | null {
  const 들 = 모든.filter((x) => x.됨 !== false);
  const 초들 = 들.flatMap((x) => (x.끝초 === undefined ? [] : [{ 종류: x.행동, 초: x.끝초 - (x.도착초 ?? x.초) + ((x.시작초 ?? x.초) - x.초) }])).filter((v) => v.초 >= 0);
  if (초들.length === 0) return null;
  const 종류별: Partial<Record<행동종류, number>> = {};
  for (const k of 행동종류들) {
    const 것 = 초들.filter((x) => x.종류 === k).map((x) => x.초);
    if (것.length >= 종류표본) 종류별[k] = 가운데(것);
  }
  const 걸은 = 들.filter((x) => 수(x.걸음) && x.걸음 > 1 && x.도착초 !== undefined);
  const 걸은초 = 걸은.reduce((a, x) => a + (x.도착초! - (x.시작초 ?? x.초)), 0);
  return { 행동초: 가운데(초들.map((x) => x.초)), ...(Object.keys(종류별).length === 0 ? {} : { 종류별 }), ...(걸은초 >= 3 ? { 걷기속도: Math.round((걸은.reduce((a, x) => a + x.걸음!, 0) / 걸은초) * 100) / 100 } : {}) };
}

/** 근거가 빌드 데이터임을 뜻하는 머리 — 근거 검사(scripts 근거틀림)와 같은 값을 쓴다 */
export const 빌드머리 = '빌드 데이터:';

/**
 * 쓸 걷기속도 — 근거가 빌드 데이터면 그 값 그대로, 아니면 잰 속도가 느릴 때 잰 속도(지어낸 빠른 걷기를 막는다).
 * 판의 손은 길을 헤매다 막혀 돌아가 그 시간이 「느린 고양이」로 잡힌다(2026-11-29 사용자 · 16110 둘째 맵 2.92 가 빌드 8 을 덮어 이긴 맵이 0/967)
 */
export const 잰걷기 = (캐: 모델['캐릭터'], 잰속도: number | undefined): number =>
  캐.근거?.startsWith(빌드머리) === true ? 캐.걷기속도 : Math.min(캐.걷기속도, 잰속도 ?? Infinity);

/** 잰 손을 모델에 넣는다 — 지어낸 빠른 손을 막는다(입력이 잰 값보다 빠르면 잰 값 · 걷기는 잰걷기) */
export const 손넣기 = (m: 모델, 잰: Omit<잰손, '기록'>): 모델 => ({
  ...m,
  손: { 행동초: Math.max(m.손.행동초, 잰.행동초), ...(잰.종류별 === undefined ? {} : { 종류별: 잰.종류별 }) },
  캐릭터: { ...m.캐릭터, 걷기속도: 잰걷기(m.캐릭터, 잰.걷기속도) },
});
