// 케이스 목록 표머리 — 칸 이름과 「이 쪽 전체 선택」. CaseListParts 가 300줄을 넘어 뗐다 (2026-10-05 · PR #159)

import { useId } from 'react';

import { use말 } from './i18n.js';

/**
 * 목록 맨 위 표머리 (SPEC §8.1, 2026-09-22).
 *
 * **목록이 좁아 줄이 쌓이면 칸 이름만 감추고 「이 쪽 전체 선택」 한 줄은 남긴다** (PR #159).
 * 줄이 쌓이면 칸이 세로로 누워 칸 이름이 뜻을 잃지만, 통째로 감추면 사이드바를 편 1024px 창에서도
 * 여러 건 고르기가 사라진다. 기준 폭은 `styles.css` `.case-rows` 가 정본이다.
 * 실행 기록은 다르다 (실행 §8.7 은 감추지 않고 줄마다 라벨을 붙인다).
 *
 * `<table>` 이 아니라 격자라서 `role` 로 칸 이름을 읽히게 한다.
 */
export function 표머리({ 고름상태, on모두고르기 }: { 고름상태?: 'none' | 'some' | 'all'; on모두고르기?: () => void } = {}) {
  const t = use말();
  const id = useId();
  return (
    <div className="rowhead" role="row">
      <span aria-hidden="true" />
      {/* 이 쪽에 보이는 케이스를 한 번에 고르고 푼다. 「전체 실행」은 이미 모든 쪽이라 여기는 보이는 쪽만이다 (2026-09-30) */}
      {고름상태 === undefined || on모두고르기 === undefined ? (
        <span aria-hidden="true" />
      ) : (
        <>
          <label className="pick">
            <input
              id={id}
              type="checkbox"
              aria-label={t('이 쪽 전체 선택')}
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
            {t('이 쪽 전체 선택')}
          </label>
        </>
      )}
      {/* 두 언어가 같은 글자라 표를 안 탄다 */}
      <span role="columnheader">TC ID</span>
      <span role="columnheader">{t('케이스명')}</span>
      <span role="columnheader">{t('입력값')}</span>
      <span role="columnheader">{t('마지막 결과')}</span>
    </div>
  );
}
