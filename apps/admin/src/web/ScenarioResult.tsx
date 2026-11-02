// 실행 결과 › E2E 모양 (#/runs/:runId 가 시나리오 실행 번호일 때). 도메인/시나리오 §8.11 · 실행 §8.7

import { useEffect } from 'react';
import type { DeviceInfo } from '@platform/kit';

import { use증적, 증적만들기버튼들, 증적알림과목록 } from './EvidenceSection.js';
import { 팜증적 } from './FarmEvidence.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 주소조건 } from './leaveGuard.js';
import type { 판정하기 } from './runJudge.js';
import { 케이스서비스 } from './role.js';
import { 실행자이름 } from './runState.js';
import { scenarioApi } from './scenarioApi.js';
import { FailGuide, RerunButton, useRerun, 멈춘단계, type 들어온곳 } from './ScenarioResultNext.js';
import { ScenarioResultPart } from './ScenarioResultPart.js';
import { 미확정있나, 접은판정 } from './scenarioResultView.js';
import { Failed, Loading, PLATFORM_LABEL, seconds, useAsync, Verdict, when } from './ui.js';
import { use보는실행알림 } from './viewedRun.js';

export function ScenarioResult({
  runId,
  판정하기,
  칸안 = false,
  on새실행,
}: {
  runId: number;
  판정하기: 판정하기;
  /** 실행 기록 › E2E 의 오른쪽 결과 칸 안에 그린다 (도메인/실행 §8.7 「A안」) */
  칸안?: boolean;
  /** 칸 안에서 다시 실행하면 화면을 떠나지 않고 새 실행을 칸에 연다 */
  on새실행?: (runId: number) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  // 머리가 진행을 적으니 알림 줄은 이 실행의 도는 줄을 뺀다 — 실행 기록 결과 칸도 같다 (공통/5-화면공통 §8 「알림」)
  use보는실행알림(runId);
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
  const 할수 = 판정하기(첫케이스 === null ? null : 케이스서비스(첫케이스));
  const 증적칸 = use증적(data === null ? null : { runId, status: data.status, evidence: data.evidence }, 할수, reload);
  // 결과 칸(실행 기록 › E2E)은 목록 옆이라 돌아갈 곳이 없다 — 주소를 안 본다
  const 어디서 = 칸안 ? null : 들어온곳읽기();
  const 다시실행 = useRerun(data?.scenarioId ?? 0, data?.env ?? '', 어디서, on새실행);

  if (res.error !== null) return <Failed error={res.error} />;
  if (data === null) return <Loading />;

  const 판정 = 접은판정(data.parts, data.status);
  const 쓰나 = 할수('실행');
  const 멈춘 = 판정 === null || 판정 === 'PASS' ? null : 멈춘단계(data.parts);
  // 실패면 안내 줄이 다시 실행을 같이 든다. 머리에 또 두면 같은 단추가 둘이다
  const 머리다시 = 쓰나 && 판정 !== null && 멈춘 === null ? <RerunButton 다시실행={다시실행} env={data.env} /> : null;
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
  // 앱 · 게임 단계가 있는 시나리오만 폰 정보가 온다 — 폰 연결이 하나라 시나리오에 한 벌이다 (도메인/시나리오 §3.7 결정 16)
  const 폰 = 폰글(data.device);
  if (폰 !== null) 칸들.push([t('폰'), 폰]);
  const 팜 = data.farm ?? [];

  return (
    <>
      {칸안 ? (
        // 케이스 결과 칸(RunResult)과 같은 머리 — 고른 줄과 같은 제목을 크게 단다
        <div className="box-head">
          <h2 className="pane-title">
            {data.title} <span className="pane-run">RUN {runId}</span>
          </h2>
          <div className="head-meta">{부제}</div>
          {칩}
          {머리다시}
          <증적만들기버튼들 칸={증적칸} />
          <증적알림과목록 칸={증적칸} 한줄로 />
        </div>
      ) : (
        <>
          <div className="scn-back">
            {어디서 === 'scenarios' ? (
              <a href="#/scenarios">{t('← E2E 시나리오')}</a>
            ) : 어디서 === 'scenario' ? (
              <a href={`#/scenarios/${data.scenarioId}`}>{t('← SC-{번호} 시나리오', { 번호: data.scenarioId })}</a>
            ) : (
              <a href="#/runs/e2e">{t('← 실행 기록 › E2E')}</a>
            )}
          </div>
          <Head
            제목={data.title}
            부제={부제}
            행동={
              <>
                {칩}
                {머리다시}
                <증적만들기버튼들 칸={증적칸} />
              </>
            }
          />
        </>
      )}

      {/* 결과 칸에서는 머리를 고정하고 이 아래만 스크롤한다 (도메인/실행 §8.7 「A안」) */}
      <div className={칸안 ? 'screen pane-results scn-pane' : 'screen'}>
        {!running ? null : (
          <p className="scn-running" role="status">
            {t('실행 중입니다. 끝나면 결과가 채워집니다')}
          </p>
        )}
        {멈춘 === null ? null : (
          <FailGuide scenarioId={data.scenarioId} part={멈춘} 쓰나={쓰나} 다시실행={다시실행} env={data.env} />
        )}
        {다시실행.오류 === null ? null : (
          <p className="err" role="alert">
            {다시실행.오류}
          </p>
        )}
        {칸안 ? null : <증적알림과목록 칸={증적칸} />}
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
        {팜.length === 0 ? null : (
          <section aria-label={t('Device VISION 기록')}>
            <h2 className="scn-heading">{t('Device VISION 기록')}</h2>
            <팜증적 주소={(name) => scenarioApi.runFarm(runId, name)} files={팜} />
          </section>
        )}
      </div>
    </>
  );
}

/** 폰 모델 · Android 판 한 줄. 둘 다 못 읽었으면 null — 빈 칸을 세우지 않는다 */
export function 폰글(device: DeviceInfo | null | undefined): string | null {
  if (device == null) return null;
  const 있음 = (x: string | null): x is string => x !== null && x.trim() !== '';
  const 조각 = [...(있음(device.model) ? [device.model] : []), ...(있음(device.osVersion) ? [`Android ${device.osVersion}`] : [])];
  return 조각.length === 0 ? null : 조각.join(' · ');
}

function 들어온곳읽기(): 들어온곳 {
  const 값 = 주소조건().get('from');
  return 값 === 'scenarios' || 값 === 'scenario' ? 값 : null;
}
