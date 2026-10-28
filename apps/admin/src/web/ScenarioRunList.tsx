// 실행 기록 › E2E 화면 — 왼쪽 목록 + 오른쪽 결과 칸 (도메인/시나리오 §8.11 · 실행 §8.7 「A안」)
//
// 본보기는 RunList 다. 쪽 넘김 · 주소에 남기는 조건 · 결과 칸 자리가 같고 줄과 결과 부품만 다르다.
// 겹치는 조각을 공용으로 빼지 않았다 — 쓰는 곳이 둘뿐이라 셋째가 오면 뺀다.

import { useState } from 'react';

import type { RunQuery } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import type { 판정하기 } from './runJudge.js';
import { 상태라벨, 실행자이름 } from './runState.js';
import { scenarioApi, type ScenarioRunList as 목록답, type ScenarioRunRow } from './scenarioApi.js';
import { ScenarioResult } from './ScenarioResult.js';
import { E2E띠색, 멈춘단계글자 } from './scenarioResultView.js';
import { Failed, Loading, useAsync, Verdict, when } from './ui.js';

const 상태들 = ['running', 'failed'] as const;

function 번호(글: string | null): number | null {
  return 글 !== null && /^\d{1,10}$/.test(글) ? Number(글) : null;
}

// 판정하기 — 결과 칸이 그 실행의 케이스 서비스로 버튼을 가른다. 주소의 `?run=` 은 띠와 다른 서비스 실행일 수 있다 (화면공통 §8)
// API아래 — 메뉴 「API › E2E 실행 기록」 에서 여는 화면이다(layout.ts). 위치 표시도 메뉴와 같게 한다
export function ScenarioRunList({ service, 판정하기, API아래 = false }: { service: string; 판정하기: 판정하기; API아래?: boolean }) {
  const t = use말();
  const [처음] = useState(주소조건);
  const [page, setPage] = useState(() => 번호(처음.get('page')) ?? 1);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');
  const [state, setState] = useState<RunQuery['state']>(() => 상태들.find((값) => 값 === 처음.get('state')));
  // 사람이 고른 실행. 없으면 결과 칸은 맨 위 줄을 보인다 — 좁은 창에서는 고르기 전까지 목록만 보인다
  const [고른, set고른] = useState(() => 번호(처음.get('run')));
  // 서비스를 바꾸면 건 조건 · 고른 실행을 버린다 — 남기면 다른 서비스에서 「없다」만 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
    setTyped('');
    setQ('');
    setState(undefined);
    set고른(null);
  }

  // 기본값인 조건은 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  use주소조건('#/runs/e2e', {
    ...(고른 === null ? {} : { run: String(고른) }),
    ...(q === '' ? {} : { q }),
    ...(state === undefined ? {} : { state }),
    ...(page === 1 ? {} : { page: String(page) }),
  });

  const runs = useAsync<목록답>(
    () => scenarioApi.runs(service, page, { ...(q === '' ? {} : { q }), ...(state === undefined ? {} : { state }) }),
    [service, page, q, state],
  );

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7)
  const 더있나 = 다음이있나(runs.data);
  const 건조건 = q !== '' || state !== undefined;
  const 보는실행 = 고른 ?? runs.data.items[0]?.runId ?? null;
  // 거르개를 바꿔도 고른 실행은 그대로 둔다 — 대신 목록에 없는 까닭을 한 줄 적는다
  const 조건밖 = 고른 !== null && 건조건 && !runs.data.items.some((run) => run.runId === 고른);

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
      <Head 위치={API아래 ? t('API') : t('실행 기록')} 제목={API아래 ? t('E2E 실행 기록') : 'E2E'} 부제={t('모두 {건수}건', { 건수: runs.data.total })} />

      <div className={고른 === null ? 'runs-split' : 'runs-split picked'}>
        <div className="screen list-screen runs-list">
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
              aria-label={t('시나리오 이름으로 찾기')}
              placeholder={t('시나리오 이름으로 찾기')}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button className="chip" type="submit">
              {t('찾기')}
            </button>
            <label className="run-filter">
              <span className="filter-label">{t('상태')}</span>
              <select value={state ?? ''} onChange={(e) => 상태고르기(상태들.find((값) => 값 === e.target.value))}>
                <option value="">{t('전체')}</option>
                <option value="running">{t('진행 중')}</option>
                <option value="failed">{t('실패§실행')}</option>
              </select>
            </label>
          </form>

          {조건밖 ? <p className="runs-out">{t('고른 실행은 지금 조건 밖입니다')}</p> : null}

          <div className="rows-scroll">
            {runs.data.items.length === 0 ? (
              <div className="empty">
                {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다 */}
                {건조건 ? t('조건에 맞는 실행이 없습니다') : t('이 애플리케이션에서 아직 돌린 E2E 시나리오가 없습니다')}
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
                {/* 좁은 화면에서도 감추지 않는다 — 실행 기록은 휴대폰에서 여는 화면이다(공통/5 §8 「휴대폰 화면」) */}
                <div className="rowhead run-rowhead" role="row">
                  <span aria-hidden="true" />
                  <span role="columnheader">{t('실행')}</span>
                  <span role="columnheader">{t('판정')}</span>
                </div>
                {runs.data.items.map((run) => (
                  <실행줄 key={run.runId} run={run} 고름={run.runId === 보는실행} on고르기={set고른} />
                ))}
              </>
            )}
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
        </div>

        {보는실행 === null ? null : (
          <section className="run-pane" aria-label={t('실행 결과')}>
            {/* 좁은 창에서는 목록과 결과가 한 단으로 접힌다 — 결과에서 목록으로 돌아가는 길이다 */}
            <button type="button" className="btn small ghost pane-back" onClick={() => set고른(null)}>
              {t('목록으로')}
            </button>
            <ScenarioResult
              key={보는실행}
              runId={보는실행}
              판정하기={판정하기}
              칸안
              on새실행={(runId) => {
                // 새 실행은 첫 쪽 맨 위에 선다 — 뒤쪽에 머물면 고른 줄이 목록 어디에도 없다
                set고른(runId);
                setPage(1);
                runs.reload();
              }}
            />
          </section>
        )}
      </div>
    </>
  );
}

