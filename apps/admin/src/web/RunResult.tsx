// 실행 결과 목록 (SPEC §8.3). 케이스 1건 = 1행이고 디바이스별 판정을 판정 칸에 나란히 묶는다
// POST /api/runs는 끝나기 전에 돌아온다. status가 FINISHED가 될 때까지 화면이 다시 묻는다 (SPEC §7.1)

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type ItemStatus, type Platform, type RunInsights as 비교 } from './api.js';
import { filterGroups, groupByCase } from './group.js';
import { Head } from './Head.js';
import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { use말, use언어 } from './i18n.js';
import { 실행판정, type 판정하기 } from './runJudge.js';
import { 진행상황 } from './runProgress.js';
import { 시간글자, 실행남은글 } from './remainText.js';
import { RunAbortModal } from './RunAbortModal.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 실패다시실행 } from './RerunFailed.js';
import { PAGE_SIZE, 끝난결과, 디바이스칩, 실패먼저, 쪽넘김 } from './RunResultBody.js';
import { 결과줄 } from './RunResultRow.js';
import { 다른빌드알림, 시작빌드글 } from './RunBuild.js';
import { ScenarioResult } from './ScenarioResult.js';
import { 끝났다고알릴까, 도는중, 멈출수있나, 본것으로적는다, 상태라벨, 실행자이름 } from './runState.js';
import { Failed, Loading, PLATFORM_LABEL, STATUS_LABEL, useAsync, when, 실행디바이스들 } from './ui.js';
import { 그중미확정글 } from './unconfirmed.js';
import { useRunProgress } from './useRunProgress.js';
import { use보는실행알림 } from './viewedRun.js';

const STATUSES: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];

