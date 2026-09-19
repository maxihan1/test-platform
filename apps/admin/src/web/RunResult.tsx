// 실행 결과 목록 (SPEC §8.3). 케이스 1건 = 1행이고 디바이스별 판정을 판정 칸에 나란히 묶는다
// POST /api/runs는 끝나기 전에 돌아온다. status가 FINISHED가 될 때까지 화면이 다시 묻는다 (SPEC §7.1)

import { useEffect, useRef, useState } from 'react';

import { api, type ItemStatus, type Platform, type RunItemSummary } from './api.js';
import { filterGroups, groupByCase, 회차요약 } from './group.js';
import { 받는법, 증적버튼 } from './evidence.js';
import { 한줄로 } from './mask.js';
import { Modal } from './Modal.js';
import type { 등급 } from './role.js';
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
  const [만드는중, set만드는중] = useState(false);
  const [증적오류, set증적오류] = useState<string | null>(null);
  // 갱신 전 상태를 들고 있어야 「도는 중이던 것이 끝났다」를 알 수 있다
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

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null) return <Loading />;

  const groups = filterGroups(groupByCase(data.items), status, device);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const shownPage = Math.min(page, totalPages);
  const shown = groups.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const columns = device === 'ALL' ? PLATFORMS : [device];
  const { pass, fail, na } = data.counts;
  const 실패목록 = data.items.filter((item) => item.status === 'FAIL');
  const 증적 = 증적버튼(data.status, data.evidence, role);
  // 만든 것은 최근 것이 위로. 파일 이름에 (1)·(2)가 붙으면 어느 것이 최신인지 알 수 없다 (SPEC §8.4)
  const 만든것 = data.evidence
    .filter((it) => it.status === 'READY')
    .slice()
    .reverse();

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
          {/* 되돌릴 수 없으므로 누르면 한 번 더 묻는다 (SPEC §8.3) */}
          {!멈출수있나(data.status, role) ? null : (
            <button className="btn ghost" onClick={() => set멈출까(true)} disabled={멈추는중}>
              실행 멈추기
            </button>
          )}
          {증적 === null ? null : (
            <button
              className="btn ghost"
              disabled={!증적.누를수있나 || 만드는중}
              title={증적.사유 ?? undefined}
              onClick={() => {
                set만드는중(true);
                set증적오류(null);
                void api
                  .makeEvidence(data.runId, 'PDF')
                  .then(() => reload())
                  .catch((err: unknown) => set증적오류(message(err)))
                  .finally(() => set만드는중(false));
              }}
            >
              {만드는중 ? '만드는 중입니다' : 증적.글}
            </button>
          )}
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

      {증적?.사유 === undefined || 증적?.사유 === null ? null : (
        <div className="scan">
          <span className="scan-error">만들지 못했습니다 — {증적.사유}</span>
        </div>
      )}
      {증적오류 === null ? null : (
        <div className="scan">
          <span className="scan-error">{증적오류}</span>
        </div>
      )}

      {만든것.length === 0 ? null : (
        <div className="sec">
          <div className="sec-h">증적 문서</div>
          {/* 받기 전에 볼 수 있어야 한다. 화면의 항목 상세는 항목 한 건이고
              증적은 실행 전체 한 부다 (SPEC §8.4) */}
          {만든것.map((it) => {
            const 법 = 받는법(it.format);
            return (
              <div className="pre" key={it.id}>
                {when(it.generatedAt)} 만듦 · {it.format}
                <a
                  className="btn small"
                  style={{ marginLeft: '10px' }}
                  href={api.evidenceUrl(it.id)}
                  {...(법.새창 ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {법.글}
                </a>
              </div>
            );
          })}
        </div>
      )}

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

      {!끝났다고알릴까말까 ? null : (
        <Modal
          제목={`RUN ${String(data.runId)} 이 ${data.status === 'ABORTED' ? '멈췄습니다' : '끝났습니다'}`}
          onClose={() => {
            // 한 번 닫으면 그 실행에 대해 다시 뜨지 않는다. 새로고침해도 마찬가지다 (SPEC §8.9)
            본것으로적는다(data.runId);
            set알릴까(false);
          }}
          버튼={
            <>
              {/* 증적 문서 만들기는 실행까지 등급부터다 (SPEC §3.5). 보기만에게는 결과 보기 하나다 */}
              <button
                className="btn"
                onClick={() => {
                  본것으로적는다(data.runId);
                  set알릴까(false);
                }}
              >
                결과 보기
              </button>
            </>
          }
        >
          <p>
            {data.title} · 대상 서버 {data.env}
          </p>
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
          {실패목록.length === 0 ? null : (
            <div>
              {/* 숫자만 보여주면 사람이 결국 목록을 뒤져야 한다 (SPEC §8.9) */}
              <div className="sec-h">실패한 케이스</div>
              {실패목록.slice(0, 5).map((item) => (
                <div className="pre" key={item.historyId}>
                  {item.tcId} {item.tcName}
                </div>
              ))}
              {실패목록.length > 5 ? <p className="hint">외 {실패목록.length - 5}건</p> : null}
            </div>
          )}
        </Modal>
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
                {멈추는중 ? '멈추는 중' : '멈춥니다'}
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
