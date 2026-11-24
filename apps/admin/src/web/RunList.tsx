// 실행 기록 — 목록 화면. 줄을 누르면 결과 화면(`#/runs/<번호>`)으로 넘어간다 (도메인/실행 §8.7 「목록 화면과 결과 화면을 따로」 · §7 GET /api/runs)
//
// **거르는 일은 서버가 한다.** 목록이 쪽으로 나뉘어 오므로 받은 쪽만 거르면 뒤쪽이 조용히 빠진다.
// **거르개와 쪽은 주소에 남긴다** — 결과 화면에 갔다 돌아오기 · 새로고침 · 뒤로 가기에 풀리지 않는다(점검 2.9).

import { useEffect, useState, type ReactNode } from 'react';

import { api, type EnvRow, type RunListRow, type RunQuery } from './api.js';
import { Head } from './Head.js';
import { use말 } from './i18n.js';
import { use주소조건, 주소덮기, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import { 옛실행주소 } from './route.js';
import { 실행표머리, 실행표줄 } from './RunListTable.js';
import { 도는중 } from './runState.js';
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

interface Props {
  service: string;
  envs: EnvRow[];
  kind: 'UI' | 'FN';
}

/** 실행을 고른 옛 주소(`?run=`)로 왔으면 그 실행의 결과 화면으로 옮긴다 — 붙여 둔 고리가 썩으면 안 된다. E2E 실행 기록도 같이 쓴다 */
export function 옛주소옮김({ children }: { children: ReactNode }) {
  const [옮길] = useState(() => 옛실행주소(주소조건()));
  useEffect(() => {
    if (옮길 !== null) 주소덮기(옮길);
  }, [옮길]);
  return 옮길 !== null ? null : <>{children}</>;
}

export function RunList(props: Props) {
  return (
    <옛주소옮김>
      <실행목록 {...props} />
    </옛주소옮김>
  );
}

function 실행목록({ service, envs, kind }: Props) {
  const t = use말();
  const [처음] = useState(주소조건);
  const [page, setPage] = useState(() => 번호(처음.get('page')) ?? 1);
  const [typed, setTyped] = useState(처음.get('q') ?? '');
  const [q, setQ] = useState(처음.get('q') ?? '');
  const [state, setState] = useState<RunQuery['state']>(() => 고른값(처음.get('state'), 상태들));
  const [env, setEnv] = useState(처음.get('env') ?? '');
  const [origin, setOrigin] = useState<RunQuery['origin']>(() => 고른값(처음.get('origin'), 방식들));
  const [days, setDays] = useState<number | undefined>(() => 기간들.find((일) => String(일) === 처음.get('days')));
  // 서비스를 바꾸면 건 조건을 버린다 — 남기면 다른 서비스에서 「없다」를 보여주고 왜인지 말하지 않는다
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
  }

  const 조건: RunQuery = {
    kind,
    ...(q === '' ? {} : { q }),
    ...(state === undefined ? {} : { state }),
    ...(env === '' ? {} : { env }),
    ...(origin === undefined ? {} : { origin }),
    ...(days === undefined ? {} : { days }),
  };
  const runs = useAsync(() => api.runs(service, page, 조건), [service, page, q, state, env, origin, days]);
  // 목록은 한 번 받고 말아 실행이 끝나도 줄이 「진행 중」에 멈췄다 (GAME-F2-17).
  // 도는 실행이 보이는 동안 3초마다(알림 줄과 같은 주기) 다시 받아 **보이는 줄의 숫자 · 상태만** 덮는다 — 목록을 통째로 바꾸면 보던 줄이 밀린다.
  // 덮은 것은 그때 받은 목록(바탕)에만 붙인다 — 거르개 · 쪽을 바꿔 목록을 새로 받으면 버린다. 다시 받기가 실패해도 마지막 것을 둔다
  const [덮개, set덮개] = useState<{ 바탕: unknown; 줄: ReadonlyMap<number, RunListRow> } | null>(null);
  const 줄들 = (runs.data?.items ?? []).map((run) => (덮개?.바탕 === runs.data ? 덮개.줄.get(run.runId) : undefined) ?? run);
  const 도는것있나 = 줄들.some((run) => 도는중(run.status));
  useEffect(() => {
    if (!도는것있나) return;
    const 바탕 = runs.data;
    let 끝 = false;
    const timer = setInterval(() => {
      api.runs(service, page, 조건).then(
        (답) => {
          if (!끝) set덮개({ 바탕, 줄: new Map(답.items.map((run) => [run.runId, run])) });
        },
        () => undefined,
      );
    }, 3000);
    return () => {
      끝 = true;
      clearInterval(timer);
    };
  }, [도는것있나, runs.data]);

  // 기본값인 조건은 적지 않는다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const 걸린조건: Record<string, string> = {
    ...(q === '' ? {} : { q }),
    ...(state === undefined ? {} : { state }),
    ...(env === '' ? {} : { env }),
    ...(origin === undefined ? {} : { origin }),
    ...(days === undefined ? {} : { days: String(days) }),
    ...(page === 1 ? {} : { page: String(page) }),
  };
  // 애플리케이션을 늘 단다 — 받은 링크를 다른 애플리케이션을 고른 채 열어도 같은 목록이 선다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)
  use주소조건(`#/runs/${kind === 'UI' ? 'ui' : 'fn'}`, { ...걸린조건, ...(service === '' ? {} : { service }) });

  if (runs.error !== null) return <Failed error={runs.error} />;
  if (runs.data === null) return <Loading />;

  // 총건수로 페이지 수를 계산하지 않는다 (SPEC §8.7 — §8.1 과 같은 함정이다)
  const 더있나 = 다음이있나(runs.data);
  const 건조건 = q !== '' || state !== undefined || env !== '' || origin !== undefined || days !== undefined;
  // 결과 화면이 이 조건으로 「← 실행 기록」 · 「이전 · 다음 실행」을 잡는다
  const 목록조건 = new URLSearchParams(걸린조건).toString();

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
            aria-label={t('케이스 · 제목으로 검색')}
            placeholder={t('케이스 번호 · 이름 · 실행 제목')}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="chip" type="submit">
            {t('검색')}
          </button>
          <label className="run-filter">
            <span className="filter-label">{t('상태')}</span>
            <select value={state ?? ''} onChange={(e) => 거르기(() => setState(고른값(e.target.value, 상태들)))}>
              <option value="">{t('전체')}</option>
              <option value="failed">{t('Fail 있음')}</option>
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
              <option value="rerun">{t('Fail 다시 실행')}</option>
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

        <div className="rows-scroll">
          {줄들.length === 0 ? (
            <div className="empty">
              {/* 서비스를 바꿔 들어온 사람과 검색한 사람에게 같은 문장을 쓰면 한쪽에게는 거짓이다 (SPEC §8.7) */}
              {건조건 ? t('조건에 맞는 실행이 없습니다') : t('이 애플리케이션에서 아직 실행한 기록이 없습니다')}
              <small>{건조건 ? t('검색어나 필터를 변경해 보세요') : t('케이스를 선택해 실행하면 여기에 쌓입니다')}</small>
              {건조건 ? (
                <button className="btn" style={{ marginTop: '14px' }} onClick={다지우기}>
                  {t('조건 초기화')}
                </button>
              ) : (
                <a className="btn" style={{ marginTop: '14px' }} href={kind === 'UI' ? '#/cases/ui' : '#/cases/fn'}>
                  {t('케이스 목록으로')}
                </a>
              )}
            </div>
          ) : (
            <>
              {/* 칸 이름 줄 — 휴대폰에서는 줄이 세 줄로 쌓여 숨기고 판정 수 앞에 이름을 붙인다 (SPEC §8.7 「칸마다 이름을 단다」) */}
              <실행표머리 />
              {줄들.map((run) => (
                <실행표줄 key={run.runId} run={run} 목록조건={목록조건} />
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
