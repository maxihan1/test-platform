// 실행 기록 › E2E 화면 — 목록 화면. 줄을 누르면 E2E 결과 화면(`#/runs/<번호>`)으로 넘어간다 (도메인/시나리오 §8.11 · 실행 §8.7 「E2E 탭도 표다」)
//
// 본보기는 RunList 다. 쪽 넘김 · 주소에 남기는 조건 · 표의 틀(runList.css `.rt-*`)이 같고 칸과 결과 부품만 다르다.

import { useState } from 'react';

import type { RunQuery } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import { 판정표시 } from './proc.js';
import { 시간글자 } from './remainText.js';
import { 실행결과주소 } from './route.js';
import { 옛주소옮김 } from './RunList.js';
import { 시작글 } from './runName.js';
import { 상태라벨 } from './runState.js';
import { scenarioApi, type ScenarioRunList as 목록답, type ScenarioRunRow } from './scenarioApi.js';
import { 멈춘단계글자 } from './scenarioResultView.js';
import { Failed, Loading, useAsync } from './ui.js';

const 상태들 = ['running', 'failed'] as const;

function 번호(글: string | null): number | null {
  return 글 !== null && /^\d{1,10}$/.test(글) ? Number(글) : null;
}

export function ScenarioRunList(props: { service: string }) {
  return (
    <옛주소옮김>
      <시나리오실행목록 {...props} />
    </옛주소옮김>
  );
}

