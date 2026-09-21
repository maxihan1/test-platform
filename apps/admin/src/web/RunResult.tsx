// 실행 결과 목록 (SPEC §8.3). 케이스 1건 = 1행이고 디바이스별 판정을 판정 칸에 나란히 묶는다
// POST /api/runs는 끝나기 전에 돌아온다. status가 FINISHED가 될 때까지 화면이 다시 묻는다 (SPEC §7.1)

import { useEffect, useRef, useState } from 'react';

import { api, type ItemStatus, type Platform, type RunItemSummary } from './api.js';
import { filterGroups, groupByCase, 회차요약 } from './group.js';
import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { 한줄로 } from './mask.js';
import { Modal } from './Modal.js';
import type { 등급 } from './role.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 끝났다고알릴까, 도는중, 멈출수있나, 본것으로적는다, 상태라벨, 실행자이름, 칸사유 } from './runState.js';
import { Failed, Loading, message, PLATFORM_LABEL, PLATFORMS, seconds, STATUS_COLOR, STATUS_LABEL, useAsync, Verdict, when } from './ui.js';

const PAGE_SIZE = 20;
const STATUSES: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const DEVICES: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];

// 행의 거터 색. 디바이스 하나라도 깨졌으면 실패로 보여야 한다.
// 회차가 여럿인 칸은 요약 판정을 쓴다 — 목록에 보이는 글자와 색이 같은 값을 봐야 한다
function worst(칸들: RunItemSummary[][]): ItemStatus {
  const 판정 = 칸들.map((칸) => 회차요약(칸).status);
  if (판정.includes('FAIL')) return 'FAIL';
  if (판정.length > 0 && 판정.every((s) => s === 'PASS')) return 'PASS';
  return 'NA';
}

