// 정기 실행 세트 마법사의 계산 — 담은 줄 열쇠 · 실행을 만드는 애플리케이션 · 기준 세트 꼴 · 겹치는 세트 · 보낼 본문 (도메인/정기실행 §3.16 · §7 · §8.20)

import type { 세트, 세트본문, 줄종류 } from './schedApi.js';
import { 다음날들, 도는날인가, 분, 시간대로 } from './schedView.js';

export type 담은줄 = 세트['items'][number];
export type 반복 = 'daily' | 'days' | 'once';

/** 마법사가 드는 값 — 저장 전까지 화면에만 있다 */
export interface 마법사값 {
  name: string;
  items: 담은줄[];
  /** 애플리케이션 접두사 → 대상 서버 이름 */
  envs: Record<string, string>;
  반복: 반복;
  days: number[];
  onceOn: string;
  at: string;
  기준: boolean;
}

/** 단계 화면이 마법사 값의 일부만 바꿀 때 */
export type 덮을값 = Partial<마법사값>;

/** 담을 후보 (§7 GET /api/sched/candidates) */
export interface 후보 {
  services: { prefix: string; name: string; kind: string; fn: number; ui: number }[];
  scenarios: { id: number; name: string; service: string; path: string[]; runnable: boolean }[];
  compatSets: { id: number; name: string; service: string }[];
}

/** 같은 줄인지 — 기능 · UI 는 애플리케이션마다 한 줄, E2E · 호환성은 시나리오 · 호환성 세트마다 한 줄 */
export function 줄열쇠(x: { kind: 줄종류; service: string; scenarioId?: number; compatSetId?: number }): string {
  if (x.kind === 'E2E') return `E2E|${String(x.scenarioId)}`;
  if (x.kind === 'COMPAT') return `COMPAT|${String(x.compatSetId)}`;
  return `${x.kind}|${x.service}`;
}

/** 실행을 만드는 애플리케이션 (§3.16 「대상 서버는 실행을 만드는 애플리케이션마다 하나다」) — E2E 는 시나리오의 지금 시작 애플리케이션 */
export function 실행앱들(items: readonly 담은줄[], 후: 후보 | null): string[] {
  const 시작 = (x: 담은줄) => (x.kind === 'E2E' ? (후?.scenarios.find((s) => s.id === x.scenarioId)?.service ?? x.service) : x.service);
  return [...new Set(items.map(시작))];
}

/** 다른 애플리케이션을 지나가는 E2E 가 있나 — 3단계 안내 한 줄 */
export const 섞인E2E있나 = (items: readonly 담은줄[], 후: 후보 | null) =>
  items.some((x) => x.kind === 'E2E' && (후?.scenarios.find((s) => s.id === x.scenarioId)?.path ?? []).some((p) => p !== x.service));

/** 기준 세트의 꼴 — 한 애플리케이션의 기능 · UI 줄만 · 매일 또는 요일 (§3.16 「기준 세트의 꼴」). 맞으면 그 접두사 */
export function 기준꼴(items: readonly Pick<담은줄, 'kind' | 'service'>[], days: readonly number[] | null): string | null {
  const 앱들 = new Set(items.map((x) => x.service));
  if (days === null || items.length === 0 || 앱들.size !== 1 || items.some((x) => x.kind !== 'FN' && x.kind !== 'UI')) return null;
  return items[0]!.service;
}

/** 이 애플리케이션에 다른 기준 세트가 이미 있나 — 있으면 「안정화 지표에 씁니다」가 서지 않는다 (§7 baseable) */
export const 다른기준있나 = (세트들: readonly 세트[], 앱: string, 내번호: number | null) =>
  세트들.some((s) => s.isBase && s.id !== 내번호 && 기준꼴(s.items, s.days) === 앱);

export const 보낼days = (v: 마법사값): number[] | null => (v.반복 === 'once' ? null : v.반복 === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [...v.days].sort((a, b) => a - b));

