// 성능 테스트 › 기기 성능 › 결과 — 녹화 화면과 그래프 먼저. AI 분석 → 녹화 화면과 측정값 → 메모리 누수 의심 → 기기별 요약 (도메인/성능 §8.14 · 시안 Dev-Result-B)
// PDF 는 없다 — 기기 실행은 report.pdf 가 400 이다 (§7 「실행의 config」)

import { useEffect, useState } from 'react';

import type { ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 기기성능이름 } from './kind.js';
import { perfApi, type 실행상세 } from './perfApi.js';
import { PerfDeviceReplay } from './PerfDeviceReplay.js';
import { 값글자, 결과칸들, 기기설정of, 메모리글자, 벗어난지표, 실행열기, 조작글, 케이스조작 } from './perfDeviceView.js';
import { 갱신간격, 분석틈, 분초, 사유이름, 시각글, 판정꼴, 판정이름, 판정종류 } from './perfRunView.js';
import { Loading, message, useAsync } from './ui.js';

export function PerfDeviceResult({ run, service, 다시읽기, 쓰나, 새측정 }: { run: 실행상세; service: ServiceRow; 다시읽기: () => Promise<boolean>; 쓰나: boolean; 새측정: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const 설정 = 기기설정of(run);
  const 결과 = useAsync(() => perfApi.deviceResult(run.id), [run.id]);
  const [하는중, set하는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 종류 = 판정종류(run);
  // 끝까지 잰 실행에만 AI 분석이 선다. 끝난 직후 일이 서기 전 틈도 기다린다
  const 틈 = run.ai === null && run.aiJob === null && run.status === 'DONE' && run.finishedAt !== null && Date.now() - new Date(run.finishedAt).getTime() < 분석틈;
  const 만드는중 = run.ai === null && (틈 || (run.aiJob !== null && (run.aiJob.status === 'QUEUED' || run.aiJob.status === 'RUNNING')));

  // AI 분석이 끝나면 장면 표시(markers)도 같이 온다 — 실행과 결과를 같이 다시 읽는다
  useEffect(() => {
    if (!만드는중) return;
    const 타이머 = setInterval(() => {
      void 다시읽기().then((됨) => (됨 ? 결과.reload() : false));
    }, 갱신간격.ms);
    return () => clearInterval(타이머);
  }, [만드는중]);

  async function 하기(일: () => Promise<void>) {
    set하는중(true);
    set오류(null);
    try {
      await 일();
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set하는중(false);
    }
  }

  // 같은 조건으로 새 측정 하나를 만들고 그 번호 화면으로 간다
  const 다시실행 = () =>
    하기(async () => {
      const { runId } = await perfApi.measureDevices({
        serviceId: service.id,
        env: run.env,
        // 게임 케이스 칸이 생기기 전(PERF-F1-11)에 게임을 Appium 으로 잰 결과 · 종류가 바뀐 애플리케이션도 지금 종류의 조작으로 다시 잰다
        drive: 설정.drive === 'MANUAL' ? 'MANUAL' : 케이스조작(service.kind),
        ...(설정.drive === 'MANUAL' ? { durationSec: 설정.durationSec } : { caseIds: 설정.caseIds }),
        build: { package: 설정.package },
        devices: 설정.devices.map(({ serial, where }) => ({ serial, where })),
        repeat: 설정.repeat,
        targets: 설정.targets,
        metrics: 설정.metrics,
        intervalSec: 설정.intervalSec,
        record: 설정.record,
      });
      실행열기(runId);
    });

  const AI다시 = () =>
    하기(async () => {
      await perfApi.analysis(run.id);
      await 다시읽기();
    });

  const 걸린 = run.startedAt !== null && run.finishedAt !== null ? [분초((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)] : [];
  const 받음 = 결과.data;
  // 처음 고르는 기기 — 먼저 봐야 할 실패가 있으면 그것
  const 처음기기 = 받음 === null ? '' : ((받음.devices.find((d) => d.verdict === 'FAIL') ?? 받음.devices[0])?.serial ?? '');

  return (
    <>
      <Head
        위치={t('성능 테스트')}
        제목={`${t(기기성능이름(service.kind))} ${run.code}`}
        부제={
          <>
            {종류 === 'LIVE' ? null : <span className={`verdict ${판정꼴[종류]}`}>{판정이름(종류, t)}</span>}{' '}
            {[조작글(설정, t), 설정.drive === 'MANUAL' ? null : t('반복 {수}회', { 수: 설정.repeat }), t('기기 {수}대', { 수: 설정.devices.length }), run.env, 시각글(run.startedAt, 언어), ...걸린, run.stopReason === null ? null : 사유이름(run.stopReason, t)]
              .filter((x): x is string => x !== null)
              .join(' · ')}
          </>
        }
        행동={
          쓰나 ? (
            <div className="perf-row">
              <button type="button" className="btn ghost" onClick={새측정}>
                {t('새 측정')}
              </button>
              <button type="button" className="btn" disabled={하는중} onClick={() => void 다시실행()}>
                {t('다시 실행')}
              </button>
            </div>
          ) : null
        }
      />
      <div className="screen perf-run">
        {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}

        <section className="perf-panel" aria-labelledby="pd-ai">
          <div className="perf-row">
            <span className="perf-ai">{t('AI 분석')}</span>
            <h2 id="pd-ai">{run.ai !== null ? run.ai.title : 만드는중 ? t('AI 분석을 만드는 중입니다') : run.status === 'DONE' ? t('AI 분석을 만들지 못했습니다') : t('끝까지 잰 측정에만 AI 분석이 붙습니다')}</h2>
          </div>
          {run.ai !== null ? (
            <ul className="perf-ai-list">
              {run.ai.items.map((글) => (
                <li key={글}>{글}</li>
              ))}
            </ul>
          ) : 만드는중 || !쓰나 || run.status !== 'DONE' ? null : (
            <div>
              <button type="button" className="btn ghost" disabled={하는중} onClick={() => void AI다시()}>
                {t('다시 만들기')}
              </button>
            </div>
          )}
        </section>

        {받음 === null ? (
          결과.error !== null ? <p className="perf-err" role="alert">{결과.error}</p> : <Loading />
        ) : 받음.devices.length === 0 ? null : (
          <>
            {/* 위 숫자 칸 줄 — 종류마다 보는 숫자가 다르다 (시안 11판 · WEB-F7-16) */}
            <section className="perf-panel num-tiles" aria-label={t('측정 요약')}>
              {결과칸들(service.kind === 'GAME', 받음, 설정.targets, t).map((칸) => (
                <div key={칸.이름} className={칸.나쁨 ? 'bad' : undefined}>
                  <span>{t(칸.이름)}</span>
                  <b>{칸.값}</b>
                  <em>{칸.보조.join(' · ')}</em>
                </div>
              ))}
            </section>
            <PerfDeviceReplay runId={run.id} 결과={받음} 항목={설정.metrics} 목표들={설정.targets} 처음기기={처음기기} />

            {받음.leak.length === 0 ? null : (
              <section className="perf-panel" aria-labelledby="pd-leak">
                <h2 id="pd-leak">{t('메모리 누수 의심')}</h2>
                <ul className="perf-ai-list">
                  {받음.leak.map((x) => {
                    const 기기 = 받음.devices.find((d) => d.serial === x.serial)?.model ?? x.serial;
                    const 회차 = 받음.loops.filter((l) => l.serial === x.serial).map((l) => [t('{수}회차', { 수: l.loop }), 메모리글자(l.maxMemMb)].join(' '));
                    return (
                      <li key={x.serial}>
                        <b>{기기}</b> · {t('회차마다 약 {수}MB 증가', { 수: x.perLoopMb })}
                        {x.loopsToLimit === null ? null : <span className="perf-err"> · {t('{수}회차 더 돌면 메모리 목표를 넘습니다', { 수: x.loopsToLimit })}</span>}
                        <div className="perf-faint">{회차.join(' → ')}</div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="perf-panel" aria-labelledby="pd-t">
              <h2 id="pd-t">{t('기기별 요약')}</h2>
              <div className="perf-table-box">
                <table className="perf-table" aria-label={t('기기별 요약')}>
                  <thead>
                    <tr>
                      <th>{t('기기')}</th>
                      <th className="r">{t('평균 FPS')}</th>
                      <th className="r">{t('1% Low FPS')}</th>
                      <th className="r">{t('최대 기기 온도')}</th>
                      <th className="r">{t('메모리 최대')}</th>
                      <th className="r">{t('앱 실행 시간')}</th>
                      <th>{t('판정')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {받음.devices.map((d) => {
                      const 벗어남 = 벗어난지표(설정.targets, d.summary, d.launchMs);
                      const 칸 = (m: 'AVG_FPS' | 'LOW1_FPS' | 'MAX_TEMP' | 'MAX_MEM' | 'LAUNCH_MS', 값: number | null) => (
                        <td className={벗어남.has(m) ? 'r mono perf-err' : 'r mono'}>{값글자(m, 값, t)}</td>
                      );
                      return (
                        <tr key={d.serial}>
                          <td>{d.model}</td>
                          {칸('AVG_FPS', d.summary.avgFps)}
                          {칸('LOW1_FPS', d.summary.low1Fps)}
                          {칸('MAX_TEMP', d.summary.maxTempC)}
                          {칸('MAX_MEM', d.summary.maxMemMb)}
                          {칸('LAUNCH_MS', d.launchMs)}
                          <td>{d.verdict === null ? '-' : <span className={`verdict ${판정꼴[d.verdict]}`}>{판정이름(d.verdict, t)}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