export function RunResult({ runId, role }: { runId: number; role: 등급 }) {
  const [status, setStatus] = useState<ItemStatus | 'ALL'>('ALL');
  const [device, setDevice] = useState<Platform | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [멈출까, set멈출까] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const [멈춤오류, set멈춤오류] = useState<string | null>(null);
  const [끝났다고알릴까말까, set알릴까] = useState(false);
  // 「진행 상자를 닫았다」와 「완료를 알았다」는 다른 말이다. 하나로 합치면 도는 중에 상자를 닫은 사람이
  // 실행이 끝난 것을 영영 못 듣는다 — 맨 위 알림 줄도 `본것들` 을 보므로 그를 못 구한다 (SPEC §8.9)
  const [진행열림, set진행열림] = useState(false);
  // 갱신 전 상태를 들고 있어야 「도는 중이던 것이 끝났다」를 알 수 있다.
  // 화면에 안 나오는 값이라 `useRef` 로 둔다 — 그리는 값이면 `useState` 여야 한다 (2026-09-21 사고)
  const 앞선상태 = useRef<string | null>(null);

  const run = useAsync(() => api.run(runId), [runId]);
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

  const 증적칸 = use증적(data, role, reload);

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null) return <Loading />;

  const groups = filterGroups(groupByCase(data.items), status, device);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const shownPage = Math.min(page, totalPages);
  const shown = groups.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const columns = device === 'ALL' ? PLATFORMS : [device];
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
            {when(data.startedAt)} · {data.title} · 실행자 {실행자이름(data)}
            {' · 대상 서버 '}
            {data.env}
            {data.baseUrl === '' ? '' : ` (${data.baseUrl})`}
            {running ? ` · 도는 중 ${data.counts.running}건` : ` · ${상태라벨(data.status)}`}
          </div>
        </div>
        <div className="tally">
          {/* 판정 숫자를 버튼보다 앞에 둔다. 좁은 화면에서 접히면 뒤엣것이 아랫줄로 밀리는데,
              휴대폰에서 이 화면이 하는 일은 「끝났나 보기」다 (docs/DESIGN.md · design-mockup.html) */}
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
          {/* 되돌릴 수 없으므로 누르면 한 번 더 묻는다 (SPEC §8.3) */}
          {!멈출수있나(data.status, role) ? null : (
            <button className="btn ghost" onClick={() => set멈출까(true)} disabled={멈추는중}>
              실행 중단
            </button>
          )}
          <증적만들기버튼들 칸={증적칸} />
        </div>
      </div>

      <증적알림과목록 칸={증적칸} />

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
        <span className="filter-label">디바이스</span>
        {DEVICES.map((value) => (
          <button className="chip" key={value} aria-pressed={device === value} onClick={() => choose(setDevice)(value)}>
            {value === 'ALL' ? '전체' : PLATFORM_LABEL[value]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">조건에 맞는 결과가 없습니다.</div>
      ) : (
        shown.map((group) => {
          const 칸들 = columns
            .map((platform) => group.byPlatform[platform])
            .filter((칸): 칸 is RunItemSummary[] => 칸 !== undefined && 칸.length > 0);
          const 첫항목 = 칸들[0]?.[0];
          const 입력줄 = 첫항목 === undefined ? '' : 한줄로(첫항목.params, 첫항목.paramSchema);
          // 사유 없이 미실행으로 두면 러너 고장과 구분되지 않는다 (SPEC §8.3)
          const 사유 = 칸사유(칸들.flat());

          return (
            <div className="row" key={group.tcId}>
              <div className="gutter" style={{ background: STATUS_COLOR[worst(칸들)] }} />
              <div className="tcid">{group.tcId}</div>
              <div className="title">
                {group.tcName}
                {/* 상세로 들어가야만 보이면 「어떤 값에서 깨졌는가」를 줄 사이에서 비교할 수 없다 (SPEC §8.3).
                    입력이 없는 케이스는 줄 자체를 안 만든다 */}
                {입력줄 === '' ? null : <small>{입력줄}</small>}
                {사유 === null ? null : <small className="why">{사유}</small>}
              </div>
              <div className="right">
                <div className="devices">
                  {columns.map((platform) => {
                    const 칸 = group.byPlatform[platform];
                    return (
                      <div className="device" key={platform}>
                        <span className="device-name">{PLATFORM_LABEL[platform]}</span>
                        {/* 그 디바이스를 지원하지 않는 케이스는 칸을 —로 비운다 (SPEC §8.3) */}
                        {칸 === undefined || 칸.length === 0 ? (
                          <span className="device-none">—</span>
                        ) : (
                          <Verdicts 칸={칸} runId={data.runId} />
                        )}
                      </div>
                    );
                  })}
                </div>
                {첫항목 === undefined ? null : (
                  <a className="btn small" href={`#/runs/${data.runId}/items/${첫항목.historyId}`}>
                    상세
                  </a>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* 상자는 하나, 여는 이유는 둘이다. 열어 둔 채 끝나면 그 한 상자가 내용만 바꾼다 */}
      {!진행열림 && !끝났다고알릴까말까 ? null : (
        <RunProgressModal
          data={data}
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
        <Modal
          제목={`RUN ${String(data.runId)} 을 멈출까요?`}
          onClose={() => set멈출까(false)}
          버튼={
            <>
              <button className="btn ghost" onClick={() => set멈출까(false)}>
                아니오
              </button>
              <button
                className="btn"
                disabled={멈추는중}
                onClick={() => {
                  set멈추는중(true);
                  set멈춤오류(null);
                  void api
                    .abortRun(data.runId)
                    .then(() => {
                      set멈출까(false);
                      reload();
                    })
                    .catch((err: unknown) => set멈춤오류(message(err)))
                    .finally(() => set멈추는중(false));
                }}
              >
                {멈추는중 ? '중단하는 중' : '중단'}
              </button>
            </>
          }
        >
          <p>
            아직 시작하지 않은 항목은 대기줄에서 빼고, 이미 돌고 있는 항목은 끊습니다.
            <br />
            되돌릴 수 없습니다.
          </p>
          {멈춤오류 === null ? null : <p className="err">{멈춤오류}</p>}
        </Modal>
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

/**
 * 한 디바이스 칸의 판정.
 *
 * 1회면 판정 배지, 반복이면 `3/5 통과` 요약이다. **행 구조는 바뀌지 않는다** (SPEC §8.3).
 * 어느 회차가 깨졌는지는 상세에서 본다 — 목록은 회차를 펼치지 않는다.
 */
function Verdicts({ 칸, runId }: { 칸: RunItemSummary[]; runId: number }) {
  // 아직 안 끝난 것이 하나라도 있으면 도는 중이다. 실행이 끝나야 판정이 들어간다 (SPEC §3.2)
  if (칸.some((item) => item.finishedAt === null)) {
    return <span className="device-none">도는 중</span>;
  }

  const 요약 = 회차요약(칸);
  const 처음 = 칸[0]!;

  return (
    <>
      <a href={`#/runs/${runId}/items/${처음.historyId}`}>
        {요약.글 === null ? (
          <Verdict status={요약.status} />
        ) : (
          <span className={`verdict ${요약.status === 'PASS' ? 'v-pass' : 요약.status === 'FAIL' ? 'v-fail' : 'v-na'}`}>
            {요약.글}
          </span>
        )}
      </a>
      <span className="device-dur">
        {seconds(요약.평균소요ms)}
        {요약.회차수 > 1 ? ' 평균' : ''}
      </span>
    </>
  );
}
