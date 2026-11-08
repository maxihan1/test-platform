// 호환성 화면의 판단 — 디바이스 요약 · 같은 모델 거르기 · 칸 글자 · 화면 커버리지 퍼센트 (도메인/호환성 §3.13 「디바이스 · 점검 상태」 · §8.17)
// 화면 조각은 Compat*.tsx, 판단은 여기

import type { CompatCoverage, CompatDevice, 디바이스상태 } from './compatApi.js';

export type 형태 = 'phone' | 'foldable' | 'tablet';

/** 비전이 형태를 못 읽었으면 폰으로 본다 (§3.13 「디바이스 · 점검 상태」) */
export const 형태로 = (d: Pick<CompatDevice, 'formFactor'>): 형태 => d.formFactor ?? 'phone';

/** 영어 표의 키다 */
export const 형태글자: Record<형태, string> = { phone: '디바이스', foldable: '폴더블', tablet: '태블릿' };

/** 비전 상태 넷. 점검 중 · 연결 끊김은 잡을 수 없어 고르지 못한다 (§8.17 ②-1). 영어 표의 키다 */
export const 상태글자: Record<디바이스상태, string> = { IDLE: '사용 가능', OCCUPIED: '사용 중', MAINTENANCE: '점검 중', OFFLINE: '연결 끊김' };

export const 잠겼나 = (d: Pick<CompatDevice, 'state'>): boolean => d.state === 'MAINTENANCE' || d.state === 'OFFLINE';

/** Android 버전 앞 숫자. 비전은 `14` · `14.0` 꼴로 주지만 숫자가 없으면 null — 거르는 칩 · 범위에서 빠진다 */
export function 안드로이드(os: string): number | null {
  const m = /\d+/.exec(os);
  return m === null ? null : Number(m[0]);
}

/** 폴더블은 내장 화면을 큰 것부터 다 보인다 — 펼침 · 접힘 화면이 다르다 */
export const 해상도글 = (d: Pick<CompatDevice, 'resolution' | 'displays'>): string =>
  d.displays !== undefined && d.displays.length > 1 ? d.displays.map((x) => x.size).join(' · ') : d.resolution;

/** 못 읽은 칸은 `-` 다 (§3.13 「디바이스 · 점검 상태」) */
export const 인치글 = (d: Pick<CompatDevice, 'inches' | 'displays'>): string =>
  d.displays !== undefined && d.displays.length > 1 ? d.displays.map((x) => `${String(x.inches)}″`).join(' · ') : d.inches === undefined ? '-' : `${String(d.inches)}″`;

export interface 디바이스요약 {
  /** `12 ~ 15` · `14`. 읽은 버전이 없으면 null */
  android: string | null;
  형태수: { 형태: 형태; 수: number }[];
  폴더블: number;
  해상도: number;
  제조사: { 이름: string; 수: number }[];
}

/** 세트 디바이스 구획 머리 · 디바이스 선택 상자 바닥의 요약 (§8.17 ② · ②-1) */
export function 요약(목록: readonly CompatDevice[]): 디바이스요약 {
  const 버전들 = 목록.flatMap((d) => {
    const v = 안드로이드(d.os);
    return v === null ? [] : [v];
  });
  const 낮 = Math.min(...버전들);
  const 높 = Math.max(...버전들);
  const 셈 = <K extends string>(키들: K[]) => {
    const m = new Map<K, number>();
    for (const k of 키들) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const 형태셈 = 셈(목록.map(형태로));
  return {
    android: 버전들.length === 0 ? null : 낮 === 높 ? String(낮) : `${String(낮)} ~ ${String(높)}`,
    형태수: (['phone', 'foldable', 'tablet'] as const).flatMap((형) => (형태셈.has(형) ? [{ 형태: 형, 수: 형태셈.get(형)! }] : [])),
    폴더블: 형태셈.get('foldable') ?? 0,
    해상도: new Set(목록.map(해상도글)).size,
    // 많은 차례, 같으면 이름 차례 — 시안 `Samsung 9 · Google 2 · LG 1`
    제조사: [...셈(목록.map((d) => d.manufacturer || '-'))].map(([이름, 수]) => ({ 이름, 수 })).sort((a, b) => b.수 - a.수 || a.이름.localeCompare(b.이름)),
  };
}

/** 요약을 글 조각으로 — 세트 화면은 알약 하나씩, 선택 상자 바닥은 한 줄로 잇는다. 시안 `Android 12 ~ 15 · 폰 9 · 폴더블 2 · 태블릿 1 · 해상도 7종 · Samsung 9 · Google 2` */
export function 디바이스요약글(셈: 디바이스요약, t: (키: string, 값?: Record<string, string | number>) => string): string[] {
  return [
    ...(셈.android === null ? [] : [t('Android {범위}', { 범위: 셈.android })]),
    셈.형태수.map((x) => `${t(형태글자[x.형태])} ${String(x.수)}`).join(' · '),
    t('해상도 {수}종', { 수: 셈.해상도 }),
    셈.제조사.map((x) => `${x.이름} ${String(x.수)}`).join(' · '),
  ].filter((글) => 글 !== '');
}

/**
 * 「같은 모델은 1대만」을 켰을 때 고를 수 없는 디바이스(같은 모델의 두 번째부터).
 * 모델마다 대표 하나만 고를 수 있다 — 이미 고른 것이 있으면 그것, 없으면 목록에서 먼저 나온 것이다.
 * 고른 것을 대표로 두지 않으면 세트를 다시 열 때 고른 디바이스가 흐려져 풀 수도 없게 된다
 */
export function 같은모델들(목록: readonly CompatDevice[], 고른: ReadonlySet<string>): Set<string> {
  const 대표 = new Map<string, string>();
  for (const d of 목록) if (고른.has(d.serial) && !대표.has(d.model)) 대표.set(d.model, d.serial);
  for (const d of 목록) if (!대표.has(d.model)) 대표.set(d.model, d.serial);
  return new Set(목록.filter((d) => 대표.get(d.model) !== d.serial).map((d) => d.serial));
}

/** 「같은 모델은 1대만」을 켜면 고른 것에서 같은 모델의 두 번째부터를 뺀다 — 서버도 같은 모델 둘을 거절한다 */
export function 모델별하나만(목록: readonly Pick<CompatDevice, 'serial' | 'model'>[], 고른: readonly string[]): string[] {
  const 모델 = new Map(목록.map((d) => [d.serial, d.model]));
  const 본 = new Set<string>();
  return 고른.filter((s) => {
    const m = 모델.get(s) ?? s;
    if (본.has(m)) return false;
    본.add(m);
    return true;
  });
}

/** 다 덮기 전에는 100% 로 올리지 않는다 — 33 / 34 가 「100%」로 보이면 미커버 화면을 놓친다 */
export const 커버율 = (c: Pick<CompatCoverage, 'covered' | 'total'>): number => (c.total === 0 ? 0 : Math.floor((c.covered * 100) / c.total));