/** 같은 날 돌 수 있는가 — 요일끼리 · 한 번만 날짜의 요일 · 날짜끼리 */
function 같은날있나(a: { days: number[] | null; onceOn: string | null }, b: { days: number[] | null; onceOn: string | null }): boolean {
  if (a.onceOn !== null && b.onceOn !== null) return a.onceOn === b.onceOn;
  if (a.onceOn !== null) return 도는날인가(b, a.onceOn);
  if (b.onceOn !== null) return 도는날인가(a, b.onceOn);
  return (a.days ?? []).some((d) => (b.days ?? []).includes(d));
}

/**
 * 겹칠 수 있는 세트 (§3.16 결정 9) — 켜진 다른 세트 가운데 같은 날 돌고 [시각, 시각 + 지난 평균] 이 서로 걸치는 것. 평균을 모르면 그 시각 한 점이다.
 * ponytail: 세트마다 시간대가 달라도 하루 안 분으로 견준다 — 달력의 대기 예상(schedView 칩들)과 같은 한계다
 */
export function 겹치는세트들(세트들: readonly 세트[], 나: { id: number | null; at: string; days: number[] | null; onceOn: string | null; avgMinutes: number | null }): 세트[] {
  const 내시작 = 분(나.at);
  const 내끝 = 내시작 + (나.avgMinutes ?? 0);
  return 세트들.filter((s) => {
    if (s.id === 나.id || !s.isOn || !같은날있나(s, 나)) return false;
    const 시작 = 분(s.at);
    return 시작 <= 내끝 && 내시작 <= 시작 + (s.avgMinutes ?? 0);
  });
}

/** 확인 단계의 다음 실행 셋 — 저장한 그날 지난 시각이면 다음 날부터다 (§3.16 「저장한 그날」) */
export function 다음실행들(v: 마법사값, tz: string, 지금: Date): string[] {
  // 「한 번만」은 날짜 하나를 바로 견준다 — 1년 넘게 앞선 날짜도 지난 날로 읽지 않게
  if (v.반복 === 'once') {
    const 오늘 = 시간대로(지금, tz);
    return v.onceOn > 오늘.날 || (v.onceOn === 오늘.날 && 분(v.at) > 오늘.분) ? [v.onceOn] : [];
  }
  return 다음날들({ isOn: true, tz, at: v.at, days: 보낼days(v), onceOn: null }, 지금, 3);
}

/** POST · PUT 본문 (§7). tz 는 만들 때만 싣는다 */
export function 본문(v: 마법사값, 실행앱: readonly string[]): 세트본문 {
  const days = 보낼days(v);
  return {
    name: v.name.trim(),
    at: v.at,
    ...(days === null ? { onceOn: v.onceOn } : { days }),
    items: v.items.map((x) =>
      x.kind === 'E2E' ? { kind: x.kind, scenarioId: x.scenarioId } : x.kind === 'COMPAT' ? { kind: x.kind, compatSetId: x.compatSetId } : { kind: x.kind, service: x.service, tcIds: x.tcIds },
    ),
    envs: 실행앱.flatMap((service) => (v.envs[service] === undefined ? [] : [{ service, env: v.envs[service]! }])),
  };
}

/** 수정이면 그 세트의 값, 아니면 빈 값 — 시각 02:00 · 매일 · 한 번만 날짜는 오늘 */
export function 처음값(세트: 세트 | null, 오늘: string): 마법사값 {
  if (세트 === null) return { name: '', items: [], envs: {}, 반복: 'daily', days: [], onceOn: 오늘, at: '02:00', 기준: false };
  const days = 세트.days ?? [];
  return {
    name: 세트.name,
    items: 세트.items,
    envs: Object.fromEntries(세트.envs.map((e) => [e.service, e.env])),
    반복: 세트.onceOn !== null ? 'once' : days.length === 7 ? 'daily' : 'days',
    days,
    onceOn: 세트.onceOn ?? 오늘,
    at: 세트.at,
    기준: 세트.isBase,
  };
}

/** 오늘 요일부터가 아니라 월요일부터 — 요일 단추 차례 (§8.20 「한 주는 월요일부터다」) */
export const 요일차례 = [1, 2, 3, 4, 5, 6, 0];
