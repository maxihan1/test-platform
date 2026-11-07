// 실행 기록 › 호환성 — 지난 호환성 실행 표. 줄을 누르면 결과로 간다 (도메인/호환성 §8.17 ⑤)

import { useState } from 'react';

import { compatApi, type CompatRunRow } from './compatApi.js';
import { 결과주소 } from './CompatRunWindow.js';
import { 끝났나 } from './compatRunView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import { 실행자이름 } from './runState.js';
import { Failed, Loading, useAsync, when } from './ui.js';

function 번호(글: string | null): number | null {
  return 글 !== null && /^\d{1,10}$/.test(글) ? Number(글) : null;
}

/** 도는 줄의 진행 — 목록 줄에는 진행 수가 없어 그 실행 결과를 따로 읽는다. 도는 실행은 많아야 몇 건이다 */
function 도는진행({ runId }: { runId: number }) {
  const t = use말();
  const r = useAsync(() => compatApi.run(runId), [runId]);
  if (r.data === null) return <span className="cr-state now">{t('실행 중')}</span>;
  const 끝 = r.data.devices.filter(끝났나).length;
  const 점검 = r.data.devices.reduce((a, d) => ({ done: a.done + d.checks.done, total: a.total + d.checks.total }), { done: 0, total: 0 });
  return (
    <span className="cr-state now">
      {t('실행 중 · 점검 상태 {끝난} / {전체} · AI 점검 {점검} / {총}장', { 끝난: 끝, 전체: r.data.devices.length, 점검: 점검.done, 총: 점검.total })}
    </span>
  );
}

function 줄({ run }: { run: CompatRunRow }) {
  const t = use말();
  const 언어 = use언어();
  const c = run.compat;
  const 주소 = 결과주소(run.runId);
  return (
    // 줄 어디를 눌러도 결과로 간다. 화면 읽기 프로그램은 RUN 번호 링크로 간다
    <tr className="cr-row" onClick={() => (window.location.hash = 주소)}>
      <td data-label={t('실행')}>
        <a className="mono" href={주소} onClick={(e) => e.stopPropagation()}>
          RUN {run.runId}
        </a>
      </td>
      <td data-label={t('세트')}>
        {c.setName}
        {run.buildNo == null ? null : <div className="compat-faint">{t('빌드 {번호}', { 번호: run.buildNo })}</div>}
      </td>
      <td data-label={t('디바이스')}>{t('{수}대', { 수: c.devices })}</td>
      {run.status === 'RUNNING' ? (
        <td colSpan={3} data-label={t('진행')}>
          <도는진행 runId={run.runId} />
        </td>
      ) : (
        <>
          <td data-label={t('점검 화면')} className="mono">
            {c.screens}
          </td>
          <td data-label={t('UI 결함')}>
            <div className="compat-pills">
              {c.confirmed === 0 ? null : <span className="compat-bad">{t('결함 확정 {수}', { 수: c.confirmed })}</span>}
              {c.pending === 0 ? null : <span className="compat-tag">{t('미판정 {수}', { 수: c.pending })}</span>}
              {c.stopReason === null ? null : <span className="compat-tag">{c.stopReason}</span>}
              {c.confirmed === 0 && c.pending === 0 && c.stopReason === null ? <span className="compat-faint">{t('없음')}</span> : null}
            </div>
            {c.affected.states === 0 ? null : <div className="compat-faint">{t('발생 {수} / {전체} 상태', { 수: c.affected.states, 전체: c.affected.total })}</div>}
          </td>
          <td data-label={t('미점검')}>{t('{수}화면', { 수: c.unchecked })}</td>
        </>
      )}
      <td data-label={t('실행 일시 · 실행자')}>
        <span className="mono">{when(run.startedAt, 언어)}</span>
        <div className="compat-faint">{실행자이름(run, 언어)}</div>
      </td>
    </tr>
  );
}

export function CompatRunList({ service }: { service: string }) {
  const t = use말();
  const [처음] = useState(주소조건);
  const [page, setPage] = useState(() => 번호(처음.get('page')) ?? 1);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');

  // 기본값인 조건은 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  use주소조건('#/runs/compat', { ...(q === '' ? {} : { q }), ...(page === 1 ? {} : { page: String(page) }), ...(service === '' ? {} : { service }) });
  const runs = useAsync(() => compatApi.runs(service, page, q), [service, page, q]);

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;
  // 총건수로 페이지 수를 계산하지 않는다 (실행 §8.7)
  const 더있나 = 다음이있나(runs.data);

  return (
    <>
      <Head 위치={t('실행 기록')} 제목={t('호환성')} 부제={t('호환성 실행은 기능 · UI 실행 기록과 통과율에 포함하지 않습니다')} />
      <div className="screen">
        <form
          className="toolbar"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(typed);
            setPage(1);
          }}
        >
          <input type="text" aria-label={t('세트 이름으로 찾기')} placeholder={t('세트 이름으로 찾기')} value={typed} onChange={(e) => setTyped(e.target.value)} />
          <button className="chip" type="submit">
            {t('찾기')}
          </button>
        </form>
        {runs.data.items.length === 0 ? (
          <div className="empty">
            {q === '' ? t('이 애플리케이션에서 아직 돌린 호환성 실행이 없습니다') : t('조건에 맞는 실행이 없습니다')}
            {q === '' ? (
              <a className="btn" style={{ marginTop: '14px' }} href={`#/compat?service=${encodeURIComponent(service)}`}>
                {t('호환성 세트로')}
              </a>
            ) : null}
          </div>
        ) : (
          <div className="compat-panel">
            <table className="compat-table compat-list">
              <thead>
                <tr>
                  <th>{t('실행')}</th>
                  <th>{t('세트')}</th>
                  <th>{t('디바이스')}</th>
                  <th>{t('점검 화면')}</th>
                  <th>{t('UI 결함')}</th>
                  <th>{t('미점검')}</th>
                  <th>{t('실행 일시 · 실행자')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.data.items.map((run) => (
                  <줄 key={run.runId} run={run} />
                ))}
              </tbody>
            </table>
          </div>
        )}
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
      </div>
    </>
  );
}
