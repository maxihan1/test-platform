// 케이스 목록을 기능 묶음 덩어리로 가르고 왼쪽 목차 칸을 짓는다 (도메인/카탈로그 §8.1 「목차」)
// 2026-11-11 시안 B — 앞 판은 기능 묶음 › 화면 › 화면 조각 세 단 머리를 줄 사이에 끼워 접고 폈다. 화면 · 화면 조각은 상세 서랍으로 갔다
// 차례는 서버가 정한다 — 화면은 받은 줄 차례 그대로 이웃끼리 묶음이 바뀌는 곳에서 덩어리를 가를 뿐이다 (§8.1 「목록 화면이 지킬 것 셋」)

import type { CaseGroup, CaseRow } from './api.js';

/** 파일 경로에서 이름만 — `tests/mkt/pages/signup.page.ts` → `signup` */
export function 파일이름(file: string): string {
  return (file.split('/').at(-1) ?? file).replace(/\.(page|component)\.ts$/, '');
}

/** 묶음이 없는 케이스의 목차 열쇠 — 기능 묶음 이름은 빈 글자일 수 없다(PRD 상한 검사) */
export const 묶음없음열쇠 = '';
const 열쇠of = (feature: string | null) => feature ?? 묶음없음열쇠;

export interface 묶음덩어리 {
  열쇠: string;
  /** 기능 묶음 이름. null 은 PRD 에 연결되지 않은 케이스다 */
  feature: string | null;
  rows: CaseRow[];
}

/** 조건에 맞는 전부(쪽 밖까지)의 기능 묶음 — 목차 차례 · 건수다. 서버 번호표는 화면 · 조각으로 잘게 나뉘어 와서 기능 묶음으로 모은다 */
export function 기능묶음들(groups: CaseGroup[] | undefined, 묶음보임: boolean): { 열쇠: string; feature: string | null; tcIds: string[] }[] {
  if (!묶음보임 || groups === undefined) return [];
  const 표 = new Map<string, { 열쇠: string; feature: string | null; tcIds: string[] }>();
  for (const g of groups) {
    const 열쇠 = 열쇠of(g.feature);
    const 칸 = 표.get(열쇠) ?? { 열쇠, feature: g.feature, tcIds: [] };
    칸.tcIds.push(...g.tcIds);
    표.set(열쇠, 칸);
  }
  return [...표.values()];
}

/**
 * 받은 줄을 기능 묶음 덩어리로 가른다. 서비스가 PRD 를 안 쓰면(묶음보임 — 서버 hasFeatures) 덩어리 하나에 이름표 없이 선다.
 * 번호표에 없는 줄(받는 사이 스캔으로 생긴 줄)은 앞 덩어리에 붙인다 — 이름표 없는 덩어리가 중간에 서면 위 묶음 것으로 읽힌다
 */
export function 덩어리들(rows: CaseRow[], groups: CaseGroup[] | undefined, 묶음보임: boolean): 묶음덩어리[] {
  if (!묶음보임 || groups === undefined || groups.length === 0) return rows.length === 0 ? [] : [{ 열쇠: 묶음없음열쇠, feature: null, rows }];
  const 자리 = new Map<string, string | null>();
  for (const g of groups) for (const id of g.tcIds) 자리.set(id, g.feature);
  const 덩어리: 묶음덩어리[] = [];
  for (const row of rows) {
    const 앞 = 덩어리.at(-1);
    const feature = 자리.has(row.tcId) ? 자리.get(row.tcId)! : (앞?.feature ?? null);
    if (앞 !== undefined && 앞.feature === feature) 앞.rows.push(row);
    else 덩어리.push({ 열쇠: 열쇠of(feature), feature, rows: [row] });
  }
  return 덩어리;
}
