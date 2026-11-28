// 게임 맵 훑기 파일 — authoring-game-nav.ts 가 남기고 길찾기 격자(authoring-game-path.ts)와 시뮬 계산이 읽는다(둘이 서로를 가져오지 않게 떼어 냈다) (도메인/게임 §3.10 「맵 파악」)
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type 점 = readonly [number, number];

/** 못 심는 곳 하나 — 돌린 상자(중심 · 반 변 · y 축 각도) 또는 원 */
export type 막음모양 = { 중심: 점; 반: 점; 각: number } | { 중심: 점; 반지름: number };
/** 자료 폴더에 남기는 맵 훑기 — 열림 · 막힘은 칸 번호(i, j · 칸크기 단위), 끊김이면 다 못 물은 것(나머지는 모름으로 둔다) */
/** 풀림 — 묻는 동안 멈춤이 풀려 다시 멈춘 때(몇 번째 물음 · 초 · 그때 캐릭터 자리 x,y,z) */
export interface 맵훑기 { 곳: string; 칸크기: number; 열림: Array<[number, number]>; 막힘: Array<[number, number]>; 끊김: boolean; 못심음: 막음모양[]; 캐릭터: string; 때: string; 풀림?: Array<{ 물은수: number; 초: number; 자리: readonly number[] }> }

/** 곳 열쇠를 파일 이름으로 — 바꾼 글자가 겹쳐도(stage:1 · stage 1) 다른 파일이 되게 열쇠 해시를 붙인다 */
export const 훑기파일 = (자료: string, 곳: string): string => join(자료, 'game-nav', `${곳.replace(/[^\p{L}\p{N}_-]+/gu, '_')}-${createHash('sha256').update(곳).digest('hex').slice(0, 8)}.json`);

/** 자료 폴더의 그 곳 맵 훑기 — 없거나 꼴이 틀리면 null */
export function 훑기읽기(자료: string, 곳: string): 맵훑기 | null {
  try {
    const v = JSON.parse(readFileSync(훑기파일(자료, 곳), 'utf8')) as 맵훑기;
    return v.곳 === 곳 && typeof v.칸크기 === 'number' && Array.isArray(v.열림) && Array.isArray(v.막힘) && Array.isArray(v.못심음) ? v : null;
  } catch {
    return null;
  }
}

/** 점이 못 심는 곳 안인가 — 상자는 y 축 각도만큼 되돌려 본다(Unity 는 위에서 볼 때 시계 방향) */
export function 막음안(모양: 막음모양, p: 점): boolean {
  const dx = p[0] - 모양.중심[0];
  const dz = p[1] - 모양.중심[1];
  if ('반지름' in 모양) return Math.hypot(dx, dz) <= 모양.반지름;
  const r = (모양.각 * Math.PI) / 180;
  const [c, s] = [Math.cos(r), Math.sin(r)];
  return Math.abs(dx * c - dz * s) <= 모양.반[0] && Math.abs(dx * s + dz * c) <= 모양.반[1];
}
