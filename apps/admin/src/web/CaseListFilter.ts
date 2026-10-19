// 케이스 목록의 검색 조건 상태 — 찾기 · 디바이스 · 표시 · 마지막 결과 · 설계 기법 · 종류 · 묶음 · 요구 번호 · 쪽 (SPEC §8.1 「검색 조건」 표가 정본)
// CaseList 가 300줄에 닿아 상태만 떼어 냈다. 고른 것 · 고친 값 · 그리는 일은 CaseList 에 남는다
// 조건은 주소에 남는다 — 상세 · 실행 결과에 갔다 뒤로 와도 그대로다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)

import { useState } from 'react';

import { TECHNIQUES } from '@platform/kit/types';

import { type CaseQuery, type ItemStatus, type Platform, type 케이스축, 케이스축들 } from './api.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';

/** 설계 기법 고르개의 값 — 전체 · kit 기법 차례 · 기법 없음 (도메인/카탈로그 §8.1 「설계 기법」) */
export const 기법고름들 = ['ALL', ...TECHNIQUES, 'none'] as const;
export type 기법고름 = (typeof 기법고름들)[number];

/** 묶음 머리 하나의 자리 — 기능 묶음(빈 글자는 묶음 없음) · 화면 파일 · 화면 조각 파일 */
export interface 묶음자리 {
  feature: string;
  screen?: string;
  part?: string;
}

/** 묶음 머리의 「이것만 보기」가 건 조건. 이름은 조건 칩에 적는 글이다 — 파일 경로를 그대로 보이지 않으려고 같이 든다 */
export interface 묶음조건 extends 묶음자리 {
  이름: string;
}

/** 주소의 글자가 고를 수 있는 값 가운데 하나면 그것, 아니면 기본값. 손으로 고친 주소가 화면에 없는 조건을 걸지 않게 한다 */
function 고른값<T extends string>(글: string | null, 값들: readonly T[], 기본: T): T {
  return 값들.find((값) => 값 === 글) ?? 기본;
}

function 주소묶음(주소: URLSearchParams): 묶음조건 | null {
  const feature = 주소.get('g');
  const 이름 = 주소.get('gn');
  if (feature === null || 이름 === null) return null;
  const screen = 주소.get('gs');
  const part = 주소.get('gp');
  return { feature, 이름, ...(screen === null ? {} : { screen }), ...(part === null ? {} : { part }) };
}

