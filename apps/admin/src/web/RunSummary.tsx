// 결과 화면 맨 위 요약 한 줄 — 통과율 · 판정 막대 · 판정 칩 넷 · 이전 실행 대비 (도메인/실행 §8.3 「결과 화면은 요약 한 줄 + 실행 차례 표다」)
// 이전 버전은 도넛 · 판정 칸 넷 · 이전 실행 대비 칸 셋이 따로 서서 화면 절반을 쓰고 같은 숫자를 여러 번 적었다 (2026-11-24 사용자 · 5차 시안)

import { useState } from 'react';

import type { ItemStatus, RunCounts, RunInsights, RunItemSummary } from './api.js';
import { use올라가기 } from './dashboardView.js';
import { use말, use언어 } from './i18n.js';
import { 해결목록 } from './RunInsights.js';
import { 빠진목록 } from './RunMissing.js';
import { 그중미확정글 } from './unconfirmed.js';

// 직전 대비 수는 케이스 수다 — 「Fail N건 다시 실행」과 같은 단위다. 디바이스로 갈라 세면 한 화면에 단위가 셋이 됐다 (점검 2.15)
export const 칸수 = (insights: RunInsights, 판정: '새로깨짐' | '계속깨짐' | '고쳐짐'): number =>
  new Set(insights.케이스들.filter((c) => c.판정 === 판정).map((c) => c.tcId)).size;

export type 변화칸 = '새로깨짐' | '계속깨짐';

/**
 * 그리기만 한다. 견줌 자료는 부르는 쪽이 들고 온다 — null 이면 아직 못 받았거나 견줄 앞이 없는 것이라 대비 칸을 통째로 뺀다.
 * 통과율은 미확정 · Blocked 까지 모든 항목을 센다. 미확정은 「그중 N건」 한 줄로만 알린다 (§3.2)
 */
