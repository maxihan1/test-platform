// E2E 결과의 다음 할 일 — 실패한 단계 안내 줄 · 그 단계 수정 · 같은 서버로 다시 실행 (도메인/시나리오 §8.11 「실행 결과」)

import { useState } from 'react';

import { 실패유형이름 } from './DashboardTypes.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi, type ScenarioRunPart } from './scenarioApi.js';
import { message } from './ui.js';

/** 결과에서 돌아갈 곳. 들어온 곳을 주소 `from` 에 실어 온다 — 없으면 실행 기록이다 */
export type 들어온곳 = 'scenarios' | 'scenario' | null;

export const 결과주소 = (runId: number, 어디서: 들어온곳) => (어디서 === null ? `#/runs/${runId}` : `#/runs/${runId}?from=${어디서}`);

/** 실패한 첫 단계. 판정 없음(NA)만 있는 실행은 판정 없음인 첫 단계에서 멈췄다 — 러너 거절은 전부 NA 라 1번이 나온다 */
export function 멈춘단계(parts: ScenarioRunPart[]): ScenarioRunPart | null {
  return parts.find((p) => p.status === 'FAIL') ?? parts.find((p) => p.status === 'NA') ?? null;
}

export function useRerun(scenarioId: number, env: string, 어디서: 들어온곳) {
  const 언어 = use언어();
  const [도는중, set도는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  async function 다시() {
    set도는중(true);
    set오류(null);
    try {
      const { runId } = await scenarioApi.run(scenarioId, env);
      window.location.hash = 결과주소(runId, 어디서);
    } catch (err) {
      set오류(message(err, 언어));
    } finally {
      set도는중(false);
    }
  }
  return { 도는중, 오류, 다시 };
}

export function RerunButton({ 다시실행, env, 주 = false }: { 다시실행: ReturnType<typeof useRerun>; env: string; 주?: boolean }) {
  const t = use말();
  return (
    <button type="button" className={주 ? 'btn' : 'btn ghost'} disabled={다시실행.도는중} onClick={() => void 다시실행.다시()}>
      {다시실행.도는중 ? t('실행 요청 중') : t('{서버}에서 다시 실행', { 서버: env })}
    </button>
  );
}

export function FailGuide({
  scenarioId,
  part,
  쓰나,
  다시실행,
  env,
}: {
  scenarioId: number;
  part: ScenarioRunPart;
  쓰나: boolean;
  다시실행: ReturnType<typeof useRerun>;
  env: string;
}) {
  const t = use말();
  const 머리 =
    part.tcName === null
      ? t('{번호}번 단계에서 실패했습니다', { 번호: part.seq })
      : t('{번호}번 단계 「{이름}」에서 실패했습니다', { 번호: part.seq, 이름: part.tcName });
  const 이유 = part.failure ?? null;
  return (
    <div className="scn-fail-guide">
      <p>
        <b>{머리}</b>
        {이유 === null ? null : ` · ${t(실패유형이름[이유.type])} · ${이유.reason}`}
      </p>
      {!쓰나 ? null : (
        <div className="scn-fail-guide-act">
          <a className="btn" href={`#/scenarios/${scenarioId}?step=${part.seq}`}>
            {t('{번호}번 단계 수정', { 번호: part.seq })}
          </a>
          <RerunButton 다시실행={다시실행} env={env} />
        </div>
      )}
    </div>
  );
}
