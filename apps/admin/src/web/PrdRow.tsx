// 「PRD 관리」 전체 요구의 한 줄 — 번호 · 요구 문장 · 테스트 수 · 결과 꼬리표. 눌러서 오른쪽 서랍을 연다 (도메인/작성 §3.6 「★ 표준 기획서」 · 2026-11-11 목록 시안 B)

import type { PrdItem } from '@platform/kit';

import type { 줄보류 } from '../prd/heldText.js';
import { 요구판정, type 추적 } from '../prd/trace.js';
import { use말 } from './i18n.js';
import { 보류글 } from './PrdTrace.js';
import { use나이글 } from './prdWords.js';

export const prd줄아이디 = (reqId: string) => `prd-item-${reqId}`;

const 판정꼴 = { PASS: ['통과', 'verdict v-pass'], FAIL: ['실패', 'verdict v-fail'], NA: ['미실행', 'verdict v-na'] } as const;

/** 줄 끝과 서랍 머리의 결과 꼬리표. 테스트가 있는데 결과를 못 읽었으면 꼬리표가 없다 */
export function 결과꼬리(t: (키: string) => string, 추적: 추적, 보류: 줄보류 | null): { 글: string; 꼴: string } | null {
  if (추적.기능.length + 추적.UI.length === 0) return { 글: 보류 === null ? t('미작성') : t('보류'), 꼴: 'case-tag prd-uncovered' };
  if (추적.결과 === null) return null;
  const [글, 꼴] = 판정꼴[요구판정(추적.결과) ?? 'NA'];
  return { 글: t(글), 꼴 };
}

export function 요구줄({ x, 추적, 보류, 열림, on열기 }: { x: PrdItem; 추적: 추적; 보류: 줄보류 | null; 열림: boolean; on열기: () => void }) {
  const t = use말();
  const 나이글 = use나이글();
  const 나이 = 나이글(x.checkSince);
  const 수 = [추적.기능.length > 0 ? t('기능 {건수}', { 건수: 추적.기능.length }) : null, 추적.UI.length > 0 ? t('UI {건수}', { 건수: 추적.UI.length }) : null].filter((v) => v !== null);
  const 테스트글 = 수.length > 0 ? 수.join(' · ') : 보류 === null ? t('테스트 없음') : 보류글(t, 보류);
  const 꼬리 = 결과꼬리(t, 추적, 보류);

  return (
    <button type="button" id={prd줄아이디(x.reqId)} className={열림 ? 'prd-row prd-open' : 'prd-row'} aria-pressed={열림} onClick={on열기}>
      <span className="prd-id">{x.reqId}</span>
      <span className="prd-sent">
        <span className="prd-clip" title={x.text}>
          {x.text}
        </span>
        {/* 확정은 기본 상태라 꼬리표를 달지 않는다 — 줄마다 붙으면 확인 필요가 묻힌다 (점검 8.12) */}
        {x.status === 'NEEDS_CHECK' ? <span className="case-tag prd-check">{나이 === null ? t('확인 필요') : t('확인 필요 · {나이}', { 나이 })}</span> : null}
        {x.byPerson === true ? <span className="prd-plain">{t('사람이 수정')}</span> : null}
      </span>
      <span className="prd-tests" title={테스트글}>
        {테스트글}
      </span>
      <span className="prd-res">{꼬리 === null ? null : <span className={꼬리.꼴}>{꼬리.글}</span>}</span>
    </button>
  );
}
