// 실행 결과 목록 (SPEC §8.3). 케이스 1건 = 1행이고 디바이스별 판정을 판정 칸에 나란히 묶는다
// POST /api/runs는 끝나기 전에 돌아온다. status가 FINISHED가 될 때까지 화면이 다시 묻는다 (SPEC §7.1)

import { useEffect, useRef, useState } from 'react';

import { api, type ItemStatus, type Platform, type 항목진행 } from './api.js';
import { filterGroups, groupByCase } from './group.js';
import { Head } from './Head.js';
import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import type { 등급 } from './role.js';
import { 진행상황 } from './runProgress.js';
import { RunInsights } from './RunInsights.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 결과줄 } from './RunResultRow.js';
import { 끝났다고알릴까, 도는중, 멈출수있나, 본것으로적는다, 상태라벨, 실행자이름 } from './runState.js';
import { Failed, Loading, message, PLATFORM_LABEL, PLATFORMS, STATUS_LABEL, useAsync, when } from './ui.js';

const PAGE_SIZE = 20;
const STATUSES: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const DEVICES: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];

export function RunResult({ runId, role }: { runId: number; role: 등급 }) {
  const t = use말();
  const 언어 = use언어();
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
  // 그리는 값이라 `useState` 다. `useRef` 로 들면 값은 맞는데 화면이 다시 안 그려진다
  // — 2026-09-21 에 이 화면 바로 옆에서 난 사고다 (아래 `앞선상태` 는 안 그리는 값이라 ref 가 맞다)
  const [진행목록, set진행목록] = useState<항목진행[]>([]);
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

  // 러너의 「지금」은 DB 에 없다. 상세 조회와 별개의 통로라 같은 2초 주기로 따로 묻는다 (SPEC §7).
  // **도는 중일 때만 부른다** — 끝난 실행을 열 때마다 러너를 깨울 이유가 없다
  useEffect(() => {
    if (!running) return;
    const 묻는다 = () => {
      void api
        .progress(runId)
        .then((답) => set진행목록(답.items))
        // 진행은 곁들이다. 러너에 못 닿아도 결과 화면은 그대로 서 있어야 해서 절차를 지우고
        // 이름까지만 아는 상태로 물러선다 — `진행상황()` 이 빈 목록을 그 뜻으로 받는다
        .catch(() => set진행목록([]));
    };
    묻는다();
    const timer = setInterval(묻는다, 2000);
    return () => clearInterval(timer);
  }, [running, runId]);

  const 증적칸 = use증적(data, role, reload);

  if (run.error !== null) return <Failed error={run.error} />;
  if (data === null) return <Loading />;

  const groups = filterGroups(groupByCase(data.items), status, device);
  const totalPages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const shownPage = Math.min(page, totalPages);
  const shown = groups.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE);
  const columns = device === 'ALL' ? PLATFORMS : [device];
  const { pass, fail, na } = data.counts;
  // 모달은 닫으라고 만든 물건이고 실제로 곧장 닫힌다 (`useRunPick.ts` 가 상자 둘을 잇달아 띄운다).
  // 그때 「무엇이 도는가」가 통째로 사라지지 않게 머리에도 한 줄 둔다 — 모달은 이 줄의 확대판이다
  const 도는것 = running ? (진행상황(data, 진행목록).지금도는것들[0]?.항목 ?? null) : null;
  function choose<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <>
      {/* 제목과 주 행동은 본문 면 바깥에 선다 (SPEC §8) */}
      <Head
        제목={`RUN ${String(data.runId)}`}
        부제={
          <>
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
        }
        행동={
          <div className="tally">
          {/* 판정 숫자를 버튼보다 앞에 둔다. 좁은 화면에서 접히면 뒤엣것이 아랫줄로 밀리는데,
              휴대폰에서 이 화면이 하는 일은 「끝났나 보기」다 (docs/DESIGN.md · design-mockup.html) */}
          <div>
            <b style={{ color: 'var(--pass)' }}>{pass}</b>
            <span>{t('통과')}</span>
          </div>
          <div>
            <b style={{ color: 'var(--fail)' }}>{fail}</b>
            <span>{t('실패')}</span>
          </div>
          <div>
            <b style={{ color: 'var(--na)' }}>{na}</b>
            <span>{t('미실행')}</span>
          </div>
          {/* 되돌릴 수 없으므로 누르면 한 번 더 묻는다 (SPEC §8.3) */}
          {!멈출수있나(data.status, role) ? null : (
            <button className="btn ghost" onClick={() => set멈출까(true)} disabled={멈추는중}>
              {t('실행 중단')}
            </button>
          )}
            <증적만들기버튼들 칸={증적칸} />
          </div>
        }
      />

      <div className="screen">
      <증적알림과목록 칸={증적칸} />

      {pass + fail + na === 0 ? null : (
        <div className="stripe">
          <i style={{ background: 'var(--pass)', flex: pass }} />
          <i style={{ background: 'var(--fail)', flex: fail }} />
          <i style={{ background: 'var(--na)', flex: na }} />
        </div>
      )}

      <RunInsights runId={data.runId} status={data.status} items={data.items} />

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
        <span className="filter-label">{t('디바이스')}</span>
        {DEVICES.map((value) => (
          <button className="chip" key={value} aria-pressed={device === value} onClick={() => choose(setDevice)(value)}>
            {value === 'ALL' ? t('전체') : PLATFORM_LABEL[value]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty">{t('조건에 맞는 결과가 없습니다.')}</div>
      ) : (
        shown.map((group) => (
          <결과줄 key={group.tcId} group={group} columns={columns} runId={data.runId} />
        ))
      )}
      </div>

      {/* 상자는 하나, 여는 이유는 둘이다. 열어 둔 채 끝나면 그 한 상자가 내용만 바꾼다 */}
      {!진행열림 && !끝났다고알릴까말까 ? null : (
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
        <Modal
          제목={t('RUN {번호} 을 멈출까요?', { 번호: data.runId })}
          onClose={() => set멈출까(false)}
          버튼={
            <>
              <button className="btn ghost" onClick={() => set멈출까(false)}>
                {t('아니오')}
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
                    .catch((err: unknown) => set멈춤오류(message(err, 언어)))
                    .finally(() => set멈추는중(false));
                }}
              >
                {멈추는중 ? t('중단하는 중') : t('중단§버튼')}
              </button>
            </>
          }
        >
          <p>
            {t('아직 시작하지 않은 항목은 대기줄에서 빼고, 이미 돌고 있는 항목은 끊습니다.')}
            <br />
            {t('되돌릴 수 없습니다.')}
          </p>
          {멈춤오류 === null ? null : <p className="err">{멈춤오류}</p>}
        </Modal>
      )}

      {totalPages <= 1 ? null : (
        <div className="pager">
          <button onClick={() => setPage(shownPage - 1)} disabled={shownPage <= 1}>
            {t('이전')}
          </button>
          <span>
            {shownPage} / {totalPages}
          </span>
          <button onClick={() => setPage(shownPage + 1)} disabled={shownPage >= totalPages}>
            {t('다음')}
          </button>
        </div>
      )}
    </>
  );
}
