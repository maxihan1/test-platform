// 케이스 목록의 검색 조건 상태 — 찾기 · 디바이스 · 표시 · 마지막 결과 · 설계 기법 · 종류 · 스모크 · API 서버 · 요구 번호 (SPEC §8.1 「검색 조건」 표가 정본)
// 쪽 번호는 없다 — 목록이 스크롤로 이어 받는다(useCasePages.ts · 2026-11-11 시안 B)
// CaseList 가 300줄에 닿아 상태만 떼어 냈다. 고른 것 · 고친 값 · 그리는 일은 CaseList 에 남는다
// 조건은 주소에 남는다 — 상세 · 실행 결과에 갔다 뒤로 와도 그대로다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)

import { useState } from 'react';

import { TECHNIQUES } from '@platform/kit/types';

import { type CaseQuery, type ItemStatus, type Platform, type 앱종류, type 케이스축, 케이스축들 } from './api.js';
import { 종류 } from './kind.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';

/** 설계 기법 고르개의 값 — 전체 · kit 기법 차례 · 기법 없음 (도메인/카탈로그 §8.1 「설계 기법」) */
export const 기법고름들 = ['ALL', ...TECHNIQUES, 'none'] as const;
export type 기법고름 = (typeof 기법고름들)[number];

/** 주소의 글자가 고를 수 있는 값 가운데 하나면 그것, 아니면 기본값. 손으로 고친 주소가 화면에 없는 조건을 걸지 않게 한다 */
function 고른값<T extends string>(글: string | null, 값들: readonly T[], 기본: T): T {
  return 값들.find((값) => 값 === 글) ?? 기본;
}

// 처음요구 — 「PRD 관리」에서 넘어온 주소의 요구 번호(도메인/카탈로그 §8.1 「맥락」). 화면에 따로 고르는 칸은 없다
// 앱종류 — Android 앱 애플리케이션은 디바이스 칩 줄이 없다. 웹에서 고른 디바이스 · 주소의 dev 가 보이지 않는 거르기로 남지 않게 없는 것으로 친다
export function use검색조건(service: string, kind: 'UI' | 'FN', 처음요구?: string, 앱종류?: 앱종류) {
  const [처음] = useState(주소조건);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');
  // 조건은 전부 서버가 거른다 (SPEC §8.1 표 — 마지막 결과도 2026-10-19 ⑫ 부터)
  const [고른디바이스, set디바이스] = useState<Platform | 'ALL'>(() => 고른값(처음.get('dev'), ['desktop', 'mobile', 'android'] as const, 'ALL'));
  const 디바이스 = 종류(앱종류).디바이스칩 ? 고른디바이스 : 'ALL';
  const [활성만, set활성만] = useState(처음.get('all') !== '1');
  // 판정은 실행 쪽 함수가 주고 카탈로그가 그것으로 거른다 — 쪽 안에서만 거르면 2쪽의 실패가 안 보였다 (도메인/카탈로그 §7 `?last=`)
  const [결과, set결과] = useState<ItemStatus | 'ALL'>(() => 고른값(처음.get('last'), ['PASS', 'FAIL', 'NA'] as const, 'ALL'));
  // 종류를 바꾸면 목록이 새로 그려져(main.tsx key) 이것도 비워진다 — UI 목록에 보이지 않는 거르기가 남지 않는다
  const [기법, set기법] = useState<기법고름>(() => (kind === 'FN' ? 고른값(처음.get('tech'), 기법고름들, 'ALL') : 'ALL'));
  // 종류 칩은 기능 목록에만 있다 — UI 목록은 전부 UI 라 거를 것이 없다
  const [축, set축] = useState<케이스축 | 'ALL'>(() => (kind === 'FN' ? 고른값(처음.get('axis'), 케이스축들.filter((it) => it !== 'UI'), 'ALL') : 'ALL'));
  // API 서버 이름은 프로젝트 것이라 서비스를 바꾸면 비운다. 이름이 사라졌으면 서버가 빈 목록을 내고 걸린 칩의 ✕ 로 푼다 (도메인/카탈로그 §8.1 「API 서버」)
  const [스모크, set스모크] = useState(처음.get('smoke') === '1');
  const [서버, set서버] = useState<string | null>(처음.get('api') || null);
  const [요구, set요구] = useState<string | null>(처음요구 ?? null);
  // 오른쪽 상세 칸에 연 케이스. 조건이 아니라 「보고 있는 것」이라 조건을 지워도 그대로 둔다 (⑫ 시안 A)
  const [열린, set열린] = useState<string | null>(처음.get('case'));

  // 기본값인 조건은 적지 않는다. 요구 번호는 주소의 길(`/req/<번호>`)이 든다 — ✕ 로 풀면 길에서도 뺀다 (도메인/카탈로그 §8.1 조건 8)
  const 종류글자 = kind === 'UI' ? 'ui' : 'fn';
  use주소조건(요구 === null ? `#/cases/${종류글자}` : `#/cases/${종류글자}/req/${encodeURIComponent(요구)}`, {
    ...(q === '' ? {} : { q }),
    ...(디바이스 === 'ALL' ? {} : { dev: 디바이스 }),
    ...(활성만 ? {} : { all: '1' }),
    ...(결과 === 'ALL' ? {} : { last: 결과 }),
    ...(기법 === 'ALL' ? {} : { tech: 기법 }),
    ...(축 === 'ALL' ? {} : { axis: 축 }),
    ...(스모크 ? { smoke: '1' } : {}),
    ...(서버 === null ? {} : { api: 서버 }),
    ...(열린 === null ? {} : { case: 열린 }),
    // 링크를 받은 사람도 이 애플리케이션으로 연다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)
    ...(service === '' ? {} : { service }),
  }, { 쌓는칸: ['case'], 듣기: (조건) => set열린(조건.get('case')) });

  const 조건: CaseQuery = {
    service,
    kind,
    q,
    ...(디바이스 === 'ALL' ? {} : { platform: 디바이스 }),
    ...(활성만 ? {} : { active: false }),
    ...(기법 === 'ALL' ? {} : { technique: 기법 }),
    ...(축 === 'ALL' ? {} : { axis: 축 }),
    ...(스모크 ? { smoke: true } : {}),
    ...(서버 === null ? {} : { apiServer: 서버 }),
    ...(요구 === null ? {} : { req: 요구 }),
    ...(결과 === 'ALL' ? {} : { last: 결과 }),
  };

  return {
    typed,
    setTyped,
    q,
    디바이스,
    활성만,
    결과,
    기법,
    축,
    스모크,
    서버,
    요구,
    열린,
    set열린,
    조건,
    건조건: q !== '' || 디바이스 !== 'ALL' || !활성만 || 결과 !== 'ALL' || 기법 !== 'ALL' || 축 !== 'ALL' || 스모크 || 서버 !== null || 요구 !== null,
    on디바이스: set디바이스,
    on활성만: set활성만,
    on결과: set결과,
    on기법: set기법,
    on축: set축,
    on스모크: set스모크,
    on서버: set서버,
    요구지우기: () => set요구(null),
    search: setQ,
    /** 서비스를 바꿀 때 — 검색어 · 요구 번호 · 연 케이스를 버린다(그 서비스 것이다). 디바이스 같은 조건은 서비스를 넘어 그대로 둔다 */
    찾기비우기() {
      set열린(null);
      setQ('');
      setTyped('');
      set서버(null);
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
      set스모크(false);
      set서버(null);
      set요구(null);
    },
  };
}