export function RunSummary({
  counts,
  insights,
  판정,
  on판정,
  변화 = null,
  on변화,
  항목들 = [],
}: {
  counts: RunCounts;
  insights: RunInsights | null;
  판정: ItemStatus | 'ALL';
  on판정: (v: ItemStatus | 'ALL') => void;
  /** 직전 대비 칸을 눌러 건 거르개 — 「회귀 실패」 · 「기존 실패」가 표를 그 변화의 줄만 남긴다 (점검 2.20) */
  변화?: 변화칸 | null;
  on변화?: (v: 변화칸 | null) => void;
  /** 이번 실행의 항목 — 「이번에 실행되지 않은 케이스」 목록이 직전 실행과 맞대 본다 */
  항목들?: RunItemSummary[];
}) {
  const t = use말();
  const 언어 = use언어();
  const [해결열림, set해결열림] = useState(false);
  const 전체 = counts.pass + counts.fail + counts.na;
  // 소수 한 자리까지 올라가도록 천분율로 센다 (DESIGN.md 원칙 4 「숫자 · 막대 · 선」)
  const 천분율 = use올라가기(전체 === 0 ? 0 : Math.round((counts.pass / 전체) * 1000));
  const 미확정 = 그중미확정글(counts, 언어);
  const 막힘 = counts.blocked ?? 0;
  const 앞 = insights?.previous ?? null;
  // 번호 자리만 고리로 만든다. 영어 표에서도 번호 자리가 어디든 맞도록 글을 만든 뒤 그 자리에서 가른다
  const [직전앞, 직전뒤] = t('이전 실행 {실행} 대비', { 실행: '\u0000' }).split('\u0000');

  const 칸들 = [
    { 값: 'ALL', 종류: 'a', 이름: t('전체'), 수: 전체 },
    { 값: 'PASS', 종류: 'p', 이름: t('Pass'), 수: counts.pass },
    { 값: 'FAIL', 종류: 'f', 이름: t('Fail'), 수: counts.fail },
    { 값: 'NA', 종류: 'n', 이름: t('Not tested'), 수: counts.na },
  ] as const;
  const 변화단추 = (칸: 변화칸, 이름: string) => (
    <button
      type="button"
      className={칸 === '새로깨짐' ? 'rf-stat f' : 'rf-stat'}
      aria-pressed={변화 === 칸}
      disabled={insights === null || 칸수(insights, 칸) === 0 || on변화 === undefined}
      onClick={() => on변화?.(변화 === 칸 ? null : 칸)}
    >
      {이름} <b className="num">{insights === null ? 0 : 칸수(insights, 칸)}</b>
    </button>
  );

  return (
    <section className="rf-sum">
      <div className="rf-rate">
        <b className="num">
          {전체 === 0 ? (
            '—'
          ) : (
            <>
              {(천분율 / 10).toFixed(1)}
              <small>%</small>
            </>
          )}
        </b>
        <span>{t('통과율')}</span>
      </div>

      <div className="rf-mid">
        {/* 막대는 장식이다 — 같은 수를 바로 아래 칩이 글자로 적는다 */}
        <div className="rf-bar" aria-hidden="true">
          <i style={{ flex: counts.pass, background: 'var(--pass)' }} />
          <i style={{ flex: counts.fail, background: 'var(--fail)' }} />
          <i style={{ flex: counts.na, background: 'var(--na)' }} />
        </div>
        <div className="rf-chips" role="group" aria-label={t('판정별 보기 · 항목 수')}>
          {칸들.map((칸) => (
            <button key={칸.값} type="button" className={`rf-chip ${칸.종류}`} aria-pressed={판정 === 칸.값} onClick={() => on판정(칸.값)}>
              {칸.이름} <b className="num">{칸.수}</b>
              {/* Blocked 는 판정이 아니라 Not tested 의 사유다 — 0 이면 괄호를 안 적는다 (WORDS 「Not tested 3 (Blocked 2)」) */}
              {칸.값 !== 'NA' || 막힘 === 0 ? null : <span className="rf-sub">(Blocked {막힘})</span>}
            </button>
          ))}
          {전체 === 0 ? <span className="rf-sub">{t('항목 없음')}</span> : null}
          {미확정 === '' ? null : <span className="rf-sub">{미확정}</span>}
        </div>
      </div>

      {insights === null || 앞 === null ? null : (
        <div className="rf-diff">
          {/* 견준 실행으로 바로 간다 */}
          <span>
            {직전앞}
            <a href={`#/runs/${String(앞.runId)}`}>RUN {앞.runId}</a>
            {직전뒤}
          </span>
          <div className="rf-diffs">
            {/* 숫자를 누르면 그 케이스로 간다 — 회귀 · 기존 실패는 표를 거르고 해결은 아래 목록을 편다 (점검 2.20) */}
            {변화단추('새로깨짐', t('회귀 실패'))}
            {변화단추('계속깨짐', t('기존 실패'))}
            <button type="button" className="rf-stat" aria-pressed={해결열림} disabled={칸수(insights, '고쳐짐') === 0} onClick={() => set해결열림(!해결열림)}>
              {t('해결')} <b className="num">{칸수(insights, '고쳐짐')}</b>
            </button>
          </div>
          {/* 주소를 바꿨다는 사실은 접거나 숨기지 않는다 — 다른 서버에서 돈 결과를 같은 조건으로 읽게 된다 (SPEC §6) */}
          {!insights.주소바뀜 ? null : <span className="rf-note">{t('이전 실행은 다른 주소에서 실행됐습니다')}</span>}
        </div>
      )}

      {insights === null || 앞 === null ? null : (
        <div className="rf-under">
          {/* 일부만 골라 돌린 실행은 직전에 있던 거의 전부가 「빠진 것」이라 소음이다 — 빠진 케이스 수가 이번에 돈 케이스 수 이상이면 감춘다 (점검표 B15e · WEB-F9-20) */}
          {insights.빠진건수 === 0 || new Set(항목들.map((i) => i.tcId)).size <= insights.빠진건수 ? null : <빠진목록 앞={앞.runId} 이번={항목들} 건수={insights.빠진건수} />}
          <해결목록 insights={insights} 열림={해결열림} on토글={set해결열림} />
        </div>
      )}
    </section>
  );
}
