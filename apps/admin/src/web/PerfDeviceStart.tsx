// 성능 테스트 › 기기 성능 › 새 측정 — 조작 방식 · 케이스와 반복 · 빌드 · 측정 기기 · 성능 목표 · 측정 항목 · 「측정 시작」 (도메인/성능 §8.14 · 시안 Dev-Start)
// 앞 측정이 있으면 그 조건을 채워 연다. 게임 애플리케이션은 Appium 케이스 자리에 게임 케이스가 선다 — 게임 화면은 Appium 이 버튼을 못 찾는다

import { useEffect, useState } from 'react';

import { api, type CaseRow, type ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 기기성능이름 } from './kind.js';
import { 고른서버를적는다, 마지막서버 } from './layout.js';
import { perfApi } from './perfApi.js';
import type { 고를기기, 기기목표, 기기설정, 조작, 측정지표 } from './perfDeviceApi.js';
import { PerfDevicePick, 기기키 } from './PerfDevicePick.js';
import { PerfDeviceTargets } from './PerfDeviceTargets.js';
import { 기본목표, 실행열기, 케이스조작, 측정항목 } from './perfDeviceView.js';
import { message } from './ui.js';

/** 서버와 같은 꼴 — 점으로 이은 앱 이름(`com.demo.market`) */
const 앱이름 = /^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/;
const 케이스상한 = 20;

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
  const [케이스오류, set케이스오류] = useState<string | null>(null);

  useEffect(() => {
    let 살음 = true;
    perfApi.devices(service.id).then(
      (r) => 살음 && set기기들(r.devices),
      (err: unknown) => {
        if (!살음) return;
        set기기들([]);
        set알림(message(err, 언어));
      },
    );
    // 폰 케이스만 고른다(게임 케이스도 android 다) — 서버도 아니면 거절한다. 목록은 쪽마다 50건이라 끝까지 받는다
    void (async () => {
      try {
        const 모음: CaseRow[] = [];
        for (let page = 1; ; page += 1) {
          const 쪽 = await api.cases({ service: service.prefix, platform: 'android', page });
          모음.push(...쪽.items);
          if (쪽.items.length === 0 || 모음.length >= 쪽.total) break;
        }
        if (살음) set케이스들(모음);
      } catch (err) {
        if (!살음) return;
        set케이스들([]);
        set케이스오류(message(err, 언어));
      }
    })();
    return () => {
      살음 = false;
    };
  }, []);

  const 케이스로 = 조작 !== 'MANUAL';
  // 앞 측정 · 추천에서 온 기기가 지금 쓰는 중이거나 이 조작으로 못 쓰면 고른 것에서 뺀다 — 상한 5대에도 안 센다
  const 쓸기기 = 고른기기.flatMap((키) => {
    const d = 기기들?.find((x) => 기기키(x) === 키);
    return d === undefined || d.status !== 'IDLE' || (케이스로 && d.where === 'LOCAL') ? [] : [d];
  });
  const 골라보냄 = 쓸기기.map((d) => ({ serial: d.serial, where: d.where }));

  function 막는까닭(): string | null {
    if (env === '') return t('대상 서버를 골라 주세요');
    if (!앱이름.test(앱)) return t('앱 패키지 이름을 com.demo.market 꼴로 적어 주세요');
    if (케이스로 && 고른케이스.length === 0) return 게임 ? t('측정하며 돌릴 게임 케이스를 골라 주세요') : t('측정하며 돌릴 Android 앱 케이스를 골라 주세요');
    if (골라보냄.length === 0) return t('측정할 기기를 골라 주세요');
    if (항목.length === 0) return t('측정 항목을 하나 이상 골라 주세요');
    return null;
  }

  async function 시작() {
    const 까닭 = 막는까닭();
    if (까닭 !== null) return set알림(까닭);
    set하는중(true);
    set알림(null);
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
      <Head 위치={t('성능 테스트')} 제목={t(기기성능이름(service.kind))} 부제={t('새 측정')} />
      <div className="screen perf-run">
        <section className="perf-panel" aria-labelledby="pd-m">
          <h2 id="pd-m">{t('조작 방식')}</h2>
          <div className="pd-kinds" role="radiogroup" aria-label={t('조작 방식')}>
            {게임
              ? 조작칸('GAME', '게임 케이스', '고른 게임 케이스를 기기마다 반복해 돌리며 측정합니다. Device VISION 폰만 됩니다')
              : 조작칸('APPIUM', 'Appium 케이스', '고른 Android 앱 케이스를 기기마다 반복해 돌리며 측정합니다. Device VISION 폰만 됩니다')}
            {조작칸('MANUAL', '직접 플레이', 'Device VISION PC 에 꽂힌 폰을 손에 들고 플레이하는 동안 기록합니다')}
          </div>
        </section>

        <section className="perf-panel" aria-labelledby="pd-s">
          <h2 id="pd-s">{케이스로 ? t('케이스와 빌드') : t('측정 시간과 빌드')}</h2>
          <div className="perf-fields">
            <label className="perf-field">
              {t('대상 서버')}
              <select value={env} disabled={!쓰나} onChange={(e) => setEnv(e.target.value)}>
                <option value="">{t('고르기')}</option>
                {service.envs.map((it) => (
                  <option key={it.env} value={it.env}>
                    {it.env}
                  </option>
                ))}
              </select>
            </label>
            <label className="perf-field">
              {t('앱 패키지 이름')}
              <input className="mono" value={앱} placeholder="com.demo.market" disabled={!쓰나} onChange={(e) => set앱(e.target.value.trim())} />
            </label>
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
              <fieldset className="pd-cases">
                <legend className="perf-faint">{t('돌릴 케이스 ({수}/{상한})', { 수: 고른케이스.length, 상한: 케이스상한 })}</legend>
                {케이스들.map((c) => {
                  const 골랐나 = 고른케이스.includes(c.tcId);
                  return (
                    <label key={c.tcId}>
                      <input
                        type="checkbox"
                        checked={골랐나}
                        disabled={!쓰나 || (!골랐나 && 고른케이스.length >= 케이스상한)}
                        onChange={() => set고른케이스(골랐나 ? 고른케이스.filter((x) => x !== c.tcId) : [...고른케이스, c.tcId])}
                      />
                      <span className="mono">{c.tcId}</span> {c.name}
                    </label>
                  );
                })}
              </fieldset>
            )
          ) : (
            <span className="perf-faint">{t('직접 플레이는 반복 없이 한 번 잽니다. 정한 시간이 지나면 끝납니다')}</span>
          )}
        </section>

        <PerfDevicePick serviceId={service.id} 기기들={기기들} 고른={쓸기기.map(기기키)} 고침={set고른기기} 팜만={케이스로} 쓰나={쓰나} />
        <PerfDeviceTargets 목표들={목표들} 고침={set목표들} 쓰나={쓰나} />

        <section className="perf-panel" aria-labelledby="pd-k">
          <h2 id="pd-k">{t('측정 항목')}</h2>
          <div className="pd-checks">
            {측정항목.map(([m, 이름]) => (
              <label key={m}>
                <input type="checkbox" checked={항목.includes(m)} disabled={!쓰나} onChange={() => set항목(항목.includes(m) ? 항목.filter((x) => x !== m) : [...항목, m])} />
                {t(이름)}
              </label>
            ))}
          </div>
          <div className="perf-row">
            <label className="perf-field">
              {t('수집 간격')}
              <select value={간격} disabled={!쓰나} onChange={(e) => set간격(Number(e.target.value) as 1 | 2 | 5)}>
                {[1, 2, 5].map((초) => (
                  <option key={초} value={초}>
                    {t('{수}초', { 수: 초 })}
                  </option>
                ))}
              </select>
            </label>
            <label className="perf-row">
              <input type="checkbox" checked={녹화} disabled={!쓰나} onChange={() => set녹화(!녹화)} />
              {t('화면 녹화')}
              <span className="perf-faint">{t('FPS가 떨어진 장면을 녹화 화면으로 확인')}</span>
            </label>
          </div>
          <span className="perf-faint">{t('앱 실행 시간은 측정을 시작할 때 기기마다 한 번 잽니다')}</span>
        </section>

        {알림 === null ? null : (
          <p className="perf-err" role="alert">
            {알림}
          </p>
        )}
        <div className="perf-row">
          {취소 === null ? null : (
            <button type="button" className="btn ghost" onClick={취소}>
              {t('취소')}
            </button>
          )}
          {쓰나 ? (
            <button type="button" className="btn pd-go" disabled={하는중} onClick={() => void 시작()}>
              {하는중 ? t('측정을 만드는 중') : t('측정 시작')}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
