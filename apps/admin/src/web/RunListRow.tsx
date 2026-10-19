// 실행 기록 목록의 줄 하나 — 자동 제목 · 작은 글 한 줄 · 통과/실패/미실행 막대 · 직전 대비 꼬리표 (도메인/실행 §8.7 「A안」)

import type { RunListRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 시간글자 } from './remainText.js';
import { 도는중, 상태라벨, 실행자이름 } from './runState.js';
import { when } from './ui.js';
import { 그중미확정글 } from './unconfirmed.js';

/**
 * 왼쪽 띠 색. **실패가 0 이라고 초록이 아니다** — 960건이 모두 미실행인 중단 실행도 초록이던 것을 고쳤다(점검 1.1).
 * 미실행이 섞이면 회색, 도는 중이면 진행 색(대표색 — DESIGN.md 「지금 진행 중인 것」)이다
 */
export function 띠색(run: Pick<RunListRow, 'status' | 'counts'>): string {
  if (run.counts.fail > 0) return 'var(--fail)';
  if (도는중(run.status)) return 'var(--accent)';
  if (run.counts.na > 0 || run.status === 'ABORTED') return 'var(--na)';
  return 'var(--pass)';
}

const 시작방식글 = { MANUAL: '직접 실행', SCHEDULED: '정기 실행', RERUN: '실패 다시 실행' } as const;

export function 실행줄({ run, 고름, on고르기 }: { run: RunListRow; 고름: boolean; on고르기: (runId: number) => void }) {
  const t = use말();
  const 언어 = use언어();
  const 미확정 = 그중미확정글(run.counts, 언어);
  const { pass, fail, na } = run.counts;
  const 끝 = run.finishedAt === null ? null : Date.parse(run.finishedAt) - Date.parse(run.startedAt);
  // 끝난 실행은 소요를, 도는 · 멈춘 실행은 상태를 적는다 — 띠 색만으로 상태를 전하지 않는다
  const 상태글 = run.status === 'FINISHED' && 끝 !== null ? 시간글자(끝, 언어) : 상태라벨(run.status, 언어);

  return (
    // 줄 전체가 누르는 자리다. 화면을 떠나지 않고 오른쪽 결과 칸이 그 실행으로 바뀐다
    <button type="button" className="row run-row" aria-current={고름 ? 'true' : undefined} onClick={() => on고르기(run.runId)}>
      <span className="gutter" style={{ background: 띠색(run) }} />
      <span className="title">
        {run.title}
        <small>
          RUN {run.runId} · {when(run.startedAt, 언어)}
          {run.origin === undefined ? '' : ` · ${t(시작방식글[run.origin])}`} · {run.env} · {실행자이름(run, 언어)} · {상태글}
        </small>
      </span>
      <span className="run-verdict">
        {pass + fail + na === 0 ? null : (
          <span className="stripe" aria-hidden="true">
            <i style={{ background: 'var(--pass)', flex: pass }} />
            <i style={{ background: 'var(--fail)', flex: fail }} />
            <i style={{ background: 'var(--na)', flex: na }} />
          </span>
        )}
        <span className="tally">
          <span>
            <b style={{ color: 'var(--pass-text)' }}>{pass}</b> <span>{t('통과')}</span>
          </span>
          <span>
            <b style={{ color: 'var(--fail-text)' }}>{fail}</b> <span>{t('실패')}</span>
          </span>
          <span>
            <b style={{ color: 'var(--na-text)' }}>{na}</b> <span>{t('미실행')}</span>
          </span>
        </span>
        {미확정 === '' ? null : <span className="unconf-line">{미확정}</span>}
        {/* 견줄 앞이 없거나 도는 중이면 change 가 null 이라 꼬리표가 없다 (도메인/실행 §7 `GET /api/runs`) */}
        {run.change == null || run.change.newFail + run.change.stillFail === 0 ? null : (
          <span className="run-tags">
            {run.change.newFail === 0 ? null : <span className="fc-tag fc-new">{t('신규 실패 {수}', { 수: run.change.newFail })}</span>}
            {run.change.stillFail === 0 ? null : <span className="fc-tag">{t('계속 실패 {수}', { 수: run.change.stillFail })}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
