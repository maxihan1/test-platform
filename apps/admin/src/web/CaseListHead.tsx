// 케이스 목록 표머리 — 칸 이름과 「보이는 케이스 전체 선택」. CaseListParts 가 300줄을 넘어 뗐다 (2026-10-05 · PR #159)
// 아래 쪽 넘기기는 2026-11-11 시안 B 에서 걷었다 — 목록이 스크롤로 이어 받는다(useCasePages.ts)

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';

import { use말 } from './i18n.js';
import type { 판정 } from './role.js';
import { 기다림글자 } from './ui.js';

/**
 * 케이스 목록 화면 머리의 단추 — 「다운로드 ▾」 · 「⋯ › 케이스 목록 새로고침」 · 주 실행 단추 (도메인/카탈로그 §8.1 · 2026-11-11 시안 B).
 * 머리는 늘 조건 기준이다 — 고른 것의 실행은 고르기 바에만 있다(2026-10-30 WEB-F7-08). CaseList 가 300줄을 넘어 뗐다
 */
export function 목록머리행동({
  전체,
  걸렀나,
  테스트만,
  할수,
  엑셀,
  새로고침중,
  on새로고침,
  모으는중,
  on실행,
  실행단추,
}: {
  전체: number;
  걸렀나: boolean;
  테스트만: boolean;
  할수: 판정;
  엑셀: { 받기: () => void; 받는중: boolean };
  새로고침중: boolean;
  on새로고침: () => void;
  모으는중: boolean;
  on실행: () => void;
  실행단추: RefObject<HTMLButtonElement | null>;
}) {
  const t = use말();
  // 이름이 무엇을 거는지 말한다 — 거른 것이 없으면 전부, 있으면 걸러진 것만 (앞 판 「조건에 맞는 N건 실행」은 길고 딱딱했다)
  const 실행글 = 걸렀나
    ? t(테스트만 ? '검색 결과 시험 실행 ({건수})' : '검색 결과 실행 ({건수})', { 건수: 전체 })
    : t(테스트만 ? '전체 시험 실행 ({건수})' : '전체 실행 ({건수})', { 건수: 전체 });
  return (
    <>
      <머리메뉴 글={<><기다림글자 중={엑셀.받는중} 평소={t('다운로드')} 기다림={t('만드는 중')} /><span aria-hidden="true"> ▾</span></>} 막힘={엑셀.받는중 || 전체 === 0}>
        <button type="button" className="btn ghost small" onClick={엑셀.받기}>
          {t('엑셀 ({건수}건)', { 건수: 전체 })}
        </button>
      </머리메뉴>
      {/* 가끔 쓰는 일이라 「⋯」 안에 둔다 — 앞 판은 머리 맨 앞의 「다시 스캔」이었다 */}
      {!할수('다시스캔') ? null : (
        <머리메뉴 글={새로고침중 ? t('새로고침하는 중') : '⋯'} 이름={새로고침중 ? undefined : t('다른 작업')} 막힘={새로고침중}>
          <button type="button" className="btn ghost small" onClick={on새로고침}>
            {t('케이스 목록 새로고침')}
          </button>
        </머리메뉴>
      )}
      {!할수('테스트실행') ? null : (
        <button className="btn" ref={실행단추} onClick={on실행} disabled={모으는중 || 전체 === 0}>
          {실행글}
        </button>
      )}
    </>
  );
}

/**
 * 화면 머리의 접힌 메뉴 — 「다운로드 ▾」 · 「⋯」. 자주 안 쓰는 일을 주 단추 옆에서 걷어 낸다 (2026-11-11 시안 B).
 * 항목을 누르거나 메뉴 밖을 누르거나 Esc 를 누르거나 키보드 초점이 메뉴 밖으로 나가면 닫힌다. 단추가 막히면(받는 중) 펼친 것도 접는다
 */
export function 머리메뉴({ 글, 이름, 막힘 = false, children }: { 글: ReactNode; 이름?: string; 막힘?: boolean; children: ReactNode }) {
  const [펼침, set열림] = useState(false);
  const 열림 = 펼침 && !막힘;
  const 자리 = useRef<HTMLSpanElement>(null);
  const 단추 = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!열림) return;
    const 밖 = (e: MouseEvent) => {
      if (!자리.current?.contains(e.target as Node)) set열림(false);
    };
    document.addEventListener('mousedown', 밖);
    return () => document.removeEventListener('mousedown', 밖);
  }, [열림]);
  return (
    <span
      className="case-menu"
      ref={자리}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !열림) return;
        // 열린 서랍의 Esc 까지 닫지 않게 여기서 멈춘다
        e.stopPropagation();
        set열림(false);
        단추.current?.focus();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) set열림(false);
      }}
    >
      <button type="button" ref={단추} className="btn ghost" aria-expanded={열림} aria-haspopup="true" aria-label={이름} disabled={막힘} onClick={() => set열림(!열림)}>
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
