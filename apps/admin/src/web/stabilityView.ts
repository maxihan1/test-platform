// 안정화 지표 화면의 판단 — 상태 칩 · 발생 케이스 글 · 추이 그래프 좌표. 그림은 Stability*.tsx (도메인/안정화 §8.19)

import type { 오류상세, 추이점 } from './stabilityApi.js';

/** `2026-11-12` → `11-12`. 서버가 정기 실행 시간대로 굳힌 날이라 Date 를 거치지 않는다 (§3.15 「하루의 경계」) */
export const 날글자 = (day: string): string => day.slice(5);

/**
 * 요약을 끝낸 날과 시각 — `{ 날: '11-12', 시각: '03:42' }`. 화면의 다른 날짜처럼 정기 실행 시간대로 읽는다 —
 * 보는 사람 시계로 읽으면 요약 날짜가 그 실행 날짜와 하루 어긋나 보일 수 있다 (§3.15 「하루의 경계」). 시간대가 없으면(정기 실행 꺼짐) 보는 사람 시계다
 */
export function 작성시각(iso: string, tz: string | undefined): { 날: string; 시각: string } {
  const 칸 = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { 날: `${칸.month}-${칸.day}`, 시각: `${칸.hour}:${칸.minute}` };
}

/** 최초 발생 칸 — `11-12 · #22`. 빌드 번호가 없는 실행(웹 대부분)은 날짜만 */
export const 최초발생글 = (day: string, buildNo: string | null): string => (buildNo === null ? 날글자(day) : `${날글자(day)} · #${buildNo}`);

/**
 * 발생 케이스 칸 — `ARG-FN-112 외 3건`. 둘이면 `ARG-FN-207 · 208` 처럼 같은 앞부분을 한 번만 쓴다.
 * 「외 N건」은 화면이 번역하므로 [앞 글, 남은 수] 로 돌려준다 — 남은 수가 0 이면 앞 글이 전부다
 */
export function 케이스글(tcIds: string[]): [string, number] {
  const [첫, 둘] = tcIds;
  if (첫 === undefined) return ['—', 0];
  if (둘 === undefined) return [첫, 0];
  if (tcIds.length > 2) return [첫, tcIds.length - 1];
  const 앞 = (번호: string) => 번호.replace(/\d+$/, '');
  return [앞(첫) === 앞(둘) && 앞(둘) !== 둘 ? `${첫} · ${둘.slice(앞(둘).length)}` : `${첫} · ${둘}`, 0];
}

export interface 그림틀 {
  폭: number;
  높이: number;
  /** 첫 점 · 마지막 점의 x. 오른쪽은 마지막 값(`9종`)을 쓸 자리를 남긴다 */
  왼: number;
  오른: number;
  위: number;
  바닥: number;
  막대폭: number;
}

/** 시안 6판 A6 · A6m 의 그림 크기 */
export const PC틀: 그림틀 = { 폭: 960, 높이: 244, 왼: 60, 오른: 876, 위: 20, 바닥: 190, 막대폭: 16 };
export const 폰틀: 그림틀 = { 폭: 360, 높이: 214, 왼: 34, 오른: 320, 위: 16, 바닥: 166, 막대폭: 12 };
/** 상세 「발생 케이스 추이」 — PC · 휴대폰 같은 크기다(Detail6 · Detail6m). 오른쪽은 마지막 값(`4건`)을 쓸 자리를 남긴다 */
export const 상세틀: 그림틀 = { 폭: 360, 높이: 124, 왼: 34, 오른: 316, 위: 16, 바닥: 96, 막대폭: 0 };

/** 상세 7일 점을 추이 그림 재료로 — 발생 케이스를 선으로만 그린다 */
export const 상세점들 = (trend: 오류상세['trend']): 추이점[] =>
  trend.map((p, i) => ({ day: p.day, runId: i, residual: p.cases, newErrors: 0, buildNo: null, buildChanged: false }));

export interface 발생케이스 {
  tcId: string;
  name: string;
  /** 그 케이스의 발생 항목이 다 통과면 통과다 — 디바이스 · 반복으로 항목이 여럿이면 하나라도 실패면 실패 (§7 passCases 와 같은 셈) */
  통과: boolean;
  /** 오류가 난 단계 번호들. 모르면(앱 logcat) 빈 목록이다 */
  단계: number[];
  크래시: boolean;
}

