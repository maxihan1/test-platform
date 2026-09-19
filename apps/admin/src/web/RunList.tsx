// 실행 묶음 목록. 어느 실행의 결과를 볼지 고르는 자리다 (SPEC §7 GET /api/runs)

import { useState } from 'react';

import { api, type Paged, type RunSummary } from './api.js';
import { 상태라벨 } from './runState.js';
import { Failed, Loading, useAsync, when } from './ui.js';

export function RunList({ service }: { service: string }) {
  const [page, setPage] = useState(1);
  const runs = useAsync<Paged<RunSummary>>(() => api.runs(service, page), [service, page]);

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  const totalPages = Math.max(1, Math.ceil(runs.data.total / runs.data.pageSize));

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="runid">실행 기록</div>
          <div className="runmeta">모두 {runs.data.total}건</div>
        </div>
      </div>

      {runs.data.items.length === 0 ? (
        <div className="empty">아직 실행한 기록이 없습니다.</div>
      ) : (
        runs.data.items.map((run) => (
          <div className="row" key={run.runId}>
            <div className="gutter" style={{ background: run.counts.fail > 0 ? 'var(--fail)' : 'var(--pass)' }} />
            <div className="tcid">RUN {run.runId}</div>
            <div className="title">
              {run.title}
              <small>
                {when(run.startedAt)} · 실행자 {run.triggeredBy} · {상태라벨(run.status)}
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

      {totalPages <= 1 ? null : (
        <div className="pager">
          <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((n) => n + 1)} disabled={page >= totalPages}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}
