// 실행 기록 › E2E 화면. 시나리오 실행만 모아 보는 목록이다 (도메인/시나리오 §8.11 · 실행 §8.7)
//
// 본보기는 RunList 다. 쪽 넘김 · 거르개 · 결과 상자가 같고 칸만 다르다.
// 겹치는 조각을 공용으로 빼지 않았다 — 쓰는 곳이 둘뿐이라 셋째가 오면 뺀다.

import { useState } from 'react';

import type { RunQuery } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 다음이있나 } from './paging.js';
import type { 판정 } from './role.js';
import { RunResultModal } from './RunResultModal.js';
import { 상태라벨, 실행자이름 } from './runState.js';
import { scenarioApi, type ScenarioRunList as 목록답, type ScenarioRunRow } from './scenarioApi.js';
import { E2E띠색, 멈춘단계글자 } from './scenarioResultView.js';
import { 칸띠 } from './Summary.js';
import { Failed, Loading, seconds, useAsync, when } from './ui.js';

export function ScenarioRunList({ service, 할수 }: { service: string; 할수: 판정 }) {
  const t = use말();
  const [열린실행, set열린실행] = useState<number | null>(null);
  const 상태칩: { 라벨: string; 값: RunQuery['state'] }[] = [
    { 라벨: t('전체'), 값: undefined },
    { 라벨: t('진행 중'), 값: 'running' },
    { 라벨: t('실패§실행'), 값: 'failed' },
  ];
  const [page, setPage] = useState(1);
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const [state, setState] = useState<RunQuery['state']>(undefined);
  // 서비스를 바꾸면 건 조건도 버린다 — 남기면 다른 서비스에서 「없다」만 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
    setTyped('');
    setQ('');
    setState(undefined);
  }

  const runs = useAsync<목록답>(
    () => scenarioApi.runs(service, page, { ...(q === '' ? {} : { q }), ...(state === undefined ? {} : { state }) }),
    [service, page, q, state],
  );

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7)
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
      <Head
        제목={t('실행 기록')}
        부제={
          <>
            E2E · {t('모두 {건수}건', { 건수: runs.data.total })}
          </>
        }
      />

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
            placeholder={t('시나리오 이름으로 찾기')}
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
              {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다 */}
              {건조건 ? t('조건에 맞는 실행이 없습니다') : t('이 서비스에서 아직 돌린 E2E 시나리오가 없습니다')}
              {건조건 ? <small>{t('검색어나 상태를 바꿔 보세요')}</small> : null}
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
                <a className="btn" style={{ marginTop: '14px' }} href="#/scenarios">
                  {t('시나리오 목록으로')}
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
        <RunResultModal runId={열린실행} 할수={할수} onClose={() => set열린실행(null)} />
      )}
    </>
  );
}

/** 좁은 화면에서도 감추지 않는다 — 실행 기록은 §8 이 좁은 화면에서 제대로 되는 둘로 지정했다 */
function 실행표머리() {
  const t = use말();
  return (
    <div className="rowhead runhead" role="row">
      <span aria-hidden="true" />
      <span role="columnheader">RUN</span>
      <span role="columnheader">{t('시나리오 이름 · 버전')}</span>
      <span role="columnheader">{t('단계 · 멈춘 단계')}</span>
      <span aria-hidden="true" />
    </div>
  );
}

/** 판정인 칸에만 판정 색이 붙는다. 미확정 통과는 판정이 아니라서 색 없는 칸이다 (DESIGN.md 원칙 1) */
function 집계({ 것 }: { 것: 목록답['summary'] }) {
  const t = use말();
  const 언어 = use언어();
  const 몫 = (수: number) => (것.runs === 0 ? '' : t('전체의 {몫}%', { 몫: Math.round((수 / 것.runs) * 100) }));

  return (
    <칸띠
      칸들={[
        { 라벨: t('실행 횟수'), 값: String(것.runs) },
        { 라벨: t('성공'), 값: String(것.allPass), 판정: 'PASS', 부제: 몫(것.allPass) },
        { 라벨: t('통과 · 미확정 포함'), 값: String(것.unconfirmedPass), 부제: 몫(것.unconfirmedPass) },
        { 라벨: t('실패§실행'), 값: String(것.hasFail), 판정: 'FAIL', 부제: 몫(것.hasFail) },
        {
          라벨: t('평균 소요'),
          값: seconds(것.avgDurationMs, 언어),
          부제: t('끝난 {회수}회 기준', { 회수: 것.durationOf }),
        },
      ]}
      비율={[
        { 판정: 'PASS', 몫: 것.allPass },
        { 판정: 'U', 몫: 것.unconfirmedPass },
        { 판정: 'FAIL', 몫: 것.hasFail },
        { 판정: 'NA', 몫: Math.max(0, 것.runs - 것.allPass - 것.unconfirmedPass - 것.hasFail) },
      ]}
    />
  );
}

function 실행줄({ run, on열기 }: { run: ScenarioRunRow; on열기: (runId: number) => void }) {
  const t = use말();
  const 언어 = use언어();
  const 멈춤 = 멈춘단계글자(run, 언어);

  return (
    <div className="row">
      <div className="gutter" style={{ background: E2E띠색(run) }} />
      <div className="tcid">RUN {run.runId}</div>
      <div className="title">
        {run.title} v{run.version}
        <small>
          {when(run.startedAt, 언어)} · {t('실행자 {이름}', { 이름: 실행자이름(run, 언어) })} ·{' '}
          {상태라벨(run.status, 언어)}
        </small>
      </div>
      <div className="right runright">
        <div className="verdict">
          <div>{t('단계 {수}개', { 수: run.partCount })}</div>
          {멈춤 === '' ? null : <div className="unconf-line">{멈춤}</div>}
          {run.verdict === 'PASS' && run.unconfirmed ? (
            <span className="case-tag">{t('미확정 포함')}</span>
          ) : null}
        </div>
        <button type="button" className="btn small" aria-haspopup="dialog" onClick={() => on열기(run.runId)}>
          {t('결과 보기')}
        </button>
      </div>
    </div>
  );
}
