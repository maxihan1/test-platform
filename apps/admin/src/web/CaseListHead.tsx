// 케이스 목록 표머리 — 칸 이름과 「보이는 케이스 전체 선택」. CaseListParts 가 300줄을 넘어 뗐다 (2026-10-05 · PR #159)
// 아래 쪽 넘기기는 2026-11-11 시안 B 에서 걷었다 — 목록이 스크롤로 이어 받는다(useCasePages.ts)

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { use말 } from './i18n.js';

/**
 * 화면 머리의 접힌 메뉴 — 「다운로드 ▾」 · 「⋯」. 자주 안 쓰는 일을 주 단추 옆에서 걷어 낸다 (2026-11-11 시안 B).
 * 항목을 누르거나 메뉴 밖을 누르면 닫힌다
 */
export function 머리메뉴({ 글, 이름, 막힘 = false, children }: { 글: ReactNode; 이름?: string; 막힘?: boolean; children: ReactNode }) {
  const [열림, set열림] = useState(false);
  const 자리 = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!열림) return;
    const 밖 = (e: MouseEvent) => {
      if (!자리.current?.contains(e.target as Node)) set열림(false);
    };
    document.addEventListener('mousedown', 밖);
    return () => document.removeEventListener('mousedown', 밖);
  }, [열림]);
  return (
    <span className="case-menu" ref={자리}>
      <button type="button" className="btn ghost" aria-expanded={열림} aria-haspopup="true" aria-label={이름} disabled={막힘} onClick={() => set열림(!열림)}>
        {글}
      </button>
      {열림 ? (
        <span className="case-menu-list" onClick={() => set열림(false)}>
          {children}
        </span>
      ) : null}
    </span>
  );
}

/**
 * 목록 맨 위 표머리 (SPEC §8.1, 2026-09-22).
 *
 * **목록이 좁아 줄이 쌓이면 칸 이름만 감추고 「보이는 케이스 전체 선택」 한 줄은 남긴다** (PR #159).
 * 줄이 쌓이면 칸이 세로로 누워 칸 이름이 뜻을 잃지만, 통째로 감추면 사이드바를 편 1024px 창에서도
 * 여러 건 고르기가 사라진다. 기준 폭은 `styles.css` `.case-rows` 가 정본이다.
 * 실행 기록은 다르다 (실행 §8.7 은 감추지 않고 줄마다 라벨을 붙인다).
 *
 * **표 역할(row · columnheader)을 달지 않는다** (진행판 WEB-F2-15). 표 부모 없이 row 만 달면 행 이름이 내용으로 계산돼
 * 화면 읽기가 「보이는 케이스 전체 선택」을 행 이름과 체크박스로 두 번 읽었다. 표 부모로 감싸면 그 부모 안에서만 붙어 있어
 * 줄이 스크롤할 때 표머리가 같이 밀려 올라간다(sticky). 줄도 표 역할이 없다 — 칸 이름은 그냥 글로 읽힌다.
 */
export function 표머리({ 고름상태, on모두고르기 }: { 고름상태?: 'none' | 'some' | 'all'; on모두고르기?: () => void } = {}) {
  const t = use말();
  const id = useId();
  return (
    <div className="rowhead">
      <span aria-hidden="true" />
      {/* 지금까지 받은 케이스를 한 번에 고르고 푼다. 머리의 실행 단추는 조건에 맞는 전부라 여기는 받은 것만이다 (2026-09-30) */}
      {고름상태 === undefined || on모두고르기 === undefined ? (
        <span aria-hidden="true" />
      ) : (
        <>
          <label className="pick">
            <input
              id={id}
              type="checkbox"
              aria-label={t('보이는 케이스 전체 선택')}
              checked={고름상태 === 'all'}
              ref={(el) => {
                if (el !== null) el.indeterminate = 고름상태 === 'some';
              }}
              onChange={on모두고르기}
            />
          </label>
          {/* 줄이 쌓였을 때만 보인다 — 칸 이름이 없으니 체크박스가 무엇을 고르는지 글로 적고, 라벨로 이어 글을 눌러도 고른다.
              이름은 aria-label 이 먼저라 화면 읽기에서는 이 글을 뺀다 */}
          <label className="pick-all" htmlFor={id} aria-hidden="true">
            {t('보이는 케이스 전체 선택')}
          </label>
        </>
      )}
      {/* 두 언어가 같은 글자라 표를 안 탄다 */}
      <span className="colname">TC ID</span>
      <span className="colname">{t('케이스명')}</span>
      <span className="colname">{t('마지막 결과')}</span>
    </div>
  );
}
