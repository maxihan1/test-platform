// 시나리오 자식이 stdout 에 흘린 결과 줄 · 뒷정리 줄 · 기기 줄을 읽는다 — scenario.ts 가 300줄을 넘어 떼어 냈다 (SPEC 도메인/러너 §5.2)

import type { DeviceInfo, ScenarioCleanup, ScenarioPartResult } from '@platform/kit';
import { SCENARIO_CLEANUP_MARKER, SCENARIO_DEVICE_MARKER, SCENARIO_PART_MARKER } from '@platform/kit/scenario';

// 줄 맨 앞의 표시자만 읽는다. kit 이 흘리는 진행 줄(@@PROGRESS@@)은 historyId 가 숫자가 아니라 여기서 버린다.
// 제한 시간에 죽이면 마지막 줄이 잘려 있을 수 있다 — 그 줄만 버리고 앞 부품은 살린다.
// **순번이 제 차례인 줄만 받는다.** 케이스 코드도 같은 stdout 에 쓴다 — 뒷 순번 줄을 찍으면 돌지 않은 부품이 PASS 로 보인다.
// 다음 순번은 새로 받고, 지금 순번은 갈아 끼운다(진짜 줄은 그 부품이 끝난 뒤에 온다). 실패 뒤는 버린다
export function parseParts(stdout: string): ScenarioPartResult[] {
  const parts: ScenarioPartResult[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith(SCENARIO_PART_MARKER)) continue;
    let part: ScenarioPartResult;
    try {
      part = JSON.parse(line.slice(SCENARIO_PART_MARKER.length)) as ScenarioPartResult;
    } catch (err) {
      console.warn(`[runner] 시나리오 결과 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const 마지막 = parts.at(-1);
    if (part.seq === parts.length && 마지막 !== undefined) parts[parts.length - 1] = part;
    else if (part.seq === parts.length + 1 && 마지막?.status !== 'FAIL') parts.push(part);
  }
  return parts;
}

// 고정 spec 이 시나리오 끝에 한 번 흘린다. 맨 앞 표시자 · 잘린 줄 규칙은 parseParts 와 같다
export function parseCleanup(stdout: string): ScenarioCleanup[] | undefined {
  let cleanup: ScenarioCleanup[] | undefined;
  for (const line of stdout.split('\n')) {
    if (!line.startsWith(SCENARIO_CLEANUP_MARKER)) continue;
    try {
      cleanup = JSON.parse(line.slice(SCENARIO_CLEANUP_MARKER.length)) as ScenarioCleanup[];
    } catch (err) {
      console.warn(`[runner] 시나리오 뒷정리 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return cleanup;
}

// 폰이 열리면 고정 spec 이 한 번 흘린다. 잘린 줄은 버린다 — 판정과 상관없는 머리 정보다
export function parseDevice(stdout: string): DeviceInfo | undefined {
  const 줄 = stdout.split('\n').find((l) => l.startsWith(SCENARIO_DEVICE_MARKER));
  if (줄 === undefined) return undefined;
  try {
    return JSON.parse(줄.slice(SCENARIO_DEVICE_MARKER.length)) as DeviceInfo;
  } catch (err) {
    console.warn(`[runner] 시나리오 기기 줄을 버린다: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}