function 케이스결과({
  runId,
  판정하기,
  칸안 = false,
  on새실행,
  on시나리오,
  열카드,
}: {
  on시나리오?: () => void;
  /** 이 케이스의 실패 카드를 펼친 채 연다 — 대시보드 · 항목 상세에서 곧장 내려온 주소(`&tc=`) */
  열카드?: string;
  runId: number;
  판정하기: 판정하기;
  /**
   * 이 화면이 **실행 기록의 오른쪽 결과 칸에서** 그려지는가 (도메인/실행 §8.7 「A안」).
   * 참이면 머리를 칸 머리로 그리고 머리 아래 한 칸만 스크롤한다
   */
  칸안?: boolean;
  /** 결과 칸에서 건 「실패 다시」 — 주소를 옮기지 않고 목록이 새 실행을 고른다 */
  on새실행?: (runId: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const [status, setStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [device, setDevice] = useState<Platform | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [멈출까, set멈출까] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const [끝났다고알릴까말까, set알릴까] = useState(false);
  // 「진행 상자를 닫았다」와 「완료를 알았다」는 다른 말이다. 하나로 합치면 도는 중에 상자를 닫은 사람이
  // 실행이 끝난 것을 영영 못 듣는다 — 맨 위 알림 줄도 `본것들` 을 보므로 그를 못 구한다 (SPEC §8.9).
  // 진행 상자는 머리의 진행 글을 누를 때만 연다 (2026-10-19 ⑫ — 앞 판은 도는 실행을 열 때마다 저절로 떠 화면을 가렸다)
  const [진행열림, set진행열림] = useState(false);
  // 갱신 전 상태를 들고 있어야 「도는 중이던 것이 끝났다」를 알 수 있다.
  // 화면에 안 나오는 값이라 `useRef` 로 둔다 — 그리는 값이면 `useState` 여야 한다 (2026-09-21 사고)
  const 앞선상태 = useRef<string | null>(null);

  const run = useAsync(() => api.run(runId).catch((e: unknown) => { if (e instanceof ApiError && e.code === 'SCENARIO_RUN') on시나리오?.(); throw e; }), [runId]);
  const data = run.data;
  // ABORTED 를 빠뜨리면 사람이 멈춘 실행에서 2초마다 영원히 다시 묻는다 (SPEC §8.3)
  const running = data !== null && 도는중(data.status);

  // 다른 실행으로 옮기면 앞선 상태를 잊는다. 안 그러면 도는 중이던 RUN 을 보다가
  // 이미 끝난 RUN 으로 옮겼을 때 「도는 중 → 끝남」으로 읽혀 모달이 잘못 뜬다
  useEffect(() => {
    앞선상태.current = null;
    set알릴까(false);
    set진행열림(false);
  }, [runId]);

  // 그 실행 결과 화면을 보고 있는 사람에게만 모달이 뜬다 (SPEC §8.9).
  // 다른 화면에 있는 사람은 §8 알림 줄이 받는다
  useEffect(() => {
    if (data === null) return;
    const 전 = 앞선상태.current;
    앞선상태.current = data.status;
    if (전 !== null && 끝났다고알릴까({ 전, 후: data.status, runId: data.runId })) set알릴까(true);
  }, [data?.status, data?.runId]);
  const reload = run.reload;

  // 증적 문서도 뒤에서 만들어진다. PENDING 행이 남아 있으면 계속 물어야
  // 「만드는 중입니다」가 완성으로 바뀐다 — 안 그러면 버튼이 그 자리에 굳는다
  const 만드는문서있나 = data !== null && data.evidence.some((it) => it.status === 'PENDING');

  // 실행은 뒤에서 이어진다. 끝날 때까지만 다시 묻고 끝나면 멈춘다
  useEffect(() => {
    if (!running && !만드는문서있나) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [running, 만드는문서있나, reload]);

  const { 진행목록, 남은ms } = useRunProgress(running, runId);

  const 증적칸 = use증적(data, 실행판정(판정하기, data), reload);

  // 끝났을 때 한 번만 부른다 — 요약 띠와 옆 칸이 나눠 쓴다. 아직 도는 중이면 판정이 안 들어간 항목이
  // `NA` 로 읽혀 앞 실행이 깨졌던 것이 전부 「고쳐짐」으로 보인다. 실패해도 결과는 그대로 선다 (도메인/실행 §8.3)
  const 끝났나 = data !== null && !running;
  const 견줌 = useAsync<비교 | null>(() => (끝났나 ? api.insights(runId) : Promise.resolve(null)), [runId, 끝났나]);

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null) return <Loading />;

  const groups = 실패먼저(filterGroups(groupByCase(data.items), status, device));
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const shownPage = Math.min(page, totalPages);
  const shown = groups.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const 디바이스들 = 실행디바이스들(data.items);
  const columns = device === 'ALL' ? 디바이스들 : [device];
  const { pass, fail, na } = data.counts;
  const 미확정 = 그중미확정글(data.counts, 언어);
  const 결과목록 =
    shown.length === 0 ? (
      <div className="empty">{t('조건에 맞는 결과가 없습니다')}</div>
    ) : (
      shown.map((group) => <결과줄 key={group.tcId} group={group} columns={columns} runId={data.runId} />)
    );
  // 몇 건 끝났고 얼마 남았나는 머리에 늘 둔다 — 누르면 진행 상자가 무엇이 도는지까지 편다 (도메인/실행 §8.9 · 점검 2.14).
  // 앞 판은 이 수가 저절로 뜨는 상자에만 있었고 머리에는 「진행 중 98건」(안 끝난 전부)이 있었다
  const 진행 = running ? 진행상황(data, 진행목록) : null;
  const 진행글 =
    진행 === null
      ? null
      : [t('{끝난} / {전체} 완료', { 끝난: 진행.끝난수, 전체: 진행.전체수 }), 실행남은글(남은ms, Date.now(), 언어)].join(' · ');
  const 종류 = data.kind === 'UI' ? t('UI 테스트') : data.kind === 'FN' ? t('기능 테스트') : null;
  const 소요 =
    data.finishedAt === null
      ? null
      : 시간글자(Math.max(0, new Date(data.finishedAt).getTime() - new Date(data.startedAt).getTime()), 언어);
  function choose<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  // 실행 정보는 이 한 줄이 전부다 — 앞 판은 같은 값을 옆 칸에 또 적었고 좁은 창에서 그 칸이 맨 아래로 묻혔다 (도메인/실행 §8.3 · 점검 2.2)
  const 부제 = (
          <>
            {칸안 ? null : <>RUN {data.runId} · </>}
            {/* 실행 하나에 한 종류다 — 사이드바가 종류를 모르는 화면이라 머리에 적는다 (PR #132) */}
            {종류 === null ? null : <>{종류} · </>}
            {/* 알림은 서비스 전체에서 오고 결과는 고른 서비스와 상관없이 열린다 — 어느 서비스 실행인지 적는다 */}
            {data.serviceName} · 
            {when(data.startedAt, 언어)}
            {시작빌드글(data, t)}
            {' · '}
            {t('대상 서버 {서버}', { 서버: data.env })}
            {data.baseUrl === '' ? '' : ` (${data.baseUrl})`}
            {' · '}
            {t('실행자 {이름}', { 이름: 실행자이름(data, 언어) })}
            {소요 === null ? null : <> · {소요}</>}
            {디바이스들.length === 0 ? null : <> · {디바이스들.map((p) => PLATFORM_LABEL[p]).join(' · ')}</>}
            {/* 도는 동안의 상태는 바로 아래 진행 글이 맡는다 — 「진행 중」을 또 적지 않는다 */}
            {running ? null : <> · {상태라벨(data.status, 언어)}</>}
          </>
  );

  const 행동 = (
          <div className="tally">
          {/* 끝난 실행의 집계 숫자는 요약 띠가 맡는다 — 같은 숫자를 두 번 두지 않는다 (도메인/실행 §8.3).
              도는 동안에는 요약 띠가 없어 여기 남는다. 판정 숫자를 버튼보다 앞에 둔다 —
              좁은 화면에서 접히면 뒤엣것이 아랫줄로 밀리는데 휴대폰에서 먼저 볼 것은 끝났나다(공통/5 §8 「휴대폰 화면」) */}
          {진행글 === null ? null : (
            <button type="button" className="btn ghost run-progress" aria-haspopup="dialog" onClick={() => set진행열림(true)}>
              {진행글}
            </button>
          )}
          {!running ? null : (
            <>
              <div>
                <b style={{ color: 'var(--pass-text)' }}>{pass}</b>
                <span>{t('통과')}</span>
              </div>
              <div>
                <b style={{ color: 'var(--fail-text)' }}>{fail}</b>
                <span>{t('실패')}</span>
              </div>
              <div>
                <b style={{ color: 'var(--na-text)' }}>{na}</b>
                <span>{t('미실행')}</span>
              </div>
              {/* 미확정은 위 숫자에 이미 센 항목이다 — 「그중 N건」 글자만 뒤에 붙는다. 없으면 안 쓴다 (도메인/실행 §8.3 · §3.2) */}
              {미확정 === '' ? null : (
                <div>
                  <span>{미확정}</span>
                </div>
              )}
            </>
          )}
          {/* 되돌릴 수 없으므로 누르면 한 번 더 묻는다 (SPEC §8.3) */}
          {!멈출수있나(data.status, 실행판정(판정하기, data)) ? null : (
            <button className="btn ghost" onClick={() => set멈출까(true)} disabled={멈추는중}>
              {t('실행 중단')}
            </button>
          )}
            <증적만들기버튼들 칸={증적칸} />
            {running ? null : (
              <실패다시실행 runId={data.runId} items={data.items} env={data.env} 시작={data.startedAt} 된다={실행판정(판정하기, data)('실행')} on걸었다={on새실행} />
            )}
          </div>
  );

  // 증적 안내·사유·문서 목록을 **머리 줄 안에서** 한 줄로 그린다 (2026-09-22).
  // 블록으로 두면 130px 을 먹어 케이스 목록에 32px 밖에 안 남았다. 2026-10-19 ⑫ 에 옆 칸을 걷어 화면 전체도 여기다
  const 증적줄 = <증적알림과목록 칸={증적칸} 한줄로 />;
  // 실행이 쓴 판과 그 서버의 문서가 다르면 한 줄로 알린다 — 판단은 사람 몫이라 경고색을 쓰지 않는다 (도메인/API §3.8 「API 문서와 판」)
  const 문서줄 =
    data.apiDocNote === 'DIFFERS' ? (
      <div className="hint">{t('이 서버의 API 문서가 기준 서버 문서(버전 {버전})와 다릅니다. 배포 전일 수 있습니다', { 버전: data.apiDocVersion ?? '' })}</div>
    ) : data.apiDocNote === 'FETCH_FAILED' ? (
      <div className="hint">{t('API 문서를 받지 못했습니다')}</div>
    ) : null;
  const 빌드줄 = <다른빌드알림 buildNo={data.buildNo} apps={data.installedApps} />;

  // 결과 칸의 머리 — 고른 줄과 같은 제목을 크게 단다. 스크롤 칸 밖에 둬 「실패 N건 다시 실행」 · 증적이 늘 보인다 (도메인/실행 §8.3)
  const 머리 = (
    <div className="box-head">
      <h2 className="pane-title">
        {data.title} <span className="pane-run">RUN {data.runId}</span>
      </h2>
      <div className="head-meta">{부제}</div>
      {행동}
      {증적줄}
      {문서줄}
      {빌드줄}
    </div>
  );

  return (
    <>
      {/* 제목과 주 행동은 본문 면 바깥에 선다 (SPEC §8). 결과 칸에서는 칸 머리가 그 자리다.
          큰 제목은 실행 제목이고 번호는 부제 맨 앞에 작게 둔다 (점검 2.22) */}
      {칸안 ? (
        머리
      ) : (
        <Head
          제목={data.title}
          부제={
            <>
              {부제}
              {증적줄}
              {문서줄}
              {빌드줄}
            </>
          }
          행동={행동}
        />
      )}

      {running ? (
        <div className={칸안 ? 'screen pane-results' : 'screen'}>
          {/* 남은 것도 칸을 받는다 — 끝난 것만으로 띠를 채우면 12/40 인데 띠가 다 찬 것으로 읽힌다 (점검 2.14) */}
          {data.counts.total === 0 ? null : (
            <div className="stripe">
              <i style={{ background: 'var(--pass)', flex: pass }} />
              <i style={{ background: 'var(--fail)', flex: fail }} />
              <i style={{ background: 'var(--na)', flex: na }} />
              <i style={{ background: 'var(--chart-track)', flex: data.counts.running }} />
            </div>
          )}

          {/* 도는 동안에는 요약 띠도 카드도 없다 — 판정 칩이 거르개다 (도메인/실행 §8.3) */}
          <div className="toolbar">
            <span className="filter-label">{t('판정')}</span>
            <div className="chip-group" role="group" aria-label={t('판정')}>
              {STATUSES.map((value) => (
                <button
                  className="chip"
                  key={value}
                  aria-pressed={status === value}
                  onClick={() => choose(setStatus)(value)}
                >
                  {value === 'ALL' ? t('전체') : STATUS_LABEL[value]}
                </button>
              ))}
            </div>
            <디바이스칩 디바이스들={디바이스들} device={device} on디바이스={choose(setDevice)} />
          </div>

          {/* 깨진 줄은 위로 올라와 있다. 카드는 끝나야 생기니 이유는 줄을 펼쳐 본다 (점검 2.21) */}
          {fail === 0 ? null : <p className="hint">{t('도는 중에는 실패 카드가 없습니다 — 깨진 줄을 펼치면 이유를 볼 수 있습니다')}</p>}

          {/* 결과 칸에서는 이 자리만 스크롤한다 — 위 필터·증적 버튼은 고정이다 (2026-09-22 ②) */}
          {칸안 ? <div className="rows-scroll">{결과목록}</div> : 결과목록}
        </div>
      ) : (
        <끝난결과
          data={data}
          insights={견줌.data}
          판정하기={판정하기}
          견줌오류={견줌.error}
          칸안={칸안}
          판정={status}
          on판정={choose(setStatus)}
          device={device}
          on디바이스={choose(setDevice)}
          page={page}
          on쪽={setPage}
          열카드={열카드}
        />
      )}

      {/* 상자는 하나, 여는 이유는 둘이다 — 머리의 진행 글을 눌렀거나, 보고 있던 실행이 끝났다.
          열어 둔 채 끝나면 그 한 상자가 내용만 바꾼다 (도메인/실행 §8.9) */}
      {!진행열림 && !끝났다고알릴까말까 ? null : (
        <RunProgressModal
          data={data}
          진행목록={진행목록}
          남은ms={남은ms}
          onClose={() => {
            set진행열림(false);
            // 끝난 뒤에 닫은 것만 「알림 봤다」로 적는다 — 새로고침해도 다시 안 뜬다 (SPEC §8.9).
            // 도는 중에 닫은 것은 아직 안 본 것이라 끝나면 완료 상자를 새로 받아야 한다
            if (!도는중(data.status)) {
              본것으로적는다(data.runId);
              set알릴까(false);
            }
          }}
        />
      )}

      {!멈출까 ? null : (
        <RunAbortModal
          runId={data.runId}
          멈추는중={멈추는중}
          on멈추는중={set멈추는중}
          onClose={() => set멈출까(false)}
          on멈춤={() => {
            set멈출까(false);
            reload();
          }}
        />
      )}

      {running ? <쪽넘김 쪽={shownPage} 전체쪽={totalPages} on쪽={setPage} /> : null}
    </>
  );
}

export function RunResult(props: Parameters<typeof 케이스결과>[0]) {
  const [시나리오, set시나리오] = useState<number | null>(null); // 시나리오 실행 번호는 404 SCENARIO_RUN 으로 알려 준다 — 갈래를 바깥에 둬 훅 순서를 지킨다
  // 머리가 진행을 적으니 알림 줄은 이 실행의 도는 줄을 뺀다 (공통/5-화면공통 §8 「알림」)
  use보는실행알림(props.runId);
  if (시나리오 === props.runId) return <ScenarioResult runId={props.runId} 판정하기={props.판정하기} 칸안={props.칸안} on새실행={props.on새실행} />;
  return <케이스결과 {...props} on시나리오={() => set시나리오(props.runId)} />;
}
