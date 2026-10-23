// E2E 결과의 다음 할 일 — 실패한 단계 안내 줄 · 그 단계 수정 · 같은 서버로 다시 실행 (도메인/시나리오 §8.11 「실행 결과」)

import { useState } from 'react';

import { 실패유형이름 } from './DashboardTypes.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi, type ScenarioRunPart } from './scenarioApi.js';
import { message } from './ui.js';

/** 결과에서 돌아갈 곳. 들어온 곳을 주소 `from` 에 실어 온다 — 없으면 실행 기록이다 */
export type 들어온곳 = 'scenarios' | 'scenario' | null;

export const 결과주소 = (runId: number, 어디서: 들어온곳) => (어디서 === null ? `#/runs/${runId}` : `#/runs/${runId}?from=${어디서}`);

/**
 * 실패한 첫 단계. 실패가 없으면 그 단계 탓으로 멈춘 판정 없음(NA) 첫 단계 — 러너 거절 · 제한 시간 초과가 그렇다.
 * 앞 단계 때문에 안 돈 단계(NOT_RUN)와 서버 재시작으로 닫힌 단계(ABORTED)는 고칠 거리가 아니라 고르지 않는다
 */
export function 멈춘단계<P extends Pick<ScenarioRunPart, 'status'> & { error?: { message: string } | null }>(parts: P[]): P | null {
  // 시험 결과 단계는 오류가 없으면 칸이 빠지고(undefined), 정식 실행 단계는 null 이다 — 마법사 시험 칸도 같이 부른다
  const 그단계탓 = (p: P) => p.status === 'NA' && p.error != null && p.error.message !== 'NOT_RUN' && p.error.message !== 'ABORTED';
  return parts.find((p) => p.status === 'FAIL') ?? parts.find(그단계탓) ?? null;
}

/** `on새실행` 을 주면 주소를 옮기지 않고 넘긴다 — 실행 기록 결과 칸은 목록을 떠나지 않고 새 실행을 연다 */
export function useRerun(scenarioId: number, env: string, 어디서: 들어온곳, on새실행?: (runId: number) => void) {
  const 언어 = use언어();
  const [도는중, set도는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  async function 다시() {
    set도는중(true);
    set오류(null);
    try {
      const { runId } = await scenarioApi.run(scenarioId, env);
      if (on새실행 === undefined) window.location.hash = 결과주소(runId, 어디서);
      else on새실행(runId);
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
