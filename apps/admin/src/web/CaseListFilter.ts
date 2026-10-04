// 케이스 목록의 검색 조건 상태 — 찾기 · 디바이스 · 표시 · 마지막 결과 · 설계 기법 · 쪽 (SPEC §8.1 「검색 조건」 표가 정본)
// CaseList 가 300줄에 닿아 상태만 떼어 냈다. 고른 것 · 고친 값 · 그리는 일은 CaseList 에 남는다

import { useState } from 'react';

import { TECHNIQUES } from '@platform/kit/types';

import type { CaseQuery, ItemStatus, Platform } from './api.js';

/** 설계 기법 고르개의 값 — 전체 · kit 기법 차례 · 기법 없음 (도메인/카탈로그 §8.1 「설계 기법」) */
export const 기법고름들 = ['ALL', ...TECHNIQUES, 'none'] as const;
export type 기법고름 = (typeof 기법고름들)[number];

export function use검색조건(service: string, kind: 'UI' | 'FN') {
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  // 마지막 결과만 빼고 서버가 거른다 (SPEC §8.1 표)
  const [디바이스, set디바이스] = useState<Platform | 'ALL'>('ALL');
  const [활성만, set활성만] = useState(true);
  // 마지막 결과만 화면이 겹쳐 거른다 — 실행할 때마다 바뀌어 카탈로그가 알지 못한다
  const [결과, set결과] = useState<ItemStatus | 'ALL'>('ALL');
  // 종류를 바꾸면 목록이 새로 그려져(main.tsx key) 이것도 비워진다 — UI 목록에 보이지 않는 거르기가 남지 않는다
  const [기법, set기법] = useState<기법고름>('ALL');

  const 조건: CaseQuery = {
    service,
    kind,
    q,
    page,
    ...(디바이스 === 'ALL' ? {} : { platform: 디바이스 }),
    ...(활성만 ? {} : { active: false }),
    ...(기법 === 'ALL' ? {} : { technique: 기법 }),
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
    조건,
    건조건: q !== '' || 디바이스 !== 'ALL' || !활성만 || 결과 !== 'ALL' || 기법 !== 'ALL',
    on디바이스: 바꾸면첫쪽(set디바이스),
    on활성만: 바꾸면첫쪽(set활성만),
    on결과: 바꾸면첫쪽(set결과),
    on기법: 바꾸면첫쪽(set기법),
    search(term: string) {
      setQ(term);
      setPage(1);
    },
    /** 서비스를 바꿀 때 — 쪽과 검색어만 버린다. 디바이스 같은 조건은 서비스를 넘어 그대로 둔다 */
    찾기비우기() {
      setPage(1);
      setQ('');
      setTyped('');
    },
    조건지우기() {
      setTyped('');
      setQ('');
      set디바이스('ALL');
      set활성만(true);
      set결과('ALL');
      set기법('ALL');
      setPage(1);
    },
  };
}
