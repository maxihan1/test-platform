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
import { RunAbortModal } from './RunAbortModal.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 실패다시실행 } from './RerunFailed.js';
import { PAGE_SIZE, 끝난결과, 디바이스칩, 쪽넘김 } from './RunResultBody.js';
import { 결과줄 } from './RunResultRow.js';
import { ScenarioResult } from './ScenarioResult.js';
import { 끝났다고알릴까, 도는중, 멈출수있나, 본것으로적는다, 상태라벨, 실행자이름 } from './runState.js';
import { Failed, Loading, STATUS_LABEL, useAsync, when, 실행디바이스들 } from './ui.js';
import { 끝난미확정, 미확정글자 } from './unconfirmed.js';
import { useRunProgress } from './useRunProgress.js';

const STATUSES: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];

function 케이스결과({
  runId,
  판정하기,
  상자안 = false,
  on시나리오,
}: {
  on시나리오?: () => void;
  runId: number;
  판정하기: 판정하기;
  /**
   * 이 화면이 **상자 안에서** 그려지는가 (SPEC §8.7 「결과 보기는 상자로 연다」).
   *
   * 참이면 **진행·완료 상자를 열지 않는다.** 포커스를 가두는 장치가 둘 겹치면
   * 키보드만 쓰는 사람이 빠져나올 길을 잃는다 (DESIGN.md 「모달」).
   * 끝났다는 사실은 상자 안의 줄로 적는다.
   */
  상자안?: boolean;
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
  // 실행이 끝난 것을 영영 못 듣는다 — 맨 위 알림 줄도 `본것들` 을 보므로 그를 못 구한다 (SPEC §8.9)
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
    // 처음 받은 `data` 가 도는 중일 때만 연다. `useState(true)` 로 시작하면 그 값이 `data` 보다 먼저
    // 정해져 3일 전에 끝난 실행을 열어도 진행 상자가 선다. 한 번 연 실행에서는 다시 열지 않는다
    if (전 === null && 도는중(data.status)) set진행열림(true);
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

  const 진행목록 = useRunProgress(running, runId);

  const 증적칸 = use증적(data, 실행판정(판정하기, data), reload);

  // 끝났을 때 한 번만 부른다 — 요약 띠와 옆 칸이 나눠 쓴다. 아직 도는 중이면 판정이 안 들어간 항목이
  // `NA` 로 읽혀 앞 실행이 깨졌던 것이 전부 「고쳐짐」으로 보인다. 실패해도 결과는 그대로 선다 (도메인/실행 §8.3)
  const 끝났나 = data !== null && !running;
  const 견줌 = useAsync<비교 | null>(() => (끝났나 ? api.insights(runId) : Promise.resolve(null)), [runId, 끝났나]);

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null) return <Loading />;

  const groups = filterGroups(groupByCase(data.items), status, device);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const shownPage = Math.min(page, totalPages);
  const shown = groups.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const 디바이스들 = 실행디바이스들(data.items);
  const columns = device === 'ALL' ? 디바이스들 : [device];
  const { pass, fail, na } = data.counts;
  const 미확정 = 미확정글자(data.counts, 언어);
  const 끝난미확정수 = 끝난미확정(data.counts);
  const 결과목록 =
    shown.length === 0 ? (
      <div className="empty">{t('조건에 맞는 결과가 없습니다.')}</div>
    ) : (
      shown.map((group) => <결과줄 key={group.tcId} group={group} columns={columns} runId={data.runId} />)
    );
  // 모달은 닫으라고 만든 물건이고 실제로 곧장 닫힌다 (`useRunPick.ts` 가 상자 둘을 잇달아 띄운다).
  // 그때 「무엇이 도는가」가 통째로 사라지지 않게 머리에도 한 줄 둔다 — 모달은 이 줄의 확대판이다
  const 도는것 = running ? (진행상황(data, 진행목록).지금도는것들[0]?.항목 ?? null) : null;
  function choose<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  const 부제 = (
          <>
            {/* 실행 하나에 한 종류다 — 사이드바가 종류를 모르는 화면이라 머리에 적는다 (PR #132) */}
            {data.kind === 'UI' ? <>{t('UI 테스트')} · </> : data.kind === 'FN' ? <>{t('기능 테스트')} · </> : null}
            {when(data.startedAt, 언어)} · {data.title} · {t('실행자 {이름}', { 이름: 실행자이름(data, 언어) })}
            {' · '}
            {t('대상 서버 {서버}', { 서버: data.env })}
            {data.baseUrl === '' ? '' : ` (${data.baseUrl})`}
            {' · '}
            {running ? t('진행 중 {건수}건', { 건수: data.counts.running }) : 상태라벨(data.status, 언어)}
            {/* 「실행 중: X」라고 쓰지 않는다. 항목 둘이 동시에 돌아(EXECUTION_CONCURRENCY 기본 2)
                여기 뜨는 것은 도는 둘 중 하나다 — 단정하면 없는 확실함을 만든다 (runProgress.ts) */}
            {도는것 === null ? null : (
              <>
                {' · '}
                {t('진행 중 {케이스}', { 케이스: `${도는것.tcId} ${도는것.tcName}` })}
              </>
            )}
          </>
  );

  const 행동 = (
          <div className="tally">
          {/* 끝난 실행의 집계 숫자는 요약 띠가 맡는다 — 같은 숫자를 두 번 두지 않는다 (도메인/실행 §8.3).
              도는 동안에는 요약 띠가 없어 여기 남는다. 판정 숫자를 버튼보다 앞에 둔다 —
              좁은 화면에서 접히면 뒤엣것이 아랫줄로 밀리는데 휴대폰에서 이 화면이 하는 일은 「끝났나 보기」다 */}
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
              {/* 미확정은 확정 판정 칸 뒤에 묶음 글자로 붙는다. 없으면 안 쓴다 (도메인/실행 §8.3 · §3.2) */}
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
            {running || 상자안 ? null : <실패다시실행 items={data.items} env={data.env} 된다={실행판정(판정하기, data)('실행')} />}
          </div>
  );

  const 머리 = (
    <div className="box-head">
      <div className="head-meta">{부제}</div>
      {행동}
      {/* 증적 안내·사유·문서 목록을 **머리 줄 안에서** 한 줄로 그린다 (2026-09-22).
          블록으로 두면 130px 을 먹어 케이스 목록에 32px 밖에 안 남았다 */}
      <증적알림과목록 칸={증적칸} 한줄로 />
    </div>
  );

  return (
    <>
      {/* 제목과 주 행동은 본문 면 바깥에 선다 (SPEC §8).
          **상자 안에서는 머리를 만들지 않는다** — 상자 제목이 이미 RUN 번호를 적고 있어
          같은 말이 두 번 나온다. 부제와 행동은 그대로 살린다 */}
      {상자안 ? (running ? 머리 : null) : <Head 제목={`RUN ${String(data.runId)}`} 부제={부제} 행동={행동} />}

      {running ? (
        <div className={상자안 ? 'screen modal-results' : 'screen'}>
          {상자안 ? null : <증적알림과목록 칸={증적칸} />}

          {pass + fail + na + 끝난미확정수 === 0 ? null : (
            <div className="stripe">
              <i style={{ background: 'var(--pass)', flex: pass }} />
              <i style={{ background: 'var(--fail)', flex: fail }} />
              <i style={{ background: 'var(--na)', flex: na }} />
              {/* 판정 색이 아니다 — 확정 판정에 안 드는 묶음이다 (도메인/실행 §3.2) */}
              {끝난미확정수 === 0 ? null : <i className="u" style={{ background: 'var(--ink-faint)', flex: 끝난미확정수 }} />}
            </div>
          )}

          {/* 도는 동안에는 요약 띠도 카드도 없다 — 판정 칩이 거르개다 (도메인/실행 §8.3) */}
          <div className="toolbar">
            <span className="filter-label">{t('판정')}</span>
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
            <디바이스칩 디바이스들={디바이스들} device={device} on디바이스={choose(setDevice)} />
          </div>

          {/* 상자 안에서는 이 자리만 스크롤한다 — 위 필터·증적 버튼은 고정이다 (2026-09-22 ②) */}
          {상자안 ? <div className="rows-scroll">{결과목록}</div> : 결과목록}
        </div>
      ) : (
        <끝난결과
          data={data}
          insights={견줌.data}
          견줌오류={견줌.error}
          증적칸={증적칸}
          상자안={상자안}
          상자머리={머리}
          판정={status}
          on판정={choose(setStatus)}
          device={device}
          on디바이스={choose(setDevice)}
          page={page}
          on쪽={setPage}
        />
      )}

      {/* 상자는 하나, 여는 이유는 둘이다. 열어 둔 채 끝나면 그 한 상자가 내용만 바꾼다.
          **상자 안에서는 열지 않는다** — 가두개가 겹치면 빠져나올 길이 없다 (SPEC §8.7) */}
      {상자안 || (!진행열림 && !끝났다고알릴까말까) ? null : (
        <RunProgressModal
          data={data}
          진행목록={진행목록}
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
  if (시나리오 === props.runId) return <ScenarioResult runId={props.runId} 상자안={props.상자안} />;
  return <케이스결과 {...props} on시나리오={() => set시나리오(props.runId)} />;
}
