// 성능 테스트 › 기기 성능 › 새 측정 — 조작 방식 · 케이스와 반복 · 빌드 · 측정 기기 · 성능 목표 · 측정 항목 · 「측정 시작」 (도메인/성능 §8.14 · 시안 Dev-Start)
// 앞 측정이 있으면 그 조건을 채워 연다. 게임 애플리케이션은 Appium 케이스 자리에 게임 케이스가 선다 — 게임 화면은 Appium 이 버튼을 못 찾는다

import { useEffect, useRef, useState } from 'react';

import type { CaseRow, ServiceRow } from './api.js';
import { 오류묶음, 오류속성, 칸오류, use첫오류 } from './FieldError.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 기기성능이름 } from './kind.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { 떠나기로했다, 떠나기상자, 버리기전 } from './leaveGuard.js';
import { perfApi } from './perfApi.js';
import type { 고를기기, 기기목표, 기기설정, 조작, 측정지표 } from './perfDeviceApi.js';
import { 자동포함, 폰케이스들 } from './perfDeviceCases.js';
import { PerfDeviceMetrics } from './PerfDeviceMetrics.js';
import { PerfDevicePick, 기기키 } from './PerfDevicePick.js';
import { PerfDeviceTargets } from './PerfDeviceTargets.js';
import { 기본목표, 실행열기, 케이스조작, 측정항목 } from './perfDeviceView.js';
import { 기기시작확인 } from './PerfStartConfirm.js';
import { message } from './ui.js';

/** 서버와 같은 꼴 — 점으로 이은 앱 이름(`com.demo.market`) */
const 앱이름 = /^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/;
const 케이스상한 = 20;

/** 「측정 시작」을 막는 칸 */
type 시작칸 = 'env' | 'package' | 'cases' | 'devices' | 'metrics';

