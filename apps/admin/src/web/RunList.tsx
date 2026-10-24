// 실행 기록 — 왼쪽 목록 + 오른쪽 결과 칸 (도메인/실행 §8.7 「A안」 · §7 GET /api/runs)
//
// **거르는 일은 서버가 한다.** 목록이 쪽으로 나뉘어 오므로 받은 쪽만 거르면 뒤쪽이 조용히 빠진다.
// **고른 실행과 거르개는 주소에 남긴다** — 항목 상세에 갔다 돌아오기 · 새로고침 · 뒤로 가기에 풀리지 않는다(점검 2.9).

import { useEffect, useState } from 'react';

import { api, type EnvRow, type RunQuery } from './api.js';
import { Head } from './Head.js';
import { use말 } from './i18n.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import { RunResult } from './RunResult.js';
import { 실행줄 } from './RunListRow.js';
import { 도는중 } from './runState.js';
import type { 판정하기 } from './runJudge.js';
import { Failed, Loading, useAsync } from './ui.js';

const 상태들 = ['running', 'failed'] as const;
const 방식들 = ['manual', 'scheduled', 'rerun', 'build'] as const;
const 기간들 = [7, 14, 30] as const;

function 고른값<T extends string>(글: string | null, 값들: readonly T[]): T | undefined {
  return 값들.find((값) => 값 === 글);
}

function 번호(글: string | null): number | null {
  return 글 !== null && /^\d{1,10}$/.test(글) ? Number(글) : null;
}

