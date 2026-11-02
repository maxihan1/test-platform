// 성능 테스트 › 기기 성능 › 실행 중 — 시나리오 진행 · 기기 타일 · 실행 로그. 5초마다 새 숫자만 받는다 (도메인/성능 §8.14 「기기 성능」 · 시안 Dev-Live)
// 목표를 벗어난 기기는 타일에 「목표 미달」 글자를 달고 테두리를 실패 색으로 한다 — 색만으로 알리지 않는다

import { useEffect, useRef, useState } from 'react';

import { Head, use지금앱 } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 기기성능이름 } from './kind.js';
import { Modal } from './Modal.js';
import { perfApi, type 실행로그, type 실행상세 } from './perfApi.js';
import type { 기기숫자 } from './perfDeviceApi.js';
import { 값글자, 기기설정of, 메모리글자, 벗어난지표, 조작글, 지금요약, 지표표, 최근줄 } from './perfDeviceView.js';
import { 가장큰값, 갱신간격, 눈금최대, 분초, 선점, 시각글, 시분 } from './perfRunView.js';
import { message } from './ui.js';

/** 마지막 초에서 이만큼 앞부터 다시 받는다 — 팜이 숫자를 5초마다 묶어 보내 같은 초가 뒤늦게 온다 */
const 겹침초 = 10;

const 글 = (값: number | null | undefined, 꼴: (n: number) => string): string => (값 === null || 값 === undefined ? '-' : 꼴(값));
/** 타일의 작은 FPS 선이 보는 구간(초) */
const 선구간 = 120;

