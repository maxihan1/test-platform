// 성능 테스트 › 실행 중 — 숫자 넷 · 추이 · 서버 모니터링 · 트랜잭션별 현황 · 실행 로그. 5초마다 새 숫자만 받는다 (도메인/성능 §8.14)
// 「페이지 로딩(부하 중)」 칸은 서버가 아직 받지 않아(PERF-F1-07) 두지 않는다

import { useEffect, useRef, useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { PerfChart } from './PerfChart.js';
import { perfApi, type Target, type 실행로그, type 실행상세, type 초숫자, type 호스트숫자 } from './perfApi.js';
import { RunHead } from './PerfRunHead.js';
import { 가장큰값, 갱신간격, 목표글자, 목표대상, 분초, 수, 시분, 초글자, 최근집계, 퍼센트글자, 전체줄, 트랜잭션줄 } from './perfRunView.js';
import { message } from './ui.js';

/** 이 값을 넘으면 막대를 실패 색으로 칠한다 — 병목 후보를 눈에 띄게 */
const 뜨거움 = 85;
/** 트랜잭션별 현황이 보는 구간(초) */
const 최근초 = 10;
/** 마지막 초에서 이만큼 앞부터 다시 받는다 — 에이전트마다 보고가 늦게 와서 같은 초의 숫자가 뒤늦게 커진다 */
const 겹침초 = 10;

const 목표찾기 = (목표들: Target[], metric: Target['metric'], scope: string | null) => 목표들.find((x) => x.metric === metric && 목표대상(x) === scope);

export function PerfRunLive({ run, 다시읽기, 쓰나 }: { run: 실행상세; 다시읽기: () => Promise<boolean>; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [초, set초] = useState<초숫자[]>([]);
  const [호스트, set호스트] = useState<호스트숫자[]>([]);
  const [로그, set로그] = useState<실행로그[]>([]);
  const [오류, set오류] = useState<string | null>(null);
  const [멈출까, set멈출까] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const [멈춤오류, set멈춤오류] = useState<string | null>(null);
  const 마지막 = useRef({ 초: -1, 호스트: -1 });
  const 바쁨 = useRef(false);

  useEffect(() => {
    let 살음 = true;
    async function 한번() {
      if (바쁨.current) return;
      바쁨.current = true;
      try {
        const 초부터 = Math.max(0, 마지막.current.초 - 겹침초);
        const 호스트부터 = Math.max(0, 마지막.current.호스트 - 겹침초);
        const [s, h, e] = await Promise.all([perfApi.series(run.id, 초부터), perfApi.hosts(run.id, 호스트부터), perfApi.events(run.id)]);
        if (!살음) return;
        // 받은 구간은 통째로 갈아 끼운다 — 이미 받은 초도 숫자가 커져 올 수 있어 이어 붙이면 늦게 온 몫이 빠진다
        if (s.series.length > 0) {
          마지막.current.초 = Math.max(마지막.current.초, 가장큰값(s.series.map((줄) => 줄.sec), -1));
          set초((앞) => [...앞.filter((줄) => 줄.sec < 초부터), ...s.series]);
        }
        if (h.hosts.length > 0) {
          마지막.current.호스트 = Math.max(마지막.current.호스트, 가장큰값(h.hosts.map((줄) => 줄.sec), -1));
          set호스트((앞) => [...앞.filter((줄) => 줄.sec < 호스트부터), ...h.hosts]);
        }
        set로그(e.events);
        set오류(null);
        await 다시읽기();
      } catch (err) {
        if (살음) set오류(message(err, 언어));
      } finally {
        바쁨.current = false;
      }
    }
    void 한번();
    const 타이머 = setInterval(() => void 한번(), 갱신간격.ms);
    return () => {
      살음 = false;
      clearInterval(타이머);
    };
  }, [run.id]);

  async function 멈추기() {
    set멈추는중(true);
    set멈춤오류(null);
    try {
      await perfApi.stop(run.id);
      set멈출까(false);
      await 다시읽기();
    } catch (err) {
      set멈춤오류(message(err, 언어));
      // 이미 끝난 실행이면(409) 결과 화면으로 바뀌게 다시 읽는다
      void 다시읽기();
    } finally {
      set멈추는중(false);
    }
  }

  const 목표들 = run.config.targets;
  const 전체 = 전체줄(초);
  const 최근 = 최근집계(전체);
  const 지난초 = 전체.at(-1)?.sec ?? 0;
  const 상태글 = run.status === 'QUEUED' ? t('대기') : run.status === 'SMOKE' ? t('스모크 테스트') : t('실행 중');
  const p95목표 = 목표찾기(목표들, 'P95', null);
  const tps목표 = 목표찾기(목표들, 'TPS', null);
  const 에러목표 = 목표찾기(목표들, 'ERROR_RATE', null);
  const 목표줄 = (목표: Target | undefined, 뒤 = '') => (목표 === undefined ? <span /> : <span className="perf-faint">{t('목표 {값}', { 값: 목표글자(목표, t) })}{뒤}</span>);

  const 위 = Math.max(1000, Math.ceil((가장큰값(전체.map((줄) => 줄.p95Ms), p95목표?.value ?? 0) * 1.1) / 1000) * 1000);
  const 최대사용자 = 가장큰값(전체.map((줄) => 줄.vus), Math.max(1, run.config.maxVus));
  const 간격 = Math.max(1, Math.ceil(전체.length / 300));
  const 뽑기 = (값: (줄: 초숫자) => number) => 전체.filter((_, i) => i % 간격 === 0).map((줄) => ({ x: 줄.sec, y: 값(줄) }));

  return (
    <>
      <RunHead
        run={run}
        행동={
          <div className="perf-row">
            <span>
              <span className="perf-pulse" aria-hidden="true" /> {상태글}
              {run.status === 'RUNNING' ? <span className="mono"> {분초(지난초)} / {분초(run.config.durationSec)}</span> : null}
            </span>
            {쓰나 ? (
              <button type="button" className="btn ghost perf-stop" onClick={() => set멈출까(true)}>
                {t('실행 중단')}
              </button>
            ) : null}
          </div>
        }
      />
      <div className="screen perf-run">
        {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
        <div className="perf-stats">
          <div className="perf-stat">
            <span className="perf-faint">{t('가상 사용자')}</span>
            <span className="perf-big">{최근 === null ? '-' : 수(최근.vus)}<small>{t('명')}</small></span>
            <span className="perf-faint">{t('최대 {수}명', { 수: 수(run.config.maxVus) })}</span>
          </div>
          <div className="perf-stat">
            <span className="perf-faint">TPS</span>
            <span className="perf-big">{최근 === null ? '-' : 수(최근.tps)}</span>
            {목표줄(tps목표)}
          </div>
          <div className="perf-stat">
            <span className="perf-faint">{t('95% 응답시간')}</span>
            <span className="perf-big">{최근 === null ? '-' : Number((최근.p95Ms / 1000).toFixed(1))}<small>{t('초')}</small></span>
            {목표줄(p95목표)}
          </div>
          <div className="perf-stat">
            <span className="perf-faint">{t('에러율')}</span>
            <span className="perf-big">{최근 === null ? '-' : Number(최근.errorRate.toFixed(1))}<small>%</small></span>
            {목표줄(에러목표, run.config.testType === 'STRESS' ? t(', 초과 시 자동 중단') : '')}
          </div>
        </div>

        <div className="perf-cols">
          <section className="perf-panel perf-wide" aria-labelledby="perf-g">
            <h2 id="perf-g">{t('응답시간과 가상 사용자 추이')}</h2>
            <PerfChart
              라벨={t('가상 사용자와 95% 응답시간 추이 그래프')}
              최대X={Math.max(run.config.durationSec, 지난초)}
              왼쪽눈금={[초글자(위, t), 초글자(위 / 2, t), t('{수}초', { 수: 0 })]}
              선들={[
                { 이름: t('95% 응답시간'), 색: 'var(--ink)', 점들: 뽑기((줄) => 줄.p95Ms), 최대Y: 위, 굵게: true },
                { 이름: t('가상 사용자'), 색: 'var(--chart-2)', 점들: 뽑기((줄) => 줄.vus), 최대Y: 최대사용자 },
              ]}
              목표={p95목표 === undefined ? undefined : { 이름: t('목표 {값}', { 값: 초글자(p95목표.value, t) }), 값: p95목표.value, 최대Y: 위 }}
            />
          </section>

          <section className="perf-panel" aria-labelledby="perf-m">
            <h2 id="perf-m">{t('서버 모니터링')}</h2>
            {run.config.monitorIds.length === 0 ? (
              <span className="perf-faint">{t('서버 모니터링 에이전트를 고르지 않았습니다')}</span>
            ) : (
              <호스트막대들 호스트={호스트} 번호들={run.config.monitorIds} />
            )}
            <h3 className="perf-sub">{t('부하 발생 에이전트')}</h3>
            <호스트막대들 호스트={호스트} 번호들={run.config.agentIds} cpu만 />
          </section>

          <section className="perf-panel perf-wide" aria-labelledby="perf-t">
            <h2 id="perf-t">{t('트랜잭션별 현황')}</h2>
            <트랜잭션현황 줄들={초} 끝={지난초} 목표들={목표들} />
          </section>

          <section className="perf-panel" aria-labelledby="perf-l">
            <h2 id="perf-l">{t('실행 로그')}</h2>
            {로그.length === 0 ? <span className="perf-faint">{t('아직 기록이 없습니다')}</span> : null}
            <ul className="perf-log">
              {로그.slice(-20).map((줄) => (
                <li key={`${줄.at}${줄.message}`}>
                  <span className="mono perf-faint">{시분(줄.at)}</span>
                  <span className={/error|warn/i.test(줄.level) ? 'perf-err' : undefined}>{줄.message}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {!멈출까 ? null : (
        <Modal
          제목={t('실행을 중단할까요?')}
          onClose={() => set멈출까(false)}
          버튼={
            <>
              <button type="button" className="btn ghost" onClick={() => set멈출까(false)}>
                {t('취소')}
              </button>
              <button type="button" className="btn" disabled={멈추는중} onClick={() => void 멈추기()}>
                {t('실행 중단')}
              </button>
            </>
          }
        >
          <p>{t('지금까지 모인 숫자는 남고 성능 목표 판정은 내지 않습니다')}</p>
          {멈춤오류 === null ? null : <p className="perf-err">{멈춤오류}</p>}
        </Modal>
      )}
    </>
  );
}

/** 에이전트마다 가장 최근 줄의 CPU · 메모리 막대 */
function 호스트막대들({ 호스트, 번호들, cpu만 = false }: { 호스트: 호스트숫자[]; 번호들: number[]; cpu만?: boolean }) {
  const t = use말();
  const 최근 = new Map<number, 호스트숫자>();
  for (const 줄 of 호스트) if (번호들.includes(줄.agentId) && (최근.get(줄.agentId)?.sec ?? -1) <= 줄.sec) 최근.set(줄.agentId, 줄);
  if (최근.size === 0) return <span className="perf-faint">{t('아직 받은 숫자가 없습니다')}</span>;
  const 막대 = (이름: string, 값: number) => (
    <div className="perf-mrow" key={이름}>
      <div className="perf-mtop">
        <span>{이름}</span>
        <span className={값 >= 뜨거움 ? 'mono perf-err' : 'mono'}>{Math.round(값)}%</span>
      </div>
      <div className="perf-bar">
        <span className={값 >= 뜨거움 ? 'hot' : undefined} style={{ width: `${String(Math.min(100, Math.max(0, 값)))}%` }} />
      </div>
    </div>
  );
  return (
    <>
      {[...최근.values()].flatMap((줄) => [막대(`${줄.agentName} CPU`, 줄.cpu), ...(cpu만 ? [] : [막대(`${줄.agentName} ${t('메모리')}`, 줄.mem)])])}
    </>
  );
}

function 트랜잭션현황({ 줄들, 끝, 목표들 }: { 줄들: 초숫자[]; 끝: number; 목표들: Target[] }) {
  const t = use말();
  const 모음 = 트랜잭션줄(줄들);
  if (모음.size === 0) return <span className="perf-faint">{t('아직 받은 숫자가 없습니다')}</span>;
  return (
    <div className="perf-table-box">
      <table className="perf-table">
        <thead>
          <tr>
            <th>{t('트랜잭션')}</th>
            <th className="r">TPS</th>
            <th className="r">{t('95% 응답시간')}</th>
            <th className="r">{t('에러율')}</th>
            <th>{t('목표')}</th>
          </tr>
        </thead>
        <tbody>
          {[...모음.entries()].map(([이름, 전부]) => {
            const 최근 = 전부.filter((줄) => 줄.sec > 끝 - 최근초);
            const 요청 = 최근.reduce((n, 줄) => n + 줄.requests, 0);
            const 에러 = 최근.reduce((n, 줄) => n + 줄.errors, 0);
            const p95 = 요청 === 0 ? null : 최근.reduce((n, 줄) => n + 줄.p95Ms * 줄.requests, 0) / 요청;
            const 목표 = 목표찾기(목표들, 'P95', 이름);
            const 넘음 = 목표 !== undefined && p95 !== null && p95 > 목표.value;
            return (
              <tr key={이름}>
                <td>{이름}</td>
                <td className="r mono">{수(요청 / Math.min(최근초, Math.max(1, 끝)))}</td>
                <td className={넘음 ? 'r mono perf-err' : 'r mono'}>{초글자(p95, t)}</td>
                <td className="r mono">{퍼센트글자(요청 === 0 ? null : (에러 / 요청) * 100)}</td>
                <td className={넘음 ? 'mono perf-err' : 'mono perf-faint'}>
                  {목표 === undefined ? '-' : 넘음 ? t('{값} (초과)', { 값: 목표글자(목표, t) }) : 목표글자(목표, t)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
