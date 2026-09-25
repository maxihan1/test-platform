// 실행 묶음 목록. 어느 실행의 결과를 볼지 고르는 자리다 (SPEC §8.7 · §7 GET /api/runs)
//
// **거르는 일은 서버가 한다.** 목록이 쪽으로 나뉘어 오므로 받은 쪽만 거르면 뒤쪽이 조용히 빠진다.
// 머리의 집계도 서버가 낸다 — 그리고 **거르개를 건 뒤의 집합**을 센다.
// 보이는 것과 세는 것이 갈리면 사람은 세 줄을 보면서 「42회」를 읽는다.

import { useState } from 'react';

import { api, type Paged, type RunQuery, type RunSummary, type RunTally } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 다음이있나 } from './paging.js';
import type { 등급 } from './role.js';
import { RunResultModal } from './RunResultModal.js';
import { 상태라벨, 실행자이름 } from './runState.js';
import { 칸띠 } from './Summary.js';
import { Failed, Loading, seconds, useAsync, when } from './ui.js';
import { 미확정글자, 판정없음 } from './unconfirmed.js';

export function RunList({ service, role }: { service: string; role: 등급 }) {
  const t = use말();
  // 상자로 연 실행. 닫으면 **보던 자리와 검색 조건이 그대로 남는다** — 화면을 갈아타면 잃는 것들이다
  const [열린실행, set열린실행] = useState<number | null>(null);
  // 키는 늘 정적 문자열이어야 해서 표를 모듈 밖에 둘 수 없다 — 여기서 만든다
  const 상태칩: { 라벨: string; 값: RunQuery['state'] }[] = [
    { 라벨: t('전체'), 값: undefined },
    { 라벨: t('진행 중'), 값: 'running' },
    // 실행 단위의 「실패」는 항목 단위의 실패와 다른 말이다 (Has failures ↔ Failed)
    { 라벨: t('실패§실행'), 값: 'failed' },
  ];
  const [page, setPage] = useState(1);
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const [state, setState] = useState<RunQuery['state']>(undefined);
  // 서비스를 바꾸면 첫 페이지로 (CaseList 와 같은 이유). 건 조건도 같이 버린다 —
  // 남기면 다른 서비스에서 「없다」를 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
    setTyped('');
    setQ('');
    setState(undefined);
  }

  const 조건: RunQuery = { ...(q === '' ? {} : { q }), ...(state === undefined ? {} : { state }) };
  const runs = useAsync<Paged<RunSummary> & { summary: RunTally }>(
    () => api.runs(service, page, 조건),
    [service, page, q, state],
  );

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7 — §8.1 과 같은 함정이다)
  const 더있나 = 다음이있나(runs.data);
  const 건조건 = q !== '' || state !== undefined;

  function 찾기(term: string) {
    setQ(term);
    setPage(1);
  }

  function 상태고르기(값: RunQuery['state']) {
    setState(값);
    setPage(1);
  }

  return (
    <>
      <Head 제목={t('실행 기록')} 부제={t('모두 {건수}건', { 건수: runs.data.total })} />

      {/* 아무것도 안 돌린 서비스에 0 넷을 늘어놓지 않는다 */}
      {runs.data.summary.runs === 0 ? null : <집계 것={runs.data.summary} />}

      <div className="screen list-screen">
        <form
          className="toolbar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            찾기(typed);
          }}
        >
          <input
            type="text"
            placeholder={t('실행 제목으로 찾기')}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="chip" type="submit">
            {t('찾기')}
          </button>
          <span className="filter-label">{t('상태')}</span>
          {상태칩.map((칩) => (
            <button
              className="chip"
              type="button"
              key={칩.라벨}
              aria-pressed={state === 칩.값}
              onClick={() => 상태고르기(칩.값)}
            >
              {칩.라벨}
            </button>
          ))}
        </form>

        <div className="rows-scroll">
        {runs.data.items.length === 0 ? (
          <div className="empty">
            {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다.
                §8.1 이 케이스 목록에서 이미 세 갈래로 가른 그 문제다 (SPEC §8.7) */}
            {건조건 ? t('조건에 맞는 실행이 없습니다') : t('이 서비스에서 아직 실행한 기록이 없습니다')}
            <small>
              {건조건 ? t('검색어나 상태를 바꿔 보세요') : t('케이스를 골라 실행하면 여기에 쌓입니다')}
            </small>
            {건조건 ? (
              <button
                className="btn"
                style={{ marginTop: '14px' }}
                onClick={() => {
                  setTyped('');
                  찾기('');
                  상태고르기(undefined);
                }}
              >
                {t('조건 지우기')}
              </button>
            ) : (
              <a className="btn" style={{ marginTop: '14px' }} href="#/cases">
                {t('케이스 목록으로')}
              </a>
            )}
          </div>
        ) : (
          <>
            <실행표머리 />
            {runs.data.items.map((run) => (
              <실행줄 key={run.runId} run={run} on열기={set열린실행} />
            ))}
          </>
        )}
        </div>
      </div>

      {page === 1 && !더있나 ? null : (
        <div className="pager">
          <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
            {t('이전')}
          </button>
          <span>{t('{쪽}쪽', { 쪽: page })}</span>
          <button onClick={() => setPage((n) => n + 1)} disabled={!더있나}>
            {t('다음')}
          </button>
        </div>
      )}

      {열린실행 === null ? null : (
        <RunResultModal runId={열린실행} role={role} onClose={() => set열린실행(null)} />
      )}
    </>
  );
}