export function PerfDeviceLive({ run, 다시읽기, 쓰나 }: { run: 실행상세; 다시읽기: () => Promise<boolean>; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const 기기성능 = 기기성능이름(use지금앱()?.kind);
  const 설정 = 기기설정of(run);
  const [숫자, set숫자] = useState<기기숫자[]>([]);
  const [로그, set로그] = useState<실행로그[]>([]);
  const [오류, set오류] = useState<string | null>(null);
  const [멈출까, set멈출까] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const [멈춤오류, set멈춤오류] = useState<string | null>(null);
  const 마지막 = useRef(-1);
  const 바쁨 = useRef(false);

  useEffect(() => {
    let 살음 = true;
    async function 한번() {
      if (바쁨.current) return;
      바쁨.current = true;
      try {
        const 부터 = Math.max(0, 마지막.current - 겹침초);
        const [r, e] = await Promise.all([perfApi.deviceResult(run.id, 부터), perfApi.events(run.id)]);
        if (!살음) return;
        // 받은 구간은 통째로 갈아 끼운다 — 이어 붙이면 늦게 온 초가 두 번 들어간다
        if (r.metrics.length > 0) {
          마지막.current = 가장큰값(r.metrics.map((줄) => 줄.sec), 마지막.current);
          set숫자((앞) => [...앞.filter((줄) => 줄.sec < 부터), ...r.metrics]);
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
      void 다시읽기();
    } finally {
      set멈추는중(false);
    }
  }

  const 지난초 = 숫자.reduce((큰, 줄) => Math.max(큰, 줄.sec), 0);
  const 직접 = 설정.drive === 'MANUAL';
  const 지금회차 = 숫자.reduce((큰, 줄) => Math.max(큰, 줄.loop ?? 0), 0);
  const 지금구간 = 숫자.filter((줄) => 줄.sec === 지난초).find((줄) => 줄.segment !== null)?.segment ?? null;
  // 직접 플레이는 시간으로, Appium · 게임 케이스는 끝낸 회차로 센다 — 도는 회차는 아직 안 끝났다
  const 진행 = 직접 ? Math.min(100, (지난초 / Math.max(1, 설정.durationSec)) * 100) : Math.min(100, (Math.max(0, 지금회차 - 1) / Math.max(1, 설정.repeat)) * 100);
  const 상태글 = run.status === 'QUEUED' ? t('대기') : t('실행 중');

  return (
    <>
      <Head
        위치={t('성능 테스트')}
        제목={`${t(기기성능)} ${run.code}`}
        부제={[조작글(설정, t), 직접 ? t('{수}분', { 수: Math.round(설정.durationSec / 60) }) : t('반복 {수}회', { 수: 설정.repeat }), t('기기 {수}대', { 수: 설정.devices.length }), run.env, run.startedAt === null ? t('아직 시작 전') : t('{시각} 시작', { 시각: 시각글(run.startedAt, 언어) })].join(' · ')}
        행동={
          <div className="perf-row">
            <span>
              <span className="perf-pulse" aria-hidden="true" /> {상태글}
              {run.status === 'RUNNING' ? <span className="mono"> {직접 ? `${분초(지난초)} / ${분초(설정.durationSec)}` : 분초(지난초)}</span> : null}
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
        <section className="perf-panel" aria-labelledby="pd-p">
          <div className="perf-row">
            <h2 id="pd-p">{t('시나리오 진행')}</h2>
            <span className="perf-faint">
              {직접 ? t('지난 시간 {시간}', { 시간: 분초(지난초) }) : 지금회차 === 0 ? t('기기를 잡고 기록기를 켜는 중입니다') : [t('{수}회차', { 수: 지금회차 }), 지금구간].filter(Boolean).join(' · ')}
            </span>
          </div>
          <div className="pd-prog" role="progressbar" aria-label={t('전체 진행')} aria-valuenow={Math.round(진행)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${String(진행)}%` }} />
          </div>
        </section>

        <div className="pd-tiles">
          {설정.devices.map((d) => {
            const 줄들 = 숫자.filter((줄) => 줄.serial === d.serial);
            const 최근 = 최근줄(줄들, d.serial);
            // 1% Low FPS 는 숫자가 적으면 최저 FPS 와 같아 앱이 뜨는 첫 몇 초에 미달로 보인다 — 실행 중에는 빼고 끝에 판정한다
            const 벗어남 = 벗어난지표(설정.targets.filter((x) => x.metric !== 'LOW1_FPS'), 지금요약(줄들), d.launchMs);
            const 나쁨 = 벗어남.size > 0;
            const 선 = 줄들.filter((줄) => 줄.sec > 지난초 - 선구간).flatMap((줄) => (줄.fps === null ? [] : [{ x: 줄.sec - Math.max(0, 지난초 - 선구간), y: 줄.fps }]));
            const 값 = (글: string, 칸: string, 빨강: boolean) => (
              <div className="pd-kv">
                <span className="perf-faint">{t(글)}</span>
                <span className={빨강 ? 'mono perf-err' : 'mono'}>{칸}</span>
              </div>
            );
            return (
              <section key={d.serial} className={나쁨 ? 'pd-tile bad' : 'pd-tile'} aria-label={d.model}>
                <div className="pd-kv">
                  <b>{d.model}</b>
                  <span className="perf-tag">{d.where === 'FARM' ? t('Device VISION') : t('내 컴퓨터')}</span>
                </div>
                <div>
                  <span className={벗어남.has('AVG_FPS') || 벗어남.has('LOW1_FPS') ? 'perf-big perf-err' : 'perf-big'}>{글(최근?.fps, (n) => String(Math.round(n)))}</span> <span className="perf-faint">FPS</span>
                </div>
                {나쁨 ? <span className="perf-err">{t('목표 미달')} · {[...벗어남].map((m) => t(지표표[m].이름)).join(', ')}</span> : null}
                <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="pd-spark" aria-hidden="true">
                  <polyline points={선점(선, 선구간, 눈금최대(60, ...선.map((p) => p.y)), 200, 40)} className={나쁨 ? 'bad' : undefined} vectorEffect="non-scaling-stroke" />
                </svg>
                {값('기기 온도', 글(최근?.tempC, (n) => t('{수}도', { 수: n })), 벗어남.has('MAX_TEMP'))}
                {값('CPU', 글(최근?.cpu, (n) => `${String(Math.round(n))}%`), false)}
                {값('메모리', 메모리글자(최근?.memMb ?? null), 벗어남.has('MAX_MEM'))}
                {값('배터리', 글(최근?.batteryPct, (n) => `${String(n)}%`), false)}
                {값('앱 실행 시간', 값글자('LAUNCH_MS', d.launchMs, t), 벗어남.has('LAUNCH_MS'))}
              </section>
            );
          })}
        </div>

        <section className="perf-panel" aria-labelledby="pd-l">
          <h2 id="pd-l">{t('실행 로그')}</h2>
          {로그.length === 0 ? <span className="perf-faint">{t('아직 기록이 없습니다')}</span> : null}
          <ul className="perf-log">
            {로그.slice(-20).map((줄, i) => (
              <li key={`${String(i)}${줄.at}`}>
                <span className="mono perf-faint">{시분(줄.at)}</span>
                <span className={/error|warn/i.test(줄.level) ? 'perf-err' : undefined}>{줄.message}</span>
              </li>
            ))}
          </ul>
        </section>
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