/** 판정인 칸에만 판정 색이 붙는다 (DESIGN.md 원칙 1). 미확정 섞인 통과도 성공으로 센다 (도메인/시나리오 §3.7 결정 12) */
function 실행줄({ run, 고름, on고르기 }: { run: ScenarioRunRow; 고름: boolean; on고르기: (runId: number) => void }) {
  const t = use말();
  const 언어 = use언어();
  const 멈춤 = 멈춘단계글자(run, 언어);

  return (
    // 줄 전체가 누르는 자리다. 화면을 떠나지 않고 오른쪽 결과 칸이 그 실행으로 바뀐다
    <button type="button" className="row run-row" aria-current={고름 ? 'true' : undefined} onClick={() => on고르기(run.runId)}>
      <span className="gutter" style={{ background: E2E띠색(run) }} />
      <span className="title">
        {run.title} v{run.version}
        <small>
          RUN {run.runId} · {when(run.startedAt, 언어)} · {t('대상 서버 {서버}', { 서버: run.env })} ·{' '}
          {t('실행자 {이름}', { 이름: 실행자이름(run, 언어) })} · {상태라벨(run.status, 언어)}
        </small>
      </span>
      {/* 띠 색만으로는 실패와 판정 없음이 안 갈린다 — 판정은 글자가 말한다 (실행 §8.7) */}
      <span className="run-verdict">
        {/* 같은 줄 부제의 상태 글자와 같은 말을 쓴다 — 한 줄에 「진행 중」 · 「실행 중」이 같이 서면 다른 상태로 읽힌다 */}
        {run.status === 'RUNNING' || run.verdict === null ? <span>{t('진행 중')}</span> : <Verdict status={run.verdict} />}
        <span>{t('단계 {수}개', { 수: run.partCount })}</span>
        {멈춤 === '' ? null : <span className="unconf-line">{멈춤}</span>}
        {run.unconfirmed ? <span className="case-tag">{t('미확정')}</span> : null}
      </span>
    </button>
  );
}
