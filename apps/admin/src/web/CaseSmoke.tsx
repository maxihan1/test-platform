// 케이스 목록의 스모크 표시 — 줄의 칩 하나와 검색 줄의 「스모크만」 거르기 (도메인/카탈로그 §8.1 「스모크」)

import { useState } from 'react';

import { api, type CaseRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

/**
 * 케이스명 옆 스모크 칩. 고칠 수 있으면(on바뀜 있음) 버튼이고, 없으면 켜진 것만 글자 꼬리표다.
 * 사람이 고친 값이 없으면(smokeSet null) 누를 때 반대로 켜고 끄고, 있으면 코드 값으로 되돌린다
 */
export function 스모크칩({ row, on바뀜 }: { row: CaseRow; on바뀜?: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [오류, set오류] = useState<string | null>(null);
  const smoke = row.smoke ?? false;
  const 직접 = row.smokeSet != null;
  const 글 = <>{smoke ? '● ' : '○ '}{t('스모크')}{직접 ? <> · {t('직접')}</> : null}</>;
  const 뜻 = 직접 ? t('AI 가 정한 값과 다르게 직접 고쳤습니다. 다시 누르면 AI 가 정한 값으로 돌아갑니다') : undefined;
  // 꺼진 칩은 줄에 올릴 때만 보인다. 직접 꺼 둔 것은 되돌릴 길이라 늘 보인다
  const 클래스 = `smoke-chip ${smoke ? 'smoke-on' : 직접 ? 'smoke-off smoke-set' : 'smoke-off'}`;

  async function 누르기() {
    set오류(null);
    try {
      await api.setSmoke(row.tcId, 직접 ? null : !smoke);
      on바뀜?.();
    } catch (e) {
      set오류(message(e, 언어));
    }
  }

  if (on바뀜 === undefined) return smoke ? <span className={클래스} title={뜻}>{글}</span> : null;
  return (
    <>
      <button type="button" className={클래스} aria-pressed={smoke} aria-label={t('{아이디} 스모크', { 아이디: row.tcId })} title={뜻} onClick={() => void 누르기()}>
        {글}
      </button>
      {오류 === null ? null : <span className="smoke-error" role="alert">{오류}</span>}
    </>
  );
}

/** 「스모크만」 거르기 — 새 빌드를 올렸을 때 먼저 도는 핵심 경로만 본다 */
export function 스모크거르개({ 스모크, on스모크 }: { 스모크: boolean; on스모크: (값: boolean) => void }) {
  const t = use말();
  return (
    <span className="filter-group">
      <span className="filter-label">{t('스모크')}</span>
      <button className="chip" aria-pressed={!스모크} onClick={() => on스모크(false)}>{t('전체')}</button>
      <button className="chip" aria-pressed={스모크} onClick={() => on스모크(true)}>{t('스모크만')}</button>
    </span>
  );
}
