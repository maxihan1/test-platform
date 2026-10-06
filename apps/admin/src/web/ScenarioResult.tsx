// 실행 결과 › E2E 모양 (#/runs/:runId 가 시나리오 실행 번호일 때). 도메인/시나리오 §8.11 · 실행 §8.7

import { useEffect } from 'react';

import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 실행자이름 } from './runState.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioResultPart } from './ScenarioResultPart.js';
import { 미확정있나, 접은판정 } from './scenarioResultView.js';
import { Failed, Loading, PLATFORM_LABEL, seconds, useAsync, Verdict, when } from './ui.js';

export function ScenarioResult({ runId, 상자안 = false }: { runId: number; 상자안?: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const res = useAsync(() => scenarioApi.result(runId), [runId]);
  const data = res.data;
  const running = data?.status === 'RUNNING';
  const reload = res.reload;

  // 실행은 뒤에서 이어진다. 끝날 때까지만 다시 묻고 끝나면 멈춘다
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [running, reload]);

  if (res.error !== null) return <Failed error={res.error} />;
  if (data === null) return <Loading />;

  const 판정 = 접은판정(data.parts, data.status);
  const 미확정 = 미확정있나(data.parts);
  const 칩 =
    판정 === null ? null : 판정 === 'PASS' && 미확정 ? (
      <span className="case-tag">{t('통과 · 미확정 포함')}</span>
    ) : (
      <>
        <Verdict status={판정} />
        {미확정 ? <span className="case-tag">{t('미확정 포함')}</span> : null}
      </>
    );
  const 부제 = (
    <>
      <span>{t('E2E · 시나리오 v{버전} · {디바이스}', { 버전: data.version, 디바이스: t(PLATFORM_LABEL[data.platform]) })}</span>
      {' · '}
      <a className="scn-sc" href={`#/scenarios/${data.scenarioId}`}>{`SC-${data.scenarioId}`}</a>
    </>
  );
  const 걸린시간 = data.finishedAt === null ? null : Date.parse(data.finishedAt) - Date.parse(data.startedAt);
  const 칸들: [string, string][] = [
    [t('실행 시각'), when(data.startedAt, 언어)],
    [t('소요'), seconds(걸린시간, 언어)],
    [t('대상 서버'), data.env],
    [t('대상 주소'), data.baseUrl],
    [t('실행자'), 실행자이름(data, 언어)],
  ];

  return (
    <>
      {상자안 ? (
        <div className="box-head">
          <div className="head-meta">
            <b>{data.title}</b> · {부제}
          </div>
          {칩}
        </div>
      ) : (
        <>
          <div className="scn-back">
            <a href="#/runs/e2e">{t('← 실행 기록 › E2E')}</a>
          </div>
          <Head 제목={data.title} 부제={부제} 행동={칩} />
        </>
      )}

      <div className={상자안 ? 'screen modal-results' : 'screen'}>
        {!running ? null : (
          <p className="scn-running" role="status">
            {t('실행 중입니다. 끝나면 결과가 채워집니다')}
          </p>
        )}
        <dl className="scn-info">
          {칸들.map(([라벨, 값]) => (
            <div key={라벨}>
              <dt>{라벨}</dt>
              <dd>{값}</dd>
            </div>
          ))}
        </dl>
        <h2 className="scn-heading">{t('단계별 결과')}</h2>
        <ol className="scn-steps">
          {data.parts.map((part) => (
            <ScenarioResultPart key={part.seq} part={part} parts={data.parts} runId={runId} />
          ))}
        </ol>
      </div>
    </>
  );
}