function 시나리오실행목록({ service }: { service: string }) {
  const t = use말();
  const [처음] = useState(주소조건);
  const [page, setPage] = useState(() => 번호(처음.get('page')) ?? 1);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');
  const [state, setState] = useState<RunQuery['state']>(() => 상태들.find((값) => 값 === 처음.get('state')));
  // 서비스를 바꾸면 건 조건을 버린다 — 남기면 다른 서비스에서 「없다」만 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
    setTyped('');
    setQ('');
    setState(undefined);
  }

  // 기본값인 조건은 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const 걸린조건: Record<string, string> = {
    ...(q === '' ? {} : { q }),
    ...(state === undefined ? {} : { state }),
    ...(page === 1 ? {} : { page: String(page) }),
  };
  // E2E 는 애플리케이션 여럿을 섞어 실행 번호로 하나를 못 고른다. 링크가 애플리케이션을 들고 간다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)
  use주소조건('#/runs/e2e', { ...걸린조건, ...(service === '' ? {} : { service }) });

  const runs = useAsync<목록답>(
    () => scenarioApi.runs(service, page, { ...(q === '' ? {} : { q }), ...(state === undefined ? {} : { state }) }),
    [service, page, q, state],
  );

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7)
  const 더있나 = 다음이있나(runs.data);
  const 건조건 = q !== '' || state !== undefined;
  // 쪽은 싣지 않고 애플리케이션은 싣는다 — RunList 와 같은 까닭이다
  const { page: _쪽, ...쪽뺀조건 } = 걸린조건;
  const 목록조건 = new URLSearchParams({ ...쪽뺀조건, ...(service === '' ? {} : { service }) }).toString();

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
      <Head 위치={t('실행 기록')} 제목="E2E" 부제={t('모두 {건수}건', { 건수: runs.data.total })} />

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
            aria-label={t('시나리오 이름으로 검색')}
            placeholder={t('시나리오 이름으로 검색')}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="chip" type="submit">
            {t('검색')}
          </button>
          <label className="run-filter">
            <span className="filter-label">{t('상태')}</span>
            <select value={state ?? ''} onChange={(e) => 상태고르기(상태들.find((값) => 값 === e.target.value))}>
              <option value="">{t('전체')}</option>
              <option value="running">{t('진행 중')}</option>
              <option value="failed">{t('Fail')}</option>
            </select>
          </label>
        </form>

        <div className="rows-scroll">
          {runs.data.items.length === 0 ? (
            <div className="empty">
              {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다 */}
              {건조건 ? t('조건에 맞는 실행이 없습니다') : t('이 애플리케이션에서 아직 실행한 E2E 시나리오가 없습니다')}
              {건조건 ? <small>{t('검색어나 상태를 변경해 보세요')}</small> : null}
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
                  {t('조건 초기화')}
                </button>
              ) : (
                <a className="btn" style={{ marginTop: '14px' }} href="#/scenarios">
                  {t('시나리오 목록으로')}
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="rt-row rt-e2e rt-head rowhead" role="row">
                <span aria-hidden="true" />
                <span role="columnheader">RUN</span>
                <span role="columnheader">{t('시나리오')}</span>
                <span role="columnheader">{t('대상 서버')}</span>
                <span role="columnheader">{t('시작')}</span>
                <span role="columnheader" className="r">
                  {t('소요 시간')}
                </span>
                <span role="columnheader">{t('판정')}</span>
                <span role="columnheader">{t('단계')}</span>
              </div>
              {runs.data.items.map((run) => (
                <실행줄 key={run.runId} run={run} 목록조건={목록조건} />
              ))}
            </>
          )}
        </div>

        {page === 1 && !더있나 ? null : (
          <div className="pager">
            <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
              {t('이전')}
            </button>
            <span>{t('{쪽}페이지', { 쪽: page })}</span>
            <button onClick={() => setPage((n) => n + 1)} disabled={!더있나}>
              {t('다음')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** 판정인 칸에만 판정 색이 붙는다 (DESIGN.md 원칙 1). 미확정 섞인 통과도 성공으로 센다 (도메인/시나리오 §3.7 결정 12) */
function 실행줄({ run, 목록조건 }: { run: ScenarioRunRow; 목록조건: string }) {
  const t = use말();
  const 언어 = use언어();
  const 멈춤 = 멈춘단계글자(run, 언어);
  const 끝났나 = run.status === 'FINISHED';
  const 도나 = run.status === 'RUNNING' || run.verdict === null;

  return (
    // 줄 전체가 고리다 — 누르면 그 실행의 결과 화면으로 넘어간다. 띠는 Fail 줄에만 선다 (DESIGN.md 「판정」)
    <a className={!도나 && run.verdict === 'FAIL' ? 'rt-row rt-e2e rt-line fail' : 'rt-row rt-e2e rt-line'} href={실행결과주소(run.runId, { 목록: 목록조건 })}>
      <span className="rt-gutter" aria-hidden="true" />
      <span className="mono rt-run">{run.runId}</span>
      <span className="rt-title">
        <span className="rt-name">
          {run.title} v{run.version}
        </span>
        {/* 끝까지 돈 실행은 상태를 적지 않는다. 도는 실행은 판정 칸이 「진행 중」을 적는다 — 한 줄에 같은 말을 두 번 두지 않는다 */}
        {끝났나 || run.status === 'RUNNING' ? null : <span className="case-tag">{상태라벨(run.status, 언어)}</span>}
        {run.unconfirmed ? <span className="case-tag">{t('미확정')}</span> : null}
      </span>
      <span className="rt-sub">{run.env}</span>
      <span className="rt-sub num">{시작글(run.startedAt, 언어)}</span>
      <span className="rt-sub num r">{끝났나 && run.finishedAt !== null ? 시간글자(Date.parse(run.finishedAt) - Date.parse(run.startedAt), 언어) : '—'}</span>
      {/* 띠 색만으로는 실패와 판정 없음이 안 갈린다 — 판정은 글자가 말한다 (실행 §8.7) */}
      <span className="rt-verdict">{도나 ? <span className="rt-sub">{t('진행 중')}</span> : <판정표시 결과={{ status: run.verdict! }} />}</span>
      <span className="rt-sub rt-steps">
        {t('단계 {수}개', { 수: run.partCount })}
        {멈춤 === '' ? null : <> · {멈춤}</>}
      </span>
    </a>
  );
}
