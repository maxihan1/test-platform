// 실행 결과 › E2E 모양 (#/runs/:runId 가 시나리오 실행 번호일 때). 도메인/시나리오 §8.11 · 실행 §8.7

import { useEffect } from 'react';

import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import type { 판정하기 } from './runJudge.js';
import { 케이스서비스 } from './role.js';
import { 실행자이름 } from './runState.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioResultPart } from './ScenarioResultPart.js';
import { 미확정있나, 접은판정 } from './scenarioResultView.js';
import { Failed, Loading, PLATFORM_LABEL, seconds, useAsync, Verdict, when } from './ui.js';

export function ScenarioResult({ runId, 판정하기, 상자안 = false }: { runId: number; 판정하기: 판정하기; 상자안?: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const res = useAsync(() => scenarioApi.result(runId), [runId]);
  const data = res.data;
  const running = data?.status === 'RUNNING';
  const reload = res.reload;
  // 증적도 뒤에서 만들어진다. PENDING 이 남아 있으면 계속 물어야 「만드는 중」이 완성으로 바뀐다 (RunResult.tsx 와 같다)
  const 만드는문서있나 = data !== null && data.evidence.some((it) => it.status === 'PENDING');

  // 실행은 뒤에서 이어진다. 끝날 때까지만 다시 묻고 끝나면 멈춘다
  useEffect(() => {
    if (!running && !만드는문서있나) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [running, 만드는문서있나, reload]);

  // 시나리오 응답에는 서비스 칸이 없다. 케이스 단계의 tcId 접두사가 곧 서비스다 — 케이스 결과(runJudge.ts)와 같은 규칙.
  // 케이스 단계가 없으면 null 로 넘겨 운영 계정 말고는 버튼이 안 선다.
  // 이른 반환 위에서 부른다 — 훅 차례가 데이터를 받기 전과 같아야 한다
  const 첫케이스 = data?.parts.find((p) => p.tcId !== null)?.tcId ?? null;
  const 증적칸 = use증적(
    data === null ? null : { runId, status: data.status, evidence: data.evidence },
    판정하기(첫케이스 === null ? null : 케이스서비스(첫케이스)),
    reload,
  );

  if (res.error !== null) return <Failed error={res.error} />;
  if (data === null) return <Loading />;

  const 판정 = 접은판정(data.parts, data.status);
  const 미확정 = 미확정있나(data.parts);
  // 도는 중에도 미확정 단계가 이미 있으면 알린다 — 판정 칩만 끝난 뒤에 붙는다 (§8.11)
  const 꼬리표 = 미확정 ? <span className="case-tag">{t('미확정')}</span> : null;
  const 칩 =
    판정 === null ? (
      꼬리표
    ) : (
      <>
        <Verdict status={판정} />
        {꼬리표}
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
          <증적만들기버튼들 칸={증적칸} />
          <증적알림과목록 칸={증적칸} 한줄로 />
        </div>
      ) : (
        <>
          <div className="scn-back">
            <a href="#/runs/e2e">{t('← 실행 기록 › E2E')}</a>
          </div>
          <Head
            제목={data.title}
            부제={부제}
            행동={
              <>
                {칩}
                <증적만들기버튼들 칸={증적칸} />
              </>
            }
          />
        </>
      )}

      <div className={상자안 ? 'screen modal-results' : 'screen'}>
        {!running ? null : (
          <p className="scn-running" role="status">
            {t('실행 중입니다. 끝나면 결과가 채워집니다')}
          </p>
        )}
        {상자안 ? null : <증적알림과목록 칸={증적칸} />}
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
            <ScenarioResultPart key={part.seq} part={part} parts={data.parts} runId={runId} 실행중={running} />
          ))}
        </ol>
      </div>
    </>
  );
}