// 판정하기 — 결과 칸이 그 실행의 서비스로 버튼을 가른다. 주소의 `?run=` 은 띠와 다른 서비스 실행일 수 있다 (화면공통 §8)
export function RunList({ service, envs, 판정하기, kind }: { service: string; envs: EnvRow[]; 판정하기: 판정하기; kind: 'UI' | 'FN' }) {
  const t = use말();
  const [처음] = useState(주소조건);
  const [page, setPage] = useState(() => 번호(처음.get('page')) ?? 1);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');
  const [state, setState] = useState<RunQuery['state']>(() => 고른값(처음.get('state'), 상태들));
  const [env, setEnv] = useState(처음.get('env') ?? '');
  const [origin, setOrigin] = useState<RunQuery['origin']>(() => 고른값(처음.get('origin'), 방식들));
  const [days, setDays] = useState<number | undefined>(() => 기간들.find((일) => String(일) === 처음.get('days')));
  // 사람이 고른 실행. 없으면 결과 칸은 맨 위 줄을 보인다 — 좁은 창에서는 고르기 전까지 목록만 보인다
  const [고른, set고른] = useState(() => 번호(처음.get('run')));
  // 주소로 곧장 내려온 케이스(`&tc=`) — 처음 연 그 실행에서만 그 실패 카드를 펼친다
  const 처음실행 = 번호(처음.get('run'));
  const 열카드 = 처음.get('tc') ?? undefined;
  // 서비스를 바꾸면 건 조건 · 고른 실행을 버린다 — 남기면 다른 서비스에서 「없다」를 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
    setTyped('');
    setQ('');
    setState(undefined);
    setEnv('');
    setOrigin(undefined);
    setDays(undefined);
    set고른(null);
  }

  // 기본값인 조건은 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  use주소조건(`#/runs/${kind === 'UI' ? 'ui' : 'fn'}`, {
    ...(고른 === null ? {} : { run: String(고른) }),
    ...(q === '' ? {} : { q }),
    ...(state === undefined ? {} : { state }),
    ...(env === '' ? {} : { env }),
    ...(origin === undefined ? {} : { origin }),
    ...(days === undefined ? {} : { days: String(days) }),
    ...(page === 1 ? {} : { page: String(page) }),
  });

  const 조건: RunQuery = {
    kind,
    ...(q === '' ? {} : { q }),
    ...(state === undefined ? {} : { state }),
    ...(env === '' ? {} : { env }),
    ...(origin === undefined ? {} : { origin }),
    ...(days === undefined ? {} : { days }),
  };
  const runs = useAsync(() => api.runs(service, page, 조건), [service, page, q, state, env, origin, days]);
  // 목록은 한 번 받고 말아 결과 칸만 따라갔다 — 실행이 끝나도 카드가 「진행 중」에 멈췄다 (GAME-F2-17).
  // 도는 실행이 보이는 동안만 다시 받는다. 3초는 알림 줄이 도는 것을 묻는 주기와 같다
  const 도는것있나 = runs.data?.items.some((run) => 도는중(run.status)) === true;
  const 다시받기 = runs.reload;
  useEffect(() => {
    if (!도는것있나) return;
    const timer = setInterval(() => void 다시받기(), 3000);
    return () => clearInterval(timer);
  }, [도는것있나, 다시받기]);

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7 — §8.1 과 같은 함정이다)
  const 더있나 = 다음이있나(runs.data);
  const 건조건 = q !== '' || state !== undefined || env !== '' || origin !== undefined || days !== undefined;
  const 보는실행 = 고른 ?? runs.data.items[0]?.runId ?? null;
  // 거르개를 바꿔도 고른 실행은 그대로 둔다 — 대신 목록에 없는 까닭을 한 줄 적는다
  const 조건밖 = 고른 !== null && 건조건 && !runs.data.items.some((run) => run.runId === 고른);

  // 거르개를 바꾸면 첫 쪽으로 간다
  function 거르기(바꾸기: () => void) {
    바꾸기();
    setPage(1);
  }

  function 다지우기() {
    setTyped('');
    거르기(() => {
      setQ('');
      setState(undefined);
      setEnv('');
      setOrigin(undefined);
      setDays(undefined);
    });
  }

  return (
    <>
      <Head
        위치={t('실행 기록')}
        제목={kind === 'UI' ? t('UI 테스트') : t('기능 테스트')}
        부제={days === undefined ? t('모두 {건수}건', { 건수: runs.data.total }) : t('최근 {일}일 {건수}건', { 일: days, 건수: runs.data.total })}
      />

      <div className={고른 === null ? 'runs-split' : 'runs-split picked'}>
        <div className="screen list-screen runs-list">
          <form
            className="toolbar"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              거르기(() => setQ(typed));
            }}
          >
            <input
              type="text"
              aria-label={t('케이스 · 제목으로 찾기')}
              placeholder={t('케이스 번호 · 이름 · 실행 제목')}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button className="chip" type="submit">
              {t('찾기')}
            </button>
            <label className="run-filter">
              <span className="filter-label">{t('상태')}</span>
              <select value={state ?? ''} onChange={(e) => 거르기(() => setState(고른값(e.target.value, 상태들)))}>
                <option value="">{t('전체')}</option>
                <option value="failed">{t('실패 있음')}</option>
                <option value="running">{t('진행 중')}</option>
              </select>
            </label>
            <label className="run-filter">
              <span className="filter-label">{t('대상 서버')}</span>
              <select value={env} onChange={(e) => 거르기(() => setEnv(e.target.value))}>
                <option value="">{t('전체')}</option>
                {envs.map((it) => (
                  <option key={it.env} value={it.env}>
                    {it.env}
                  </option>
                ))}
              </select>
            </label>
            <label className="run-filter">
              <span className="filter-label">{t('시작 방식')}</span>
              <select value={origin ?? ''} onChange={(e) => 거르기(() => setOrigin(고른값(e.target.value, 방식들)))}>
                <option value="">{t('전체')}</option>
                <option value="manual">{t('직접 실행')}</option>
                <option value="rerun">{t('실패 다시 실행')}</option>
                <option value="scheduled">{t('정기 실행')}</option>
                <option value="build">{t('빌드 실행')}</option>
              </select>
            </label>
            <label className="run-filter">
              <span className="filter-label">{t('기간')}</span>
              <select value={days ?? ''} onChange={(e) => 거르기(() => setDays(기간들.find((일) => String(일) === e.target.value)))}>
                <option value="7">{t('최근 7일')}</option>
                <option value="14">{t('최근 14일')}</option>
                <option value="30">{t('최근 30일')}</option>
                <option value="">{t('전체')}</option>
              </select>
            </label>
          </form>

          {조건밖 ? <p className="runs-out">{t('고른 실행은 지금 조건 밖입니다')}</p> : null}

          <div className="rows-scroll">
            {runs.data.items.length === 0 ? (
              <div className="empty">
                {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다 (SPEC §8.7) */}
                {건조건 ? t('조건에 맞는 실행이 없습니다') : t('이 애플리케이션에서 아직 실행한 기록이 없습니다')}
                <small>{건조건 ? t('검색어나 거르개를 바꿔 보세요') : t('케이스를 골라 실행하면 여기에 쌓입니다')}</small>
                {건조건 ? (
                  <button className="btn" style={{ marginTop: '14px' }} onClick={다지우기}>
                    {t('조건 지우기')}
                  </button>
                ) : (
                  <a className="btn" style={{ marginTop: '14px' }} href={kind === 'UI' ? '#/cases/ui' : '#/cases/fn'}>
                    {t('케이스 목록으로')}
                  </a>
                )}
              </div>
            ) : (
              <>
                {/* 표머리는 좁은 화면에서도 감추지 않는다 — 휴대폰에서 여는 화면이다 (SPEC §8.7 「칸마다 이름을 단다」) */}
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
            <RunResult
              key={보는실행}
              runId={보는실행}
              판정하기={판정하기}
              열카드={보는실행 === 처음실행 ? 열카드 : undefined}
              칸안
              on새실행={(runId) => {
                set고른(runId);
                runs.reload();
              }}
            />
          </section>
        )}
      </div>
    </>
  );
}