export function PerfDeviceStart({
  service,
  앞,
  앞env,
  쓰나,
  취소,
}: {
  service: ServiceRow;
  /** 가장 최근 측정의 조건 — 없으면 시안의 기본값으로 연다 */
  앞: 기기설정 | null;
  앞env: string | null;
  쓰나: boolean;
  /** 앞 측정이 있을 때만 결과로 돌아간다 */
  취소: (() => void) | null;
}) {
  const t = use말();
  const 언어 = use언어();
  const 게임 = service.kind === 'GAME';
  const [조작, set조작] = useState<조작>(앞?.drive === 'MANUAL' ? 'MANUAL' : 케이스조작(service.kind));
  const [케이스들, set케이스들] = useState<CaseRow[] | null>(null);
  const [고른케이스, set고른케이스] = useState<string[]>(앞?.caseIds ?? []);
  const [반복, set반복] = useState(앞 !== null && 앞.drive !== 'MANUAL' ? 앞.repeat : 3);
  const [분, set분] = useState(앞 !== null && 앞.durationSec > 0 ? Math.round(앞.durationSec / 60) : 10);
  const [env, setEnv] = useState(앞env !== null && service.envs.some((it) => it.env === 앞env) ? 앞env : 마지막서버(service.prefix, service.envs));
  const [앱, set앱] = useState(앞?.package ?? '');
  const [기기들, set기기들] = useState<고를기기[] | null>(null);
  const [고른기기, set고른기기] = useState<string[]>(앞?.devices.map(기기키) ?? []);
  const [목표들, set목표들] = useState<기기목표[]>(앞?.targets ?? 기본목표);
  const [항목, set항목] = useState<측정지표[]>(앞?.metrics ?? 측정항목.map(([m]) => m));
  const [간격, set간격] = useState<1 | 2 | 5>(앞?.intervalSec ?? 1);
  const [녹화, set녹화] = useState(앞?.record ?? true);
  const [하는중, set하는중] = useState(false);
  const [알림, set알림] = useState<string | null>(null);
  const [묻나, set묻나] = useState(false);
  const [걸린칸, set걸린칸] = useState<시작칸 | null>(null);
  const { 상자, 첫오류로 } = use첫오류();
  const [케이스오류, set케이스오류] = useState<string | null>(null);

  // 연 때와 달라졌으면 떠나기 전에 묻는다. 측정을 건 뒤에는 묻지 않는다
  const 지금값 = JSON.stringify([조작, 고른케이스, 반복, 분, env, 앱, 고른기기, 목표들, 항목, 간격, 녹화]);
  const [처음값] = useState(지금값);
  // 답을 기다리는 동안 다른 화면으로 떠났으면 끌고 오지 않는다 — 그 화면이 쓰던 것을 묻지 않고 버리게 된다
  const 서있나 = useRef(true);
  useEffect(() => {
    let 살음 = true;
    서있나.current = true;
    perfApi.devices(service.id).then(
      (r) => 살음 && set기기들(r.devices),
      (err: unknown) => {
        if (!살음) return;
        set기기들([]);
        set알림(message(err, 언어));
      },
    );
    폰케이스들(service.prefix).then(
      (모음) => 살음 && set케이스들(모음),
      (err: unknown) => {
        if (!살음) return;
        set케이스들([]);
        set케이스오류(message(err, 언어));
      },
    );
    return () => {
      살음 = false;
      서있나.current = false;
    };
  }, []);

  const 케이스로 = 조작 !== 'MANUAL';
  const 자동포함된 = 자동포함(케이스들 ?? [], 고른케이스);
  // 앞 측정 · 추천에서 온 기기가 지금 쓰는 중이거나 이 조작으로 못 쓰면 고른 것에서 뺀다 — 상한 5대에도 안 센다
  const 쓸기기 = 고른기기.flatMap((키) => {
    const d = 기기들?.find((x) => 기기키(x) === 키);
    return d === undefined || d.status !== 'IDLE' || (케이스로 && d.where === 'LOCAL') ? [] : [d];
  });
  const 골라보냄 = 쓸기기.map((d) => ({ serial: d.serial, where: d.where }));

  function 막는까닭(): { 칸: 시작칸; 글: string } | null {
    if (env === '') return { 칸: 'env', 글: t('대상 서버를 선택해 주세요') };
    if (!앱이름.test(앱)) return { 칸: 'package', 글: t('앱 패키지 이름을 com.demo.market 꼴로 적어 주세요') };
    // 목록을 못 읽었으면 무엇이 자동 포함되는지 몰라 확인 창이 덜 적는다
    if (케이스로 && 케이스들 === null) return { 칸: 'cases', 글: t('케이스 목록을 읽는 중입니다') };
    if (케이스로 && 케이스오류 !== null) return { 칸: 'cases', 글: 케이스오류 };
    if (케이스로 && 고른케이스.length === 0) return { 칸: 'cases', 글: 게임 ? t('측정하며 실행할 게임 케이스를 선택해 주세요') : t('측정하며 실행할 Android 앱 케이스를 선택해 주세요') };
    if (골라보냄.length === 0) return { 칸: 'devices', 글: t('측정할 디바이스를 선택해 주세요') };
    if (항목.length === 0) return { 칸: 'metrics', 글: t('측정 항목을 하나 이상 선택해 주세요') };
    return null;
  }

  // 고친 칸의 사유는 바로 걷는다. 다음 칸의 사유는 다시 누를 때 뜬다
  const 막은것 = 막는까닭();
  const 틀린 = (칸: 시작칸) => (걸린칸 === 칸 && 막은것?.칸 === 칸 ? 막은것.글 : null);

  function 시작누름() {
    set알림(null);
    set걸린칸(막은것?.칸 ?? null);
    if (막은것 === null) set묻나(true);
    else 첫오류로();
  }

  async function 시작() {
    set묻나(false);
    set하는중(true);
    try {
      const { runId } = await perfApi.measureDevices({
        serviceId: service.id,
        env,
        drive: 조작,
        ...(케이스로 ? { caseIds: 고른케이스 } : { durationSec: 분 * 60 }),
        build: { package: 앱 },
        devices: 골라보냄,
        repeat: 케이스로 ? 반복 : 1,
        targets: 목표들,
        metrics: 항목,
        intervalSec: 간격,
        record: 녹화,
      });
      고른서버를적는다(service.prefix, env);
      if (!서있나.current) return;
      떠나기로했다();
      실행열기(runId);
    } catch (err) {
      set알림(message(err, 언어));
      set하는중(false);
    }
  }

  const 조작칸 = (값: 조작, 이름: string, 설명: string) => (
    <label className={조작 === 값 ? 'pd-kind on' : 'pd-kind'}>
      <input type="radio" name="pd-drive" checked={조작 === 값} disabled={!쓰나} onChange={() => set조작(값)} />
      <span>
        <b>{t(이름)}</b>
        <br />
        <span className="perf-faint">{t(설명)}</span>
      </span>
    </label>
  );

  return (
    <>
      <떠나기상자 막나={지금값 !== 처음값} 버리기도 />
      <Head 위치={t('성능 테스트')} 제목={t(기기성능이름(service.kind))} 부제={t('새 측정')} />
      <div className="screen perf-run" ref={상자}>
        <section className="perf-panel" aria-labelledby="pd-m">
          <h2 id="pd-m">{t('조작 방식')}</h2>
          <div className="pd-kinds" role="radiogroup" aria-label={t('조작 방식')}>
            {게임
              ? 조작칸('GAME', '게임 케이스', '선택한 게임 케이스를 디바이스마다 반복 실행하며 측정합니다. Device VISION 에 연결된 디바이스만 쓸 수 있습니다')
              : 조작칸('APPIUM', 'Appium 케이스', '선택한 Android 앱 케이스를 디바이스마다 반복 실행하며 측정합니다. Device VISION 에 연결된 디바이스만 쓸 수 있습니다')}
            {조작칸('MANUAL', '직접 플레이', 'Device VISION 에 연결된 디바이스를 손에 들고 플레이하는 동안 기록합니다')}
          </div>
        </section>

        <section className="perf-panel" aria-labelledby="pd-s">
          <h2 id="pd-s">{케이스로 ? t('케이스와 빌드') : t('측정 시간과 빌드')}</h2>
          <div className="perf-fields">
            <div className="perf-cell">
              <label className="perf-field">
                {t('대상 서버')}
                <select value={env} disabled={!쓰나} {...오류속성('pd-env-err', 틀린('env'))} onChange={(e) => setEnv(e.target.value)}>
                  <option value="">{t('선택')}</option>
                  {service.envs.map((it) => (
                    <option key={it.env} value={it.env}>
                      {it.env}
                    </option>
                  ))}
                </select>
              </label>
              <칸오류 id="pd-env-err" 사유={틀린('env')} />
            </div>
            <div className="perf-cell">
              <label className="perf-field">
                {t('앱 패키지 이름')}
                <input className="mono" value={앱} placeholder="com.demo.market" disabled={!쓰나} {...오류속성('pd-pkg-err', 틀린('package'))} onChange={(e) => set앱(e.target.value.trim())} />
              </label>
              <칸오류 id="pd-pkg-err" 사유={틀린('package')} />
            </div>
            {케이스로 ? (
              <label className="perf-field">
                {t('반복')}
                <input type="number" min={1} max={20} value={반복} disabled={!쓰나} onChange={(e) => set반복(Math.min(20, Math.max(1, Math.round(Number(e.target.value)) || 1)))} />
              </label>
            ) : (
              <label className="perf-field">
                {t('측정 시간(분)')}
                <input type="number" min={1} max={60} value={분} disabled={!쓰나} onChange={(e) => set분(Math.min(60, Math.max(1, Math.round(Number(e.target.value)) || 1)))} />
              </label>
            )}
          </div>
          {케이스로 ? (
            케이스들 === null ? (
              <span className="perf-faint">{t('케이스 목록을 읽는 중입니다')}</span>
            ) : 케이스오류 !== null ? (
              <span className="perf-err">{케이스오류}</span>
            ) : 케이스들.length === 0 ? (
              <span className="perf-faint">{게임 ? t('아직 게임 케이스가 없습니다') : t('아직 Android 앱 케이스가 없습니다')}</span>
            ) : (
              <fieldset className="pd-cases" {...오류묶음('pd-cases-err', 틀린('cases'))}>
                <legend className="perf-faint">{t('실행할 케이스 ({수}/{상한})', { 수: 고른케이스.length, 상한: 케이스상한 })}</legend>
                {!자동포함된.있나 ? null : (
                  <div className="mnote proc-note">
                    <b>{t('테스트 프로시저는 케이스 전체를 실행합니다')}</b>
                    {자동포함된.수 === 0 ? null : <> · {t('선택 {선택}건 · 자동 포함 {자동}건', { 선택: 고른케이스.length, 자동: 자동포함된.수 })}</>}
                  </div>
                )}
                {케이스들.map((c) => {
                  const 골랐나 = 고른케이스.includes(c.tcId);
                  const 자동 = 자동포함된.인가(c);
                  return (
                    <label key={c.tcId} className={자동 ? 'pd-auto' : undefined}>
                      <input
                        type="checkbox"
                        checked={골랐나 || 자동}
                        disabled={!쓰나 || 자동 || (!골랐나 && 고른케이스.length >= 케이스상한)}
                        onChange={() => set고른케이스(골랐나 ? 고른케이스.filter((x) => x !== c.tcId) : [...고른케이스, c.tcId])}
                      />
                      <span className="mono">{c.tcId}</span> {c.name}
                      {자동 ? <span className="case-tag">{t('자동 포함')}</span> : null}
                    </label>
                  );
                })}
              </fieldset>
            )
          ) : (
            <span className="perf-faint">{t('직접 플레이는 반복 없이 한 번 잽니다. 정한 시간이 지나면 종료됩니다')}</span>
          )}
          <칸오류 id="pd-cases-err" 사유={틀린('cases')} />
        </section>

        <PerfDevicePick serviceId={service.id} 기기들={기기들} 고른={쓸기기.map(기기키)} 고침={set고른기기} 팜만={케이스로} 쓰나={쓰나} 사유={틀린('devices')} />
        <PerfDeviceTargets 목표들={목표들} 고침={set목표들} 쓰나={쓰나} />

        <PerfDeviceMetrics 항목={항목} on항목={set항목} 간격={간격} on간격={set간격} 녹화={녹화} on녹화={set녹화} 쓰나={쓰나} 사유={틀린('metrics')} />

        {알림 === null ? null : (
          <p className="perf-err" role="alert">
            {알림}
          </p>
        )}
        <div className="perf-row">
          {취소 === null ? null : (
            <button type="button" className="btn ghost" onClick={() => 버리기전(취소)}>
              {t('취소')}
            </button>
          )}
          {쓰나 ? (
            <button type="button" className="btn pd-go" disabled={하는중} onClick={시작누름}>
              {하는중 ? t('측정을 만드는 중') : t('측정 시작')}
            </button>
          ) : null}
        </div>
      </div>
      {!묻나 ? null : (
        <기기시작확인
          값={{ drive: 조작, caseIds: 고른케이스, durationSec: 분 * 60, repeat: 반복, package: 앱, 자동수: 케이스로 ? 자동포함된.수 : 0, 디바이스들: 쓸기기.map((d) => d.model), env }}
          onClose={() => set묻나(false)}
          on시작={() => void 시작()}
        />
      )}
    </>
  );
}
