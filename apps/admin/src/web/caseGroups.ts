// 케이스 목록 줄 사이에 끼울 묶음 머리(기능 묶음 > 화면 > 화면 조각)를 짓는다 (도메인/카탈로그 §8.1 「맥락」)
// 차례는 서버가 정한다 — 화면은 받은 줄 차례 그대로 이웃끼리 자리가 바뀌는 곳에 머리를 끼울 뿐이다 (§8.1 「목록 화면이 지킬 것 셋」)

import { useState } from 'react';

import type { CaseGroup, CaseRow } from './api.js';
import type { 묶음자리 } from './CaseListFilter.js';

export interface 묶음머리 {
  단: 1 | 2 | 3;
  열쇠: string;
  /** 1단은 기능 묶음 이름(없으면 null), 2 · 3단은 화면 파일 경로 */
  값: string | null;
  /** 그 묶음 화면의 주소(2 · 3단) — 없으면 파일 이름을 보인다 */
  주소: string | null;
  tcIds: string[];
  /** 이 묶음의 앞 케이스가 앞 쪽에 있다 */
  이어짐: boolean;
  조건: 묶음자리;
  /** 펴고 접는 데 같이 따르는 위 묶음들의 열쇠 */
  위: string[];
}

export type 목록칸 = { 머리: 묶음머리; 위: string[] } | { row: CaseRow; 위: string[] };

/** 파일 경로에서 이름만 — `tests/mkt/pages/signup.page.ts` → `signup` */
export function 파일이름(file: string): string {
  return (file.split('/').at(-1) ?? file).replace(/\.(page|component)\.ts$/, '');
}

export const 번호들 = (rows: CaseRow[]): ReadonlySet<string> => new Set(rows.map((row) => row.tcId));

const 열쇠 = (...조각: (string | null | undefined)[]) => 조각.map((x) => x ?? '').join('\u0000');

/**
 * 접은 머리 — 쪽을 넘겨도 남는다(같은 묶음이 다음 쪽으로 이어진다).
 * 「모두 접기」는 이 쪽이 아니라 서버가 준 기능 묶음 전부를 접는다 — 다음 쪽에서 펴진 묶음이 다시 나오지 않게
 */
export function use묶음접기(groups: CaseGroup[] | undefined, 묶음보임: boolean) {
  const [접은, set접은] = useState<ReadonlySet<string>>(new Set());
  const 첫단 = 묶음보임 ? [...new Set((groups ?? []).map((g) => 열쇠('f', g.feature)))] : [];
  const 다접었나 = 첫단.length > 0 && 첫단.every((k) => 접은.has(k));
  return {
    접은,
    /** 기능 묶음 머리가 있다 — 「모두 접기」 버튼을 둔다 */
    묶음있나: 첫단.length > 0,
    다접었나,
    뒤집기: (키: string) =>
      set접은((전) => {
        const 다음 = new Set(전);
        if (!다음.delete(키)) 다음.add(키);
        return 다음;
      }),
    모두: () => set접은(다접었나 ? new Set() : new Set(첫단)),
    비우기: () => set접은(new Set()),
  };
}

/**
 * 쪽의 줄 사이에 머리를 끼운다.
 * 기능 묶음 머리는 서비스가 PRD 를 쓸 때만(묶음보임 — 서버 hasFeatures) — PRD 가 없는 서비스에서 「기능 묶음 없음」 머리 하나만 서면 줄 하나를 버린다.
 * 지금 조건에 걸린 묶음으로 가르면 「기능 묶음 없음」만 보기에서 머리가 사라진다.
 * 건수는 쪽이 아니라 서버가 준 묶음 번호표 전부로 센다. 단 화면이 거른 것(마지막 결과 칩)이 있으면 보이는 줄로만 센다 —
 * 그 칩은 이 쪽 안에서만 거르고, 안 맞추면 「12건」 머리 아래 줄이 하나뿐이다
 */
export function 줄과머리(
  rows: CaseRow[],
  groups: CaseGroup[] | undefined,
  이쪽번호: ReadonlySet<string>,
  묶음보임: boolean,
  보이는번호?: ReadonlySet<string>,
): 목록칸[] {
  if (groups === undefined || groups.length === 0) return rows.map((row) => ({ row, 위: [] }));
  const 자리 = new Map<string, CaseGroup>();
  for (const g of groups) for (const id of g.tcIds) 자리.set(id, g);
  const 모으기 = (같나: (g: CaseGroup) => boolean) =>
    groups.filter(같나).flatMap((g) => g.tcIds).filter((id) => 보이는번호 === undefined || 보이는번호.has(id));

  const 칸들: 목록칸[] = [];
  let 앞: CaseGroup | undefined;
  for (const row of rows) {
    const g = 자리.get(row.tcId);
    if (g === undefined) {
      칸들.push({ row, 위: [] });
      continue;
    }
    const f = 묶음보임 ? 열쇠('f', g.feature) : null;
    const s = g.screen === null ? null : 열쇠('s', g.feature, g.screen);
    const p = g.part === null ? null : 열쇠('p', g.feature, g.screen, g.part);
    const 머리 = (단: 1 | 2 | 3, 키: string, 값: string | null, ids: string[], 조건: 묶음자리, 위: string[]): 묶음머리 => ({
      단,
      열쇠: 키,
      값,
      주소: 단 === 1 ? null : g.screenUrl,
      tcIds: ids,
      이어짐: ids[0] !== undefined && !이쪽번호.has(ids[0]),
      조건,
      위,
    });
    const 새묶음 = 앞 === undefined || 앞.feature !== g.feature;
    const 새화면 = 새묶음 || 앞!.screen !== g.screen;
    const 새조각 = 새화면 || 앞!.part !== g.part;
    const feature = g.feature ?? '';
    const 끼우기 = (m: 묶음머리) => 칸들.push({ 머리: m, 위: m.위 });
    if (f !== null && 새묶음) 끼우기(머리(1, f, g.feature, 모으기((x) => x.feature === g.feature), { feature }, []));
    if (s !== null && 새화면) {
      const ids = 모으기((x) => x.feature === g.feature && x.screen === g.screen);
      끼우기(머리(2, s, g.screen, ids, { feature, screen: g.screen! }, f === null ? [] : [f]));
    }
    if (p !== null && 새조각) {
      const ids = 모으기((x) => x.feature === g.feature && x.screen === g.screen && x.part === g.part);
      // 화면 없이 조각만 쓰는 자리는 「화면 없음」(빈 글자)까지 건다 — 빼면 같은 조각을 쓰는 다른 화면 케이스까지 걸린다
      const 조건 = { feature, screen: g.screen ?? '', part: g.part! };
      끼우기(머리(3, p, g.part, ids, 조건, [f, s].filter((x) => x !== null)));
    }
    칸들.push({ row, 위: [f, s, p].filter((x) => x !== null) });
    앞 = g;
  }
  return 칸들;
}
