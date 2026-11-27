// 실행 기록 목록의 표 — 한 줄에 실행 하나 (도메인/실행 §8.7 「목록은 표다」 · DESIGN.md 「실행 기록」)
// 이전 버전의 줄(제목 · 작은 글 한 줄 · 막대 · 큰 숫자)은 왼쪽 좁은 칸에 맞춘 꼴이라 전체 폭으로 펴면 가운데가 비고 숫자가 오른쪽 끝에 몰렸다

import type { RunListRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 시간글자 } from './remainText.js';
import { 실행결과주소 } from './route.js';
import { 무엇을, 시작글, 시작방식글 } from './runName.js';
import { 도는중, 상태라벨 } from './runState.js';

export function 실행표머리() {
  const t = use말();
  return (
    <div className="rt-row rt-head rowhead" role="row">
      <span aria-hidden="true" />
      <span role="columnheader">RUN</span>
      <span role="columnheader">{t('실행')}</span>
      <span role="columnheader">{t('시작 방식')}</span>
      <span role="columnheader">{t('빌드')}</span>
      <span role="columnheader">{t('시작')}</span>
      <span role="columnheader" className="r">
        {t('소요 시간')}
      </span>
      <span role="columnheader">{t('통과율')}</span>
      <span role="columnheader" className="r">
        Pass
      </span>
      <span role="columnheader" className="r">
        Fail
      </span>
      <span role="columnheader" className="r">
        Not tested
      </span>
    </div>
  );
}

/** @param 목록조건 걸어 둔 조건 — 결과 화면의 「← 실행 기록」 · 「이전 · 다음 실행」이 이 조건을 쓴다 */
export function 실행표줄({ run, 목록조건 }: { run: RunListRow; 목록조건: string }) {
  const t = use말();
  const 언어 = use언어();
  const { pass, fail, na } = run.counts;
  const 전체 = pass + fail + na;
  const 끝났나 = run.status === 'FINISHED';
  const 소요 = 끝났나 && run.finishedAt !== null ? 시간글자(Date.parse(run.finishedAt) - Date.parse(run.startedAt), 언어) : '—';
  const 회귀 = run.change?.newFail ?? 0;
  const 미확정 = run.counts.unconfirmed ?? 0;
  const 막힘 = run.counts.blocked ?? 0;
  return (
    // 줄 전체가 고리다 — 누르면 그 실행의 결과 화면으로 넘어간다. 띠는 Fail 이 있는 줄에만 선다 (DESIGN.md 「판정」)
    <a className={fail > 0 ? 'rt-row rt-line fail' : 'rt-row rt-line'} href={실행결과주소(run.runId, { 목록: 목록조건 })}>
      <span className="rt-gutter" aria-hidden="true" />
      <span className="mono rt-run">{run.runId}</span>
      <span className="rt-title">
        <span className="rt-name">{무엇을(run, t)}</span>
        {/* 끝까지 돈 실행은 상태를 적지 않는다 — 진행 중 · 중단 · 준비 실패만 꼬리표로 선다 */}
        {끝났나 ? null : <span className="case-tag">{상태라벨(run.status, 언어)}</span>}
        {회귀 === 0 ? null : <span className="rt-reg">{t('회귀 실패 {수}', { 수: 회귀 })}</span>}
        {미확정 === 0 ? null : <span className="rt-sub">{t('미확정 {수}건', { 수: 미확정 })}</span>}
      </span>
      <span className="rt-sub">{시작방식글(run.origin, t)}</span>
      <span className="mono rt-build">{run.buildNo ?? '—'}</span>
      <span className="rt-sub num">{시작글(run.startedAt, 언어)}</span>
      <span className="rt-sub num r">{소요}</span>
      <span className="rt-rate">
        {전체 === 0 ? null : (
          <span className="rt-bar" aria-hidden="true">
            <i style={{ flex: pass, background: 'var(--pass)' }} />
            <i style={{ flex: fail, background: 'var(--fail)' }} />
            <i style={{ flex: na, background: 'var(--na)' }} />
          </span>
        )}
        {/* 도는 동안에는 적지 않는다 — 끝나면 달라질 비율이다. 분모에는 Not tested(Blocked 포함)도 든다 (도메인/리포팅 §3.3) */}
        <b className="num">{도는중(run.status) || 전체 === 0 ? '—' : `${((pass / 전체) * 100).toFixed(1)}%`}</b>
      </span>
      <span className="num r rt-p">{pass}</span>
      <span className={fail > 0 ? 'num r rt-f' : 'num r rt-zero'}>{fail}</span>
      <span className="num r rt-n">
        {na}
        {막힘 === 0 ? null : <small> (Blocked {막힘})</small>}
      </span>
    </a>
  );
}
