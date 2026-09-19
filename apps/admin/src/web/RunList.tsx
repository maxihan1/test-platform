// 실행 묶음 목록. 어느 실행의 결과를 볼지 고르는 자리다 (SPEC §7 GET /api/runs)

import { useState } from 'react';

import { api, type Paged, type RunSummary } from './api.js';
import { 다음이있나 } from './paging.js';
import { 상태라벨, 실행자이름 } from './runState.js';
import { Failed, Loading, useAsync, when } from './ui.js';

export function RunList({ service }: { service: string }) {
  const [page, setPage] = useState(1);
  // 서비스를 바꾸면 첫 페이지로 (CaseList 와 같은 이유)
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
  }
  const runs = useAsync<Paged<RunSummary>>(() => api.runs(service, page), [service, page]);

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7 — §8.1 과 같은 함정이다)
  const 더있나 = 다음이있나(runs.data);

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="runid">실행 기록</div>
          {/* 총건수는 안내로만 쓴다. 페이지 수를 이 값으로 계산하지 않는다 (SPEC §8.7) */}
          <div className="runmeta">모두 {runs.data.total}건</div>
        </div>
      </div>

      {runs.data.items.length === 0 ? (
        <div className="empty">
          {/* 서비스를 바꿔 들어온 사람에게 「아직 실행한 기록이 없습니다」는 틀린 문장이다 (SPEC §8.7) */}
          이 서비스에서 아직 실행한 기록이 없습니다
          <small>케이스를 골라 실행하면 여기에 쌓입니다</small>
          <a className="btn" style={{ marginTop: '14px' }} href="#/cases">
            케이스 목록으로
          </a>
        </div>
      ) : (
        runs.data.items.map((run) => (
          <div className="row" key={run.runId}>
            <div className="gutter" style={{ background: run.counts.fail > 0 ? 'var(--fail)' : 'var(--pass)' }} />
            <div className="tcid">RUN {run.runId}</div>
            <div className="title">
              {run.title}
              <small>
                {when(run.startedAt)} · 대상 서버 {run.env} · 실행자 {실행자이름(run)} ·{' '}
                {상태라벨(run.status)}
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
        ))
      )}

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
    </div>
  );
}
