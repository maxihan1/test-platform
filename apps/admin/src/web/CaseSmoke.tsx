// 케이스 목록의 스모크 표시 — 줄의 칩 하나와 검색 줄의 「스모크만」 거르기 (도메인/카탈로그 §8.1 「스모크」)

import { useState } from 'react';

import { api, type CaseRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

/**
 * 케이스명 옆 스모크 칩. 고칠 수 있으면(on바뀜 있음) 버튼이고, 없으면 켜진 것만 글자 꼬리표다.
 * 사람이 고친 값이 없으면(smokeSet null) 누를 때 반대로 켜고 끄고, 있으면 코드 값으로 되돌린다
 */
export function 스모크칩({ row, on바뀜 }: { row: CaseRow; on바뀜?: () => Promise<unknown> }) {
  const t = use말();
  const 언어 = use언어();
  const [오류, set오류] = useState<string | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const smoke = row.smoke ?? false;
  const 직접 = row.smokeSet != null;
  const 글 = <>{smoke ? '● ' : '○ '}{t('스모크')}{직접 ? <> · {t('직접')}</> : null}</>;
  // 「AI 값과 다르다」고는 안 쓴다 — 응답에 코드 값이 없어 다시 스캔해 같아졌는지 모른다
  const 뜻 = 직접 ? t('직접 고친 값입니다. 다시 누르면 AI 가 정한 값으로 돌아갑니다') : undefined;
  // 꺼진 칩은 줄에 올릴 때만 보인다. 직접 꺼 둔 것은 되돌릴 길이라 늘 보인다
  const 클래스 = `smoke-chip ${smoke ? 'smoke-on' : 직접 ? 'smoke-off smoke-set' : 'smoke-off'}`;

  // 목록을 다시 읽을 때까지 막는다 — 그 전에 또 누르면 옛 row 로 보낼 값을 정해 「되돌리기」가 안 된다
  async function 누르기() {
    set오류(null);
    set보내는중(true);
    try {
      await api.setSmoke(row.tcId, 직접 ? null : !smoke);
      await on바뀜?.();
    } catch (e) {
      set오류(message(e, 언어));
    } finally {
      set보내는중(false);
    }
  }

  if (on바뀜 === undefined) return smoke ? <span className={클래스} title={뜻}>{글}</span> : null;
  return (
    <>
      <button type="button" className={클래스} aria-pressed={smoke} aria-label={t('{아이디} 스모크', { 아이디: row.tcId })} title={뜻} disabled={보내는중} onClick={() => void 누르기()}>
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