// 처음요구 — 「PRD 관리」에서 넘어온 주소의 요구 번호(도메인/카탈로그 §8.1 「맥락」). 화면에 따로 고르는 칸은 없다
export function use검색조건(service: string, kind: 'UI' | 'FN', 처음요구?: string) {
  const [처음] = useState(주소조건);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');
  const [page, setPage] = useState(() => Math.max(1, Math.floor(Number(처음.get('page')) || 1)));
  // 조건은 전부 서버가 거른다 (SPEC §8.1 표 — 마지막 결과도 2026-10-19 ⑫ 부터)
  const [디바이스, set디바이스] = useState<Platform | 'ALL'>(() => 고른값(처음.get('dev'), ['desktop', 'mobile', 'android'] as const, 'ALL'));
  const [활성만, set활성만] = useState(처음.get('all') !== '1');
  // 판정은 실행 쪽 함수가 주고 카탈로그가 그것으로 거른다 — 쪽 안에서만 거르면 2쪽의 실패가 안 보였다 (도메인/카탈로그 §7 `?last=`)
  const [결과, set결과] = useState<ItemStatus | 'ALL'>(() => 고른값(처음.get('last'), ['PASS', 'FAIL', 'NA'] as const, 'ALL'));
  // 종류를 바꾸면 목록이 새로 그려져(main.tsx key) 이것도 비워진다 — UI 목록에 보이지 않는 거르기가 남지 않는다
  const [기법, set기법] = useState<기법고름>(() => (kind === 'FN' ? 고른값(처음.get('tech'), 기법고름들, 'ALL') : 'ALL'));
  // 종류 칩은 기능 목록에만 있다 — UI 목록은 전부 UI 라 거를 것이 없다
  const [축, set축] = useState<케이스축 | 'ALL'>(() => (kind === 'FN' ? 고른값(처음.get('axis'), 케이스축들.filter((it) => it !== 'UI'), 'ALL') : 'ALL'));
  const [묶음, set묶음] = useState(주소묶음(처음));
  const [요구, set요구] = useState<string | null>(처음요구 ?? null);
  // 오른쪽 상세 칸에 연 케이스. 조건이 아니라 「보고 있는 것」이라 조건을 지워도 그대로 둔다 (⑫ 시안 A)
  const [열린, set열린] = useState<string | null>(처음.get('case'));

  // 기본값인 조건은 적지 않는다. 요구 번호는 주소의 길(`/req/<번호>`)이 든다 — ✕ 로 풀면 길에서도 뺀다 (도메인/카탈로그 §8.1 조건 8)
  const 종류글자 = kind === 'UI' ? 'ui' : 'fn';
  use주소조건(요구 === null ? `#/cases/${종류글자}` : `#/cases/${종류글자}/req/${encodeURIComponent(요구)}`, {
    ...(q === '' ? {} : { q }),
    ...(page === 1 ? {} : { page: String(page) }),
    ...(디바이스 === 'ALL' ? {} : { dev: 디바이스 }),
    ...(활성만 ? {} : { all: '1' }),
    ...(결과 === 'ALL' ? {} : { last: 결과 }),
    ...(기법 === 'ALL' ? {} : { tech: 기법 }),
    ...(축 === 'ALL' ? {} : { axis: 축 }),
    ...(묶음 === null ? {} : { g: 묶음.feature, gn: 묶음.이름, ...(묶음.screen === undefined ? {} : { gs: 묶음.screen }), ...(묶음.part === undefined ? {} : { gp: 묶음.part }) }),
    ...(열린 === null ? {} : { case: 열린 }),
  });

  const 조건: CaseQuery = {
    service,
    kind,
    q,
    page,
    ...(디바이스 === 'ALL' ? {} : { platform: 디바이스 }),
    ...(활성만 ? {} : { active: false }),
    ...(기법 === 'ALL' ? {} : { technique: 기법 }),
    ...(축 === 'ALL' ? {} : { axis: 축 }),
    ...(묶음 === null ? {} : { feature: 묶음.feature, ...(묶음.screen === undefined ? {} : { screen: 묶음.screen }), ...(묶음.part === undefined ? {} : { part: 묶음.part }) }),
    ...(요구 === null ? {} : { req: 요구 }),
    ...(결과 === 'ALL' ? {} : { last: 결과 }),
  };

  // 조건을 바꾸면 늘 첫 쪽으로 간다. 3쪽에서 조건을 좁히면 빈 목록에 '3쪽' 이 뜬다
  function 바꾸면첫쪽<T>(set: (값: T) => void) {
    return (값: T) => {
      set(값);
      setPage(1);
    };
  }

  return {
    typed,
    setTyped,
    q,
    page,
    setPage,
    디바이스,
    활성만,
    결과,
    기법,
    축,
    묶음,
    요구,
    열린,
    set열린,
    조건,
    건조건: q !== '' || 디바이스 !== 'ALL' || !활성만 || 결과 !== 'ALL' || 기법 !== 'ALL' || 축 !== 'ALL' || 묶음 !== null || 요구 !== null,
    on디바이스: 바꾸면첫쪽(set디바이스),
    on활성만: 바꾸면첫쪽(set활성만),
    on결과: 바꾸면첫쪽(set결과),
    on기법: 바꾸면첫쪽(set기법),
    on축: 바꾸면첫쪽(set축),
    on묶음: 바꾸면첫쪽(set묶음),
    요구지우기: () => 바꾸면첫쪽(set요구)(null),
    search(term: string) {
      setQ(term);
      setPage(1);
    },
    /** 서비스를 바꿀 때 — 쪽과 검색어 · 묶음 · 요구 번호 · 연 케이스를 버린다(그 서비스 것이다). 디바이스 같은 조건은 서비스를 넘어 그대로 둔다 */
    찾기비우기() {
      setPage(1);
      set열린(null);
      setQ('');
      setTyped('');
      set묶음(null);
      set요구(null);
    },
    조건지우기() {
      setTyped('');
      setQ('');
      set디바이스('ALL');
      set활성만(true);
      set결과('ALL');
      set기법('ALL');
      set축('ALL');
      set묶음(null);
      set요구(null);
      setPage(1);
    },
  };
}
