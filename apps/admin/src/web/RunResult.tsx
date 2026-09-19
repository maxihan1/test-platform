// 실행 결과 목록 (SPEC §8.3). 케이스 1건 = 1행이고 환경별 판정을 판정 칸에 나란히 묶는다
// POST /api/runs는 끝나기 전에 돌아온다. status가 FINISHED가 될 때까지 화면이 다시 묻는다 (SPEC §7.1)

import { useEffect, useState } from 'react';

import { api, type ItemStatus, type Platform, type RunItemSummary } from './api.js';
import { filterGroups, groupByCase } from './group.js';
import { 도는중 } from './runState.js';
import { Failed, Loading, PLATFORM_LABEL, PLATFORMS, seconds, STATUS_COLOR, STATUS_LABEL, useAsync, Verdict, when } from './ui.js';

const PAGE_SIZE = 20;
const STATUSES: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const ENVS: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];

// 행의 거터 색. 환경 하나라도 깨졌으면 실패로 보여야 한다
function worst(items: RunItemSummary[]): ItemStatus {
  if (items.some((item) => item.status === 'FAIL')) return 'FAIL';
  if (items.every((item) => item.status === 'PASS')) return 'PASS';
  return 'NA';
}

export function RunResult({ runId }: { runId: number }) {
  const [status, setStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [env, setEnv] = useState<Platform | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const run = useAsync(() => api.run(runId), [runId]);
  const data = run.data;
  // ABORTED 를 빠뜨리면 사람이 멈춘 실행에서 2초마다 영원히 다시 묻는다 (SPEC §8.3)
  const running = data !== null && 도는중(data.status);
  const reload = run.reload;

  // 실행은 뒤에서 이어진다. 끝날 때까지만 다시 묻고 끝나면 멈춘다
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [running, reload]);

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null) return <Loading />;

  const groups = filterGroups(groupByCase(data.items), status, env);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const shownPage = Math.min(page, totalPages);
  const shown = groups.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const columns = env === 'ALL' ? PLATFORMS : [env];
  const { pass, fail, na } = data.counts;

  function choose<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="runid">RUN {data.runId}</div>
          <div className="runmeta">
            {when(data.startedAt)} · {data.title} · 실행자 {data.triggeredBy}
            {running ? ` · 도는 중 ${data.counts.running}건` : ''}
          </div>
        </div>
        <div className="tally">
          <div>
            <b style={{ color: 'var(--pass)' }}>{pass}</b>
            <span>통과</span>
          </div>
          <div>
            <b style={{ color: 'var(--fail)' }}>{fail}</b>
            <span>실패</span>
          </div>
          <div>
            <b style={{ color: 'var(--na)' }}>{na}</b>
            <span>미실행</span>
          </div>
        </div>
      </div>

      {pass + fail + na === 0 ? null : (
        <div className="stripe">
          <i style={{ background: 'var(--pass)', flex: pass }} />
          <i style={{ background: 'var(--fail)', flex: fail }} />
          <i style={{ background: 'var(--na)', flex: na }} />
        </div>
      )}

      <div className="toolbar">
        <span className="filter-label">판정</span>
        {STATUSES.map((value) => (
          <button
            className="chip"
            key={value}
            aria-pressed={status === value}
            onClick={() => choose(setStatus)(value)}
          >
            {value === 'ALL' ? '전체' : STATUS_LABEL[value]}
          </button>
        ))}
        <span className="filter-label">환경</span>
        {ENVS.map((value) => (
          <button className="chip" key={value} aria-pressed={env === value} onClick={() => choose(setEnv)(value)}>
            {value === 'ALL' ? '전체' : PLATFORM_LABEL[value]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">조건에 맞는 결과가 없습니다.</div>
      ) : (
        shown.map((group) => {
          const items = columns
            .map((platform) => group.byPlatform[platform])
            .filter((item): item is RunItemSummary => item !== undefined);

          return (
            <div className="row" key={group.tcId}>
              <div className="gutter" style={{ background: STATUS_COLOR[worst(items)] }} />
              <div className="tcid">{group.tcId}</div>
              <div className="title">{group.tcName}</div>
              <div className="right">
                <div className="envs">
                  {columns.map((platform) => {
                    const item = group.byPlatform[platform];
                    return (
                      <div className="env" key={platform}>
                        <span className="env-name">{PLATFORM_LABEL[platform]}</span>
                        {/* 그 환경을 지원하지 않는 케이스는 칸을 —로 비운다 (SPEC §8.3) */}
                        {item === undefined ? (
                          <span className="env-none">—</span>
                        ) : item.finishedAt === null ? (
                          // 실행이 끝나야 판정이 들어간다. 아직인 칸에 미실행 배지를 붙이면 끝난 것처럼 보인다 (SPEC §3.2)
                          <span className="env-none">도는 중</span>
                        ) : (
                          <>
                            <a href={`#/runs/${data.runId}/items/${item.historyId}`}>
                              <Verdict status={item.status} />
                            </a>
                            <span className="env-dur">{seconds(item.durationMs)}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {items.length === 0 ? null : (
                  <a className="btn small" href={`#/runs/${data.runId}/items/${items[0]!.historyId}`}>
                    상세
                  </a>
                )}
              </div>
            </div>
          );
        })
      )}

      {totalPages <= 1 ? null : (
        <div className="pager">
          <button onClick={() => setPage(shownPage - 1)} disabled={shownPage <= 1}>
            이전
          </button>
          <span>
            {shownPage} / {totalPages}
          </span>
          <button onClick={() => setPage(shownPage + 1)} disabled={shownPage >= totalPages}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}
