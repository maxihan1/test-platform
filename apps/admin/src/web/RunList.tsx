// 실행 묶음 목록. 어느 실행의 결과를 볼지 고르는 자리다 (SPEC §8.7 · §7 GET /api/runs)
//
// **거르는 일은 서버가 한다.** 목록이 쪽으로 나뉘어 오므로 받은 쪽만 거르면 뒤쪽이 조용히 빠진다.
// 머리의 집계도 서버가 낸다 — 그리고 **거르개를 건 뒤의 집합**을 센다.
// 보이는 것과 세는 것이 갈리면 사람은 세 줄을 보면서 「42회」를 읽는다.

import { useState } from 'react';

import { api, type Paged, type RunQuery, type RunSummary, type RunTally } from './api.js';
import { Head } from './Head.js';
import { 다음이있나 } from './paging.js';
import { 상태라벨, 실행자이름 } from './runState.js';
import { 칸띠 } from './Summary.js';
import { Failed, Loading, seconds, useAsync, when } from './ui.js';

const 상태칩: { 라벨: string; 값: RunQuery['state'] }[] = [
  { 라벨: '전체', 값: undefined },
  { 라벨: '진행 중', 값: 'running' },
  { 라벨: '실패', 값: 'failed' },
];

export function RunList({ service }: { service: string }) {
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
      <Head 제목="실행 기록" 부제={`모두 ${runs.data.total}건`} />

      {/* 아무것도 안 돌린 서비스에 0 넷을 늘어놓지 않는다 */}
      {runs.data.summary.runs === 0 ? null : <집계 것={runs.data.summary} />}

      <div className="screen">
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
            placeholder="실행 제목으로 찾기"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="chip" type="submit">
            찾기
          </button>
          <span className="filter-label">상태</span>
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

        {runs.data.items.length === 0 ? (
          <div className="empty">
            {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다.
                §8.1 이 케이스 목록에서 이미 세 갈래로 가른 그 문제다 (SPEC §8.7) */}
            {건조건 ? '조건에 맞는 실행이 없습니다' : '이 서비스에서 아직 실행한 기록이 없습니다'}
            <small>
              {건조건 ? '검색어나 상태를 바꿔 보세요' : '케이스를 골라 실행하면 여기에 쌓입니다'}
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
                조건 지우기
              </button>
            ) : (
              <a className="btn" style={{ marginTop: '14px' }} href="#/cases">
                케이스 목록으로
              </a>
            )}
          </div>
        ) : (
          runs.data.items.map((run) => <실행줄 key={run.runId} run={run} />)
        )}
      </div>

      {page === 1 && !더있나 ? null : (
        <div className="pager">
          <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
            이전
          </button>
          <span>{page}쪽</span>
          <button onClick={() => setPage((n) => n + 1)} disabled={!더있나}>
            다음
          </button>
        </div>
      )}
    </>
  );
}

/** 머리의 집계 넷. **판정인 칸에만 판정 색이 붙는다** (DESIGN.md 원칙 1) */
function 집계({ 것 }: { 것: RunTally }) {
  const 몫 = (수: number) => (것.runs === 0 ? '' : `전체의 ${String(Math.round((수 / 것.runs) * 100))}%`);

  return (
    <칸띠
      칸들={[
        { 라벨: '실행 횟수', 값: String(것.runs) },
        { 라벨: '성공', 값: String(것.allPass), 판정: 'PASS', 부제: 몫(것.allPass) },
        { 라벨: '실패', 값: String(것.hasFail), 판정: 'FAIL', 부제: 몫(것.hasFail) },
        {
          라벨: '평균 소요',
          값: seconds(것.avgDurationMs),
          // 도는 실행은 끝난 시각이 없어 평균에서 빠진다. 안 적으면 전체의 평균으로 읽힌다
          부제: `끝난 ${String(것.durationOf)}회 기준`,
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

function 실행줄({ run }: { run: RunSummary }) {
  return (
    <div className="row">
      {/* 왼쪽 색 띠는 한눈에 훑기 위한 것이고 판정은 아래 숫자와 글자가 말한다 (SPEC §8.7) */}
      <div className="gutter" style={{ background: run.counts.fail > 0 ? 'var(--fail)' : 'var(--pass)' }} />
      <div className="tcid">RUN {run.runId}</div>
      <div className="title">
        {run.title}
        <small>
          {when(run.startedAt)} · 대상 서버 {run.env} · 실행자 {실행자이름(run)} · {상태라벨(run.status)}
        </small>
      </div>
      <div className="right">
        <div className="tally">
          <div>
            <b style={{ color: 'var(--pass)' }}>{run.counts.pass}</b>
            <span>통과</span>
          </div>
          <div>
            <b style={{ color: 'var(--fail)' }}>{run.counts.fail}</b>
            <span>실패</span>
          </div>
          <div>
            <b style={{ color: 'var(--na)' }}>{run.counts.na}</b>
            <span>미실행</span>
          </div>
        </div>
        <a className="btn small" href={`#/runs/${run.runId}`}>
          결과 보기
        </a>
      </div>
    </div>
  );
}
