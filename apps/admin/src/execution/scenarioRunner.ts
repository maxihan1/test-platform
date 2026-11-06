// 서버 러너에서 도는 E2E 시나리오 끊기 — runner.ts 가 300줄을 넘어 떼어 냈다 (도메인/러너 §5.2 「시나리오 진행 · 중단」)

import { runnerUrl, 러너머리 } from './runnerAddr.js';

// 도는 시나리오 자식을 그룹째 끊어 달라고 한다. 러너가 모르는 열쇠(아직 안 보냈거나 이미 끝남)면 false 다 — 경합이지 고장이 아니라 던지지 않는다
export async function abortScenarioRunner(열쇠: { scenarioRunId: number } | { scenarioTrialId: string }): Promise<boolean> {
  try {
    const res = await fetch(`${runnerUrl()}/abort`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...러너머리() },
      body: JSON.stringify(열쇠),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    return ((await res.json()) as { aborted?: boolean }).aborted === true;
  } catch {
    return false;
  }
}
