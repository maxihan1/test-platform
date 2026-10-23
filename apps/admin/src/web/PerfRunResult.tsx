// 성능 테스트 › 결과 — AI 요약 먼저. 머리 · 최대 동시 사용자 · AI 분석 · 성능 목표 달성 여부 (도메인/성능 §8.14 · 시안 「결과」)
// 시간대별 추이 · 트랜잭션별 결과는 PerfRunTrend.tsx 가 그린다

import { useEffect, useState } from 'react';

import { use말, use언어 } from './i18n.js';
import { perfApi, type 실행상세 } from './perfApi.js';
import { RunHead } from './PerfRunHead.js';
import { PerfRunTrend } from './PerfRunTrend.js';
import { 갱신간격, 명글자, 목표글자, 목표대상, 분석틈, 분초, 사유이름, 측정글자, 틈간격, 판정꼴, 판정이름, 판정종류 } from './perfRunView.js';
import { message, 받을이름, 파일로저장 } from './ui.js';

const 지표글자: Record<'P95' | 'ERROR_RATE' | 'TPS', string> = { P95: '95% 응답시간', ERROR_RATE: '에러율', TPS: 'TPS' };

export function PerfRunResult({ run, 다시읽기, 쓰나 }: { run: 실행상세; 다시읽기: () => Promise<boolean>; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [하는중, set하는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 종류 = 판정종류(run);
  const 일번호 = run.aiJob?.id ?? null;
  // 끝쓰기로 끝난 직후 AI 일이 서기 전 틈 — 일이 아직 없어도 곧 선다. 오류로 끝났거나 숫자가 없으면 일이 서지 않는다
  const 틈 =
    run.ai === null && run.aiJob === null && run.status !== 'ERROR' && run.summary.peakVus !== null && run.finishedAt !== null && Date.now() - new Date(run.finishedAt).getTime() < 분석틈;
  const 만드는중 = run.ai === null && (틈 || (run.aiJob !== null && (run.aiJob.status === 'QUEUED' || run.aiJob.status === 'RUNNING')));

  // AI 분석이 끝날 때까지 기다린다. 일이 있으면 가벼운 일 상태만 묻다가 끝난 것을 알 때 실행을 한 번 다시 읽고,
  // 일이 아직 없는 틈에는 실행을 드물게 다시 읽는다. 끝나면 이 효과가 스스로 멈춘다
  useEffect(() => {
    if (!만드는중) return;
    const 타이머 = setInterval(
      () => {
        if (일번호 === null) {
          void 다시읽기();
          return;
        }
        perfApi.job<unknown>(일번호).then(
          (일) => {
            set오류(null);
            if (일.status === 'DONE' || 일.status === 'FAILED') void 다시읽기();
          },
          (err: unknown) => set오류(message(err, 언어)),
        );
      },
      일번호 === null ? 틈간격.ms : 갱신간격.ms,
    );
    return () => clearInterval(타이머);
  }, [만드는중, 일번호]);

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

  const PDF받기 = () =>
    하기(async () => {
      const { 파일, 머리 } = await perfApi.pdf(run.id);
      파일로저장(파일, 받을이름(머리, `${run.code}.pdf`));
    });

  // 같은 설정으로 새 실행 하나를 시작하고 그 번호 화면으로 간다
  const 다시실행 = () =>
    하기(async () => {
      if (run.scenarioId === null) return;
      const { runId } = await perfApi.run({
        scenarioId: run.scenarioId,
        env: run.env,
        testType: run.config.testType,
        basis: run.config.load.basis,
        stages: run.config.load.stages,
        targets: run.config.targets,
        agentIds: run.config.agentIds,
        monitorIds: run.config.monitorIds,
        pageCheck: run.config.pageCheck,
      });
      window.location.hash = `#/perf/runs/${String(runId)}`;
    });

  const AI다시 = () =>
    하기(async () => {
      await perfApi.analysis(run.id);
      await 다시읽기();
    });

  const 자동중단 = run.stopReason === 'TARGET_EXCEEDED' || run.stopReason === 'ERROR_LIMIT';
  const 이전최대 = run.previous?.peakVus ?? null;

  return (
    <>
      <RunHead
        run={run}
        앞={종류 === 'LIVE' ? null : <span className={`verdict ${판정꼴[종류]}`}>{판정이름(종류, t)}</span>}
        덧={[
          ...(run.startedAt !== null && run.finishedAt !== null ? [분초((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)] : []),
          ...(run.stopReason === null ? [] : [사유이름(run.stopReason, t)]),
        ]}
        행동={
          <div className="perf-row">
            <button type="button" className="btn ghost" disabled={하는중} onClick={() => void PDF받기()}>
              {t('PDF로 내려받기')}
            </button>
            {쓰나 && run.scenarioId !== null ? (
              <button type="button" className="btn" disabled={하는중} onClick={() => void 다시실행()}>
                {t('다시 실행')}
              </button>
            ) : null}
          </div>
        }
      />
      <div className="screen perf-run">
        {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}

        <section className="perf-panel" aria-labelledby="perf-ai">
          {run.config.testType !== 'STRESS' ? null : (
            <div className="perf-hero">
              <div>
                <div className="perf-faint">{t('최대 동시 사용자')}</div>
                <div className="perf-hero-num">
                  {run.summary.peakVus === null ? '-' : run.summary.peakVus.toLocaleString('ko-KR')}
                  <small>{t('명')}</small>
                </div>
              </div>
              {이전최대 === null ? null : <div className="perf-faint">{t('이전 실행 {값}', { 값: 명글자(이전최대, t) })}</div>}
            </div>
          )}
          <div className="perf-row">
            <span className="perf-ai">{t('AI 분석')}</span>
            <h2 id="perf-ai">{run.ai !== null ? run.ai.title : 만드는중 ? t('AI 분석을 만드는 중입니다') : t('AI 분석을 만들지 못했습니다')}</h2>
          </div>
          {run.ai !== null ? (
            <ul className="perf-ai-list">
              {run.ai.items.map((글) => (
                <li key={글}>{글}</li>
              ))}
            </ul>
          ) : 만드는중 || !쓰나 ? null : (
            <div>
              <button type="button" className="btn ghost" disabled={하는중} onClick={() => void AI다시()}>
                {t('다시 만들기')}
              </button>
            </div>
          )}
        </section>

        <section className="perf-panel" aria-labelledby="perf-c">
          <h2 id="perf-c">{t('성능 목표 달성 여부')}</h2>
          {run.targets === null || run.targets.length === 0 ? (
            <span className="perf-faint">{t('정한 성능 목표가 없어 판정 없이 숫자만 남았습니다')}</span>
          ) : (
            <div className="perf-table-box">
              <table className="perf-table">
                <thead>
                  <tr>
                    <th>{t('지표')}</th>
                    <th>{t('대상')}</th>
                    <th className="r">{t('목표')}</th>
                    <th className="r">{t('측정값')}</th>
                    <th>{t('판정')}</th>
                    <th>{t('근거')}</th>
                  </tr>
                </thead>
                <tbody>
                  {run.targets.map((목표, i) => (
                    <tr key={i}>
                      <td>{t(지표글자[목표.metric])}</td>
                      <td>{목표대상(목표) ?? t('전체')}</td>
                      <td className="r mono">{목표글자(목표, t)}</td>
                      <td className={목표.verdict === 'FAIL' ? 'r mono perf-err' : 'r mono'}>{측정글자(목표, 목표.measured, t)}</td>
                      <td>
                        <span className={목표.verdict === 'PASS' ? 'verdict v-pass' : 'verdict v-fail'}>{목표.verdict === 'PASS' ? t('통과') : t('실패')}</span>
                      </td>
                      <td>
                        {목표.source === 'PRD' ? <span className="perf-tag">{t('기획서')}</span> : 목표.source === 'AI' ? <span className="perf-ai">{t('AI 추천')}</span> : <span className="perf-tag">{t('직접 입력')}</span>}
                        {목표.reqId === undefined ? null : <span className="perf-faint mono"> {목표.reqId}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {run.targets === null || run.targets.length === 0 ? null : (
            <span className="perf-faint">{자동중단 ? t('측정값은 자동 중단 직전 10초 기준, TPS는 최대값') : t('측정값은 전체 구간 기준, TPS는 최대값')}</span>
          )}
        </section>

        <PerfRunTrend run={run} 자동중단={자동중단} />
      </div>
    </>
  );
}