/**
 * 표머리 (SPEC §8.7, 2026-09-22).
 *
 * **좁은 화면에서도 감추지 않는다.** 이 화면은 §8 이 「좁은 화면에서 제대로 되는 둘」로
 * 지정한 하나다 — 감추면 거기서 칸 이름이 통째로 사라진다.
 * 케이스 목록(§8.1)은 그 둘에 없어서 감춰도 된다. **둘을 같게 만들지 않는다.**
 */
function 실행표머리() {
  const t = use말();
  return (
    <div className="rowhead runhead" role="row">
      <span aria-hidden="true" />
      <span role="columnheader">RUN</span>
      <span role="columnheader">{t('실행 제목')}</span>
      <span role="columnheader">{t('판정')}</span>
      <span aria-hidden="true" />
    </div>
  );
}

/** 머리의 집계 넷. **판정인 칸에만 판정 색이 붙는다** (DESIGN.md 원칙 1) */
function 집계({ 것 }: { 것: RunTally }) {
  const t = use말();
  const 언어 = use언어();
  const 몫 = (수: number) => (것.runs === 0 ? '' : t('전체의 {몫}%', { 몫: Math.round((수 / 것.runs) * 100) }));

  return (
    <칸띠
      칸들={[
        { 라벨: t('실행 횟수'), 값: String(것.runs) },
        { 라벨: t('성공'), 값: String(것.allPass), 판정: 'PASS', 부제: 몫(것.allPass) },
        { 라벨: t('실패§실행'), 값: String(것.hasFail), 판정: 'FAIL', 부제: 몫(것.hasFail) },
        {
          라벨: t('평균 소요'),
          값: seconds(것.avgDurationMs, 언어),
          // 도는 실행은 끝난 시각이 없어 평균에서 빠진다. 안 적으면 전체의 평균으로 읽힌다
          부제: t('끝난 {회수}회 기준', { 회수: 것.durationOf }),
        },
      ]}
      비율={[
        { 판정: 'PASS', 몫: 것.allPass },
        { 판정: 'FAIL', 몫: 것.hasFail },
        { 판정: 'NA', 몫: Math.max(0, 것.runs - 것.allPass - 것.hasFail) },
      ]}
    />
  );
}

function 실행줄({ run, on열기 }: { run: RunSummary; on열기: (runId: number) => void }) {
  const t = use말();
  const 언어 = use언어();
  const 미확정 = 미확정글자(run.counts, 언어);

  return (
    <div className="row">
      {/* 왼쪽 색 띠는 한눈에 훑기 위한 것이고 판정은 아래 숫자와 글자가 말한다 (SPEC §8.7) */}
      {/* 미확정만 돌린 실행은 판정이 없다 — 성공 색도 실패 색도 칠하지 않는다 (도메인/실행 §3.2 · §8.7) */}
      <div
        className="gutter"
        style={{ background: 판정없음(run.counts) ? 'var(--rule)' : run.counts.fail > 0 ? 'var(--fail)' : 'var(--pass)' }}
      />
      <div className="tcid">RUN {run.runId}</div>
      <div className="title">
        {run.title}
        <small>
          {when(run.startedAt, 언어)} · {t('대상 서버 {서버}', { 서버: run.env })} ·{' '}
          {t('실행자 {이름}', { 이름: 실행자이름(run, 언어) })} · {상태라벨(run.status, 언어)}
        </small>
      </div>
      <div className="right">
        <div className="tally">
          <div>
            <b style={{ color: 'var(--pass)' }}>{run.counts.pass}</b>
            <span>{t('통과')}</span>
          </div>
          <div>
            <b style={{ color: 'var(--fail)' }}>{run.counts.fail}</b>
            <span>{t('실패')}</span>
          </div>
          <div>
            <b style={{ color: 'var(--na)' }}>{run.counts.na}</b>
            <span>{t('미실행')}</span>
          </div>
          {미확정 === '' ? null : (
            <div>
              <span>{미확정}</span>
            </div>
          )}
        </div>
        {/* 눌러서 여는 상자다 (SPEC §8.7). 주소는 살아 있고 상자는 길을 하나 더한 것이다 */}
        <button type="button" className="btn small" aria-haspopup="dialog" onClick={() => on열기(run.runId)}>
          {t('결과 보기')}
        </button>
      </div>
    </div>
  );
}