/** 발생 항목을 케이스 하나에 한 줄로 묶는다. 서버가 케이스 번호 차례로 준다 (§8.19 「발생 케이스 · 단계」) */
export function 케이스로묶기(줄들: 오류상세['occurrences']): 발생케이스[] {
  const 묶음 = new Map<string, 발생케이스>();
  for (const o of 줄들) {
    const 있던 = 묶음.get(o.tcId) ?? { tcId: o.tcId, name: o.name, 통과: true, 단계: [], 크래시: false };
    있던.통과 &&= o.status === 'PASS';
    있던.크래시 ||= o.crash;
    if (o.seq !== null && !있던.단계.includes(o.seq)) 있던.단계.push(o.seq);
    묶음.set(o.tcId, 있던);
  }
  return [...묶음.values()].map((c) => ({ ...c, 단계: [...c.단계].sort((a, b) => a - b) }));
}

export interface 추이그림 {
  눈금: { 값: number; y: number }[];
  점: (추이점 & { x: number; y: number; 막대y: number })[];
  선: string;
  면: string;
}

const 자리 = (n: number) => n.toFixed(1);

/**
 * 잔여 오류 선 · 그 아래 면 · 신규 오류 막대의 좌표 (§3.15 「일별 추이」 · 결정 9).
 * 세로 눈금은 넷(0 · ⅓ · ⅔ · 꼭대기)이고 꼭대기는 가장 큰 값보다 한 칸 이상 높은 3의 배수다 — 선이 판 위 끝에 붙지 않게.
 * 점 사이는 가로 가운데를 손잡이로 둔 곡선이다(대시보드 12판과 같은 꼴)
 */
export function 추이그림(점들: 추이점[], 틀: 그림틀): 추이그림 {
  const 최대 = Math.max(0, ...점들.flatMap((p) => [p.residual, p.newErrors]));
  const 꼭대기 = Math.ceil((최대 + 1) / 3) * 3;
  const y = (v: number) => 틀.바닥 - (v / 꼭대기) * (틀.바닥 - 틀.위);
  const x = (i: number) => (점들.length === 1 ? (틀.왼 + 틀.오른) / 2 : 틀.왼 + (i * (틀.오른 - 틀.왼)) / (점들.length - 1));
  const 점 = 점들.map((p, i) => ({ ...p, x: x(i), y: y(p.residual), 막대y: y(p.newErrors) }));
  const 선 = 점
    .map((p, i) => {
      if (i === 0) return `M${자리(p.x)} ${자리(p.y)}`;
      const 앞 = 점[i - 1]!;
      const 가운데 = 자리((앞.x + p.x) / 2);
      return `C${가운데} ${자리(앞.y)} ${가운데} ${자리(p.y)} ${자리(p.x)} ${자리(p.y)}`;
    })
    .join(' ');
  const 첫 = 점[0];
  const 끝 = 점.at(-1);
  const 면 = 첫 === undefined || 끝 === undefined ? '' : `${선} L${자리(끝.x)} ${자리(틀.바닥)} L${자리(첫.x)} ${자리(틀.바닥)} Z`;
  const 눈금 = [3, 2, 1, 0].map((k) => ({ 값: (꼭대기 * k) / 3, y: y((꼭대기 * k) / 3) }));
  return { 눈금, 점, 선, 면 };
}

/**
 * 날짜 글자를 쓸 점인가. 휴대폰은 처음 · 가운데 · 끝 셋, PC 는 일곱 점까지 다 쓰고 그보다 많으면(30일) 끝에서 거꾸로 같은 간격만 쓴다 —
 * 마지막 날(고른 날)은 늘 보이고 글자끼리 겹치지 않는다
 */
export function 날짜보임(i: number, n: number, 휴대폰: boolean): boolean {
  if (휴대폰) return i === 0 || i === n - 1 || i === Math.floor((n - 1) / 2);
  if (n <= 7) return true;
  return (n - 1 - i) % Math.ceil(n / 7) === 0;
}
